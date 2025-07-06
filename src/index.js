const TelegramBot = require('node-telegram-bot-api');
const { createMainMenu } = require('./utils/keyboard');
const { handleInstallRDP, handleVPSCredentials, handleWindowsSelection, showWindowsSelection, handlePageNavigation, handleCancelInstallation } = require('./handlers/rdpHandler');
const { handleDeposit, handleDepositAmount } = require('./handlers/depositHandler');
const { handleFAQ } = require('./handlers/faqHandler');
const { handleProviders } = require('./handlers/providerHandler');
const broadcastMessage = require('./handlers/broadcastMessage');
const { handleAddBalance, processAddBalance } = require('./handlers/adminHandler');
const { getBalance, isAdmin } = require('./utils/userManager');
const DatabaseBackup = require('./utils/dbBackup');
require('dotenv').config();

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  },
  request: {
    timeout: 30000,
    proxy: process.env.HTTPS_PROXY || null
  }
});

const userSessions = new Map();
const dbBackup = new DatabaseBackup(bot);

// Schedule weekly database backups
dbBackup.scheduleBackup();

bot.onText(/\/start/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const balance = await getBalance(chatId);
    const balanceText = isAdmin(chatId) ? 'Unlimited' : `Rp ${balance.toLocaleString()}`;
    
    let menuText = `🚀 *Selamat datang di Bot Instalasi RDP!*\n\n` +
                   `👤 ID: \`${chatId}\`\n` +
                   `💰 Saldo: ${balanceText}\n\n` +
                   `⚡️ *Spesifikasi Minimal VPS:*\n` +
                   `• CPU: 2 Core\n` +
                   `• RAM: 4 GB\n` +
                   `• Storage: 40 GB\n\n` +
                   `🔥 *Fitur Unggulan:*\n` +
				   `• Rp. 1000 Per Install\n` +
                   `• Instalasi Otomatis\n` +
                   `• Multiple Windows Version\n` +
                   `• 24/7 Support\n` +
                   `• Deposit Manual / Bertanya Chat wa.me/6285173329868\n\n` +
                   `Silakan pilih menu di bawah ini:`;
    
    await bot.sendMessage(chatId, menuText, {
      parse_mode: 'Markdown',
      ...createMainMenu(isAdmin(chatId))
    });
  } catch (error) {
    console.error('Error in start command:', error);
    await bot.sendMessage(msg.chat.id, '❌ Terjadi kesalahan. Silakan coba lagi.');
  }
});

bot.on('message', async (msg) => {
  try {
    if (msg.text?.startsWith('/')) return;
    
    const session = userSessions.get(msg.chat.id);
    if (session) {
      if (session.addingBalance && isAdmin(msg.chat.id)) {
        await processAddBalance(bot, msg);
        userSessions.delete(msg.chat.id);
      } else if (session.step === 'waiting_amount') {
        await handleDepositAmount(bot, msg, session);
        userSessions.delete(msg.chat.id);
      } else {
        await handleVPSCredentials(bot, msg, userSessions);
      }
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await bot.sendMessage(msg.chat.id, '❌ Terjadi kesalahan. Silakan coba lagi.');
  }
});

bot.on('callback_query', async (query) => {
  try {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    if (data.startsWith('page_')) {
      await handlePageNavigation(bot, query, userSessions);
      await bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('windows_')) {
      await handleWindowsSelection(bot, query, userSessions);
      await bot.answerCallbackQuery(query.id);
      return;
    }

    switch (data) {
      case 'install_rdp':
        await handleInstallRDP(bot, chatId, messageId, userSessions);
        break;
      case 'deposit':
        const session = await handleDeposit(bot, chatId, messageId);
        userSessions.set(chatId, session);
        break;
      case 'faq':
        await handleFAQ(bot, chatId, messageId);
        break;
      case 'providers':
        await handleProviders(bot, chatId, messageId);
        break;
      case 'add_balance':
        if (isAdmin(chatId)) {
          userSessions.set(chatId, { addingBalance: true });
          await handleAddBalance(bot, chatId, messageId);
        }
        break;
      case 'boardcast':
        if (isAdmin(chatId)) {
          userSessions.set(chatId, { broadcasting: true });
          await bot.sendMessage(chatId, "🚀 Masukkan pesan yang ingin di-broadcast:");

          // Tangkap pesan broadcast dari admin
          bot.once('message', async (msg) => {
            if (msg.chat.id === chatId) { // Pastikan pesan berasal dari admin yang sama
              const message = msg.text;

              // Konfirmasi ke admin
              await bot.sendMessage(chatId, `🚀 Memulai broadcast...\n\nPesan: ${message}`);

              // Jalankan broadcast
              await broadcastMessage(bot, message, chatId);

              // Hapus session broadcast
              userSessions.delete(chatId);
            }
          });
        }
        break;
      case 'manage_db':
        await dbBackup.handleManageDatabase(chatId, messageId);
        break;
      case 'backup_now':
        if (isAdmin(chatId)) {
          await bot.editMessageText(
            '📤 Sending database backup...',
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: 'Markdown'
            }
          );
          await dbBackup.sendBackupToAdmin();
          await bot.editMessageText(
            '✅ Database backup sent successfully!',
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[
                  { text: '« Back to Menu', callback_data: 'back_to_menu' }
                ]]
              }
            }
          );
        }
        break;
      case 'show_windows_selection':
        const rdpSession = userSessions.get(chatId);
        if (rdpSession) {
          rdpSession.step = 'selecting_windows';
          userSessions.set(chatId, rdpSession);
          await showWindowsSelection(bot, chatId, messageId);
        }
        break;
      case 'back_to_menu':
        const balance = await getBalance(chatId);
        const balanceText = isAdmin(chatId) ? 'Unlimited' : `Rp ${balance.toLocaleString()}`;
        const menuText = `🚀 *Selamat datang di Bot Instalasi RDP!*\n\n` +
                        `👤 ID: \`${chatId}\`\n` +
                        `💰 Saldo: ${balanceText}\n\n` +
                        `⚡️ *Spesifikasi Minimal VPS:*\n` +
                        `• CPU: 2 Core\n` +
                        `• RAM: 4 GB\n` +
                        `• Storage: 40 GB\n\n` +
                        `🔥 *Fitur Unggulan:*\n` +
						`• Rp. 1000 Per Install\n` +
                        `• Instalasi Otomatis\n` +
                        `• Multiple Windows Version\n` +
                        `• 24/7 Support\n` +
                        `• Deposit Manual / Bertanya Chat wa.me/6285173329868\n\n` +
                        `Silakan pilih menu di bawah ini:`;
        
        await bot.editMessageText(menuText, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          ...createMainMenu(isAdmin(chatId))
        });
        break;
      case 'back_to_windows':
        await showWindowsSelection(bot, chatId, messageId);
        break;
      case 'continue_no_kvm':
        const noKvmSession = userSessions.get(chatId);
        if (noKvmSession) {
          noKvmSession.step = 'selecting_windows';
          userSessions.set(chatId, noKvmSession);
          await showWindowsSelection(bot, chatId, messageId);
        }
        break;
      case 'cancel_installation':
        await handleCancelInstallation(bot, query, userSessions);
        break;
    }

    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Error handling callback query:', error);
    await bot.answerCallbackQuery(query.id, {
      text: '❌ Terjadi kesalahan. Silakan coba lagi.',
      show_alert: true
    });
  }
});

bot.on('polling_error', (error) => {
  if (error.code === 'EFATAL' || error.code === 'ETIMEDOUT') {
    console.error('Fatal polling error:', error);
    bot.stopPolling().then(() => {
      setTimeout(() => {
        bot.startPolling();
      }, 5000);
    });
  } else {
    console.error('Polling error:', error);
  }
});

bot.on('error', (error) => {
  console.error('Bot error:', error);
});