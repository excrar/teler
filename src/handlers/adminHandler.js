const { addBalance } = require('../utils/userManager');

async function handleAddBalance(bot, chatId, messageId) {
  await bot.editMessageText(
    'Masukkan ID pengguna dan jumlah saldo yang akan ditambahkan dalam format:\n\n`<user_id> <jumlah>`\n\nContoh: `123456789 50000`',
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '« Kembali', callback_data: 'back_to_menu' }
        ]]
      }
    }
  );
}

async function processAddBalance(bot, msg) {
  const parts = msg.text.split(' ');
  if (parts.length !== 2) {
    await bot.sendMessage(msg.chat.id, '❌ Format tidak valid. Gunakan format: `<user_id> <jumlah>`', {
      parse_mode: 'Markdown'
    });
    return;
  }

  const userId = parseInt(parts[0]);
  const amount = parseInt(parts[1]);

  if (isNaN(userId) || isNaN(amount) || amount <= 0) {
    await bot.sendMessage(msg.chat.id, '❌ ID pengguna atau jumlah tidak valid');
    return;
  }

  try {
    const newBalance = await addBalance(userId, amount);
    await bot.sendMessage(msg.chat.id, 
      `✅ Berhasil menambahkan saldo:\n\n` +
      `👤 User ID: \`${userId}\`\n` +
      `💰 Jumlah: Rp ${amount.toLocaleString()}\n` +
      `💳 Saldo Baru: Rp ${newBalance.toLocaleString()}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error adding balance:', error);
    await bot.sendMessage(msg.chat.id, '❌ Gagal menambahkan saldo. User ID tidak ditemukan.');
  }
}

module.exports = {
  handleAddBalance,
  processAddBalance
};