const { WINDOWS_VERSIONS, INSTALLATION_COST } = require('../config/constants');
const { checkVPSSupport } = require('../utils/vpsChecker');
const { detectVPSSpecs } = require('../utils/vpsSpecs');
const { installRDP } = require('../utils/rdpInstaller');
const { deductBalance, isAdmin } = require('../utils/userManager');
const { formatVPSSpecs } = require('../utils/messageFormatter');

async function handleInstallRDP(bot, chatId, messageId, userSessions) {
  const session = userSessions.get(chatId) || {};
  if (!isAdmin(chatId) && !await deductBalance(chatId, INSTALLATION_COST)) {
    await bot.editMessageText(
      '❌ Saldo tidak mencukupi. Silakan deposit terlebih dahulu.',
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [[
            { text: '💰 Deposit', callback_data: 'deposit' },
            { text: '« Kembali', callback_data: 'back_to_menu' }
          ]]
        }
      }
    );
    return;
  }
  const msg = await bot.editMessageText(
    '📝 *Detail VPS*\n' +
    '⚡️ *Spesifikasi Minimal:*\n' +
    '• CPU: 2 Core\n' +
    '• RAM: 4 GB\n' +
    '• Storage: 40 GB\n' +
    '🌐 KIRIM DAN MASUKKAN IP VPS:\n' +
    '_IP akan dihapus otomatis setelah dikirim_\n' +
    '⚠️ *PENTING:* VPS Wajib Fresh Install Ubuntu 22.04',
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '« Batal', callback_data: 'cancel_installation' }
        ]]
      }
    }
  );
  session.step = 'waiting_ip';
  session.startTime = Date.now();
  session.messageId = msg.message_id;
  userSessions.set(chatId, session);
}

async function handleVPSCredentials(bot, msg, userSessions) {
  const chatId = msg.chat.id;
  const session = userSessions.get(chatId);
  if (!session) {
    await bot.sendMessage(chatId, '❌ Sesi telah kadaluarsa. Silakan mulai dari awal.');
    return;
  }
  try {
    await bot.deleteMessage(chatId, msg.message_id);
  } catch (error) {
    console.log('Failed to delete message:', error.message);
  }
  switch (session.step) {
    case 'waiting_ip':
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(msg.text)) {
        await bot.editMessageText(
          '❌ Format IP tidak valid.\n' +
          '📝 *Detail VPS*\n' +
          '🌐 KIRIM DAN MASUKKAN IP VPS:\n' +
          '_IP akan dihapus otomatis setelah dikirim_\n' +
          '⚠️ *PENTING:* VPS Wajib Fresh Install Ubuntu 22.04',
          {
            chat_id: chatId,
            message_id: session.messageId,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '« Batal', callback_data: 'cancel_installation' }
              ]]
            }
          }
        );
        return;
      }
      session.ip = msg.text;
      session.step = 'waiting_password';
      userSessions.set(chatId, session);
      await bot.editMessageText(
        '🔑 *Kirim Dan Masukkan Password Root VPS:*\n' +
        '_Password akan dihapus otomatis_',
        {
          chat_id: chatId,
          message_id: session.messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '« Batal', callback_data: 'cancel_installation' }
            ]]
          }
        }
      );
      break;
    case 'waiting_password':
      session.password = msg.text;
      session.step = 'checking_vps';
      userSessions.set(chatId, session);
      await bot.editMessageText(
        '🔍 Memeriksa VPS...',
        {
          chat_id: chatId,
          message_id: session.messageId,
          parse_mode: 'Markdown'
        }
      );
      try {
        const [{ supported }, rawSpecs] = await Promise.all([
          checkVPSSupport(session.ip, 'root', session.password),
          detectVPSSpecs(session.ip, 'root', session.password)
        ]);
        if (isNaN(rawSpecs.cpu) || isNaN(rawSpecs.ram) || isNaN(rawSpecs.storage)) {
          throw new Error('Invalid VPS specs detected');
        }
        session.supportsKvm = supported;
        session.rawSpecs = rawSpecs;
        session.vpsConfig = {
          cpu: rawSpecs.cpu,
          ram: Math.max(0, rawSpecs.ram - 2),
          storage: Math.max(0, rawSpecs.storage - 10)
        };
        if (isNaN(session.vpsConfig.ram) || isNaN(session.vpsConfig.storage)) {
          throw new Error('Invalid VPS configuration');
        }
        const specsMessage = formatVPSSpecs(rawSpecs, session.vpsConfig);
        if (!supported) {
          await bot.editMessageText(
            '⚠️ VPS Anda tidak mendukung KVM. Performa RDP mungkin akan menurun.\n' +
            specsMessage +
            'Ingin melanjutkan?',
            {
              chat_id: chatId,
              message_id: session.messageId,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '✅ Lanjutkan', callback_data: 'continue_no_kvm' },
                    { text: '❌ Batal', callback_data: 'cancel_installation' }
                  ]
                ]
              }
            }
          );
        } else {
          await bot.editMessageText(
            `✅ VPS mendukung KVM\n${specsMessage}Silakan klik lanjutkan untuk memilih versi Windows:`,
            {
              chat_id: chatId,
              message_id: session.messageId,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✅ Lanjutkan', callback_data: 'show_windows_selection' }],
                  [{ text: '❌ Batal', callback_data: 'cancel_installation' }]
                ]
              }
            }
          );
        }
      } catch (error) {
        console.error('Error checking VPS:', error.message);
        await bot.editMessageText(
          '❌ Gagal terhubung ke VPS. Pastikan IP dan password benar.',
          {
            chat_id: chatId,
            message_id: session.messageId,
            reply_markup: {
              inline_keyboard: [[
                { text: '🔄 Coba Lagi', callback_data: 'install_rdp' }
              ]]
            }
          }
        );
        userSessions.delete(chatId);
      }
      break;
    case 'waiting_rdp_password':
      if (msg.text.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(msg.text)) {
        await bot.editMessageText(
          '❌ Password tidak memenuhi syarat. Harus minimal 8 karakter dan mengandung huruf dan angka.\n' +
          `📝 *Konfigurasi yang dipilih:*\n` +
          `🪟 Windows: ${session.windowsVersion.name}\n` +
          `💰 Harga: Rp ${session.windowsVersion.price.toLocaleString()}\n` +
          `⚙️ *Spesifikasi Setelah Instalasi:*\n` +
          `• CPU: ${session.vpsConfig.cpu} Core\n` +
          `• RAM: ${session.vpsConfig.ram}GB (dikurangi 2GB)\n` +
          `• Storage: ${session.vpsConfig.storage}GB (dikurangi 10GB)\n` +
          `🔑 Masukkan password untuk RDP Windows:\n` +
          `_(Min. 8 karakter, kombinasi huruf dan angka)_\n` +
          `(Contoh Password = FAuzi5050)`,
          {
            chat_id: chatId,
            message_id: session.messageId,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '« Kembali', callback_data: 'back_to_windows' }
              ]]
            }
          }
        );
        return;
      }
      session.rdpPassword = msg.text;
      await bot.editMessageText(
        '🔄 Memulai instalasi Windows...\n' +
        '⏳ Proses ini membutuhkan waktu 10-15 menit.\n' +
        '📝 Mohon tunggu hingga proses selesai.',
        {
          chat_id: chatId,
          message_id: session.messageId,
          parse_mode: 'Markdown'
        }
      );
      try {
        const result = await installRDP(session.ip, 'root', session.password, {
          windowsId: session.windowsVersion.id,
          ...session.vpsConfig,
          password: session.rdpPassword,
          isArm: false,
          supportsKvm: session.supportsKvm
        });
        const duration = Math.floor((Date.now() - session.startTime) / 60000);
        await bot.editMessageText(
          `✅ *Instalasi Windows berhasil!*\n` +
          `📝 *Detail RDP:*\n` +
          `🖥️ Windows: ${session.windowsVersion.name}\n` +
          `🌐 IP: ${session.ip}\n` +
          `👤 Username: admin\n` +
          `🔑 Password: ${session.rdpPassword}\n` +
          `⚙️ *Spesifikasi:*\n` +
          `CPU: ${session.vpsConfig.cpu} Core\n` +
          `RAM: ${session.vpsConfig.ram}GB\n` +
          `Storage: ${session.vpsConfig.storage}GB\n` +
          `✅ *Tekan Monitor Installation Untuk Monitor dan Tunggu Sampai Selesai Estimasi Maximal 1 Jam Lalu Baca Faq Di Menu Utama!*`,
          {
            chat_id: chatId,
            message_id: session.messageId,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🖥️ Monitor Installation', url: `http://${session.ip}:8006` }],
                [{ text: '« Kembali ke Menu', callback_data: 'back_to_menu' }]
              ]
            }
          }
        );
    
      } catch (error) {
        console.error('Installation error:', error);
        await bot.editMessageText(
          '❌ Gagal menginstall Windows. Error: ' + (error.message || 'Unknown error') + '\nSilakan coba lagi.',
          {
            chat_id: chatId,
            message_id: session.messageId,
            reply_markup: {
              inline_keyboard: [[
                { text: '🔄 Coba Lagi', callback_data: 'install_rdp' }
              ]]
            }
          }
        );
      }
      userSessions.delete(chatId);
      break;
  }
}

async function showWindowsSelection(bot, chatId, messageId, page = 0) {
  const itemsPerPage = 6;
  const start = page * itemsPerPage;
  const end = start + itemsPerPage;
  const desktopVersions = WINDOWS_VERSIONS.filter(v => v.category === 'desktop');
  const serverVersions = WINDOWS_VERSIONS.filter(v => v.category === 'server');
  let messageText = '🪟 *Pilih Versi Windows:*\n';
  messageText += '📱 *Windows Desktop:*\n';
  desktopVersions.forEach(v => {
    messageText += `${v.id}. ${v.name} (Rp ${v.price.toLocaleString()})\n`;
  });
  messageText += '\n';
  messageText += '🖥️ *Windows Server:*\n';
  serverVersions.forEach(v => {
    messageText += `${v.id}. ${v.name} (Rp ${v.price.toLocaleString()})\n`;
  });
  const versions = WINDOWS_VERSIONS.slice(start, end);
  const keyboard = [];
  for (let i = 0; i < versions.length; i += 2) {
    const row = [];
    row.push({
      text: `${versions[i].id}. ${versions[i].name}`,
      callback_data: `windows_${versions[i].id}`
    });
    if (versions[i + 1]) {
      row.push({
        text: `${versions[i + 1].id}. ${versions[i + 1].name}`,
        callback_data: `windows_${versions[i + 1].id}`
      });
    }
    keyboard.push(row);
  }
  const navigationRow = [];
  if (page > 0) {
    navigationRow.push({ text: '⬅️ Sebelumnya', callback_data: `page_${page - 1}` });
  }
  if (end < WINDOWS_VERSIONS.length) {
    navigationRow.push({ text: 'Selanjutnya ➡️', callback_data: `page_${page + 1}` });
  }
  if (navigationRow.length > 0) {
    keyboard.push(navigationRow);
  }
  keyboard.push([{ text: '« Kembali', callback_data: 'back_to_menu' }]);
  await bot.editMessageText(messageText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

async function handleWindowsSelection(bot, query, userSessions) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const session = userSessions.get(chatId);
  if (!session) {
    await bot.answerCallbackQuery(query.id, {
      text: '❌ Sesi telah kadaluarsa. Silakan mulai dari awal.',
      show_alert: true
    });
    return;
  }
  const windowsId = parseInt(query.data.split('_')[1]);
  const selectedWindows = WINDOWS_VERSIONS.find(v => v.id === windowsId);
  if (!selectedWindows) {
    await bot.answerCallbackQuery(query.id, {
      text: '❌ Versi Windows tidak valid. Silakan pilih kembali.',
      show_alert: true
    });
    return;
  }
  session.windowsVersion = selectedWindows;
  session.step = 'waiting_rdp_password';
  userSessions.set(chatId, session);
  await bot.editMessageText(
    `📝 *Konfigurasi yang dipilih:*\n` +
    `🪟 Windows: ${selectedWindows.name}\n` +
    `💰 Harga: Rp ${selectedWindows.price.toLocaleString()}\n` +
    `⚙️ *Spesifikasi Setelah Instalasi:*\n` +
    `• CPU: ${session.vpsConfig.cpu} Core\n` +
    `• RAM: ${session.vpsConfig.ram}GB (dikurangi 2GB)\n` +
    `• Storage: ${session.vpsConfig.storage}GB (dikurangi 10GB)\n` +
    `🔑 Masukkan password untuk RDP Windows:\n` +
    `_(Min. 8 karakter, kombinasi huruf dan angka)_`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '« Kembali', callback_data: 'back_to_windows' }
        ]]
      }
    }
  );
}

async function handlePageNavigation(bot, query, userSessions) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const page = parseInt(query.data.split('_')[1]);
  await showWindowsSelection(bot, chatId, messageId, page);
}

async function handleCancelInstallation(bot, query, userSessions) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  userSessions.delete(chatId);
  await bot.editMessageText(
    '❌ Instalasi dibatalkan.',
    {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[
          { text: '« Kembali ke Menu', callback_data: 'back_to_menu' }
        ]]
      }
    }
  );
}

module.exports = {
  handleInstallRDP,
  handleVPSCredentials,
  handleWindowsSelection,
  showWindowsSelection,
  handlePageNavigation,
  handleCancelInstallation
};