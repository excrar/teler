const broadcastMessage = require('./broadcastMessage');

function setupBroadcastHandler(bot) {
  // Handler untuk tombol broadcast
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === 'broadcast') {
      // Minta admin memasukkan pesan broadcast
      await bot.sendMessage(chatId, "🚀 Masukkan pesan yang ingin di-broadcast:");
      
      // Tangkap pesan broadcast dari admin
      bot.once('message', async (msg) => {
        const message = msg.text;

        // Konfirmasi ke admin
        await bot.sendMessage(chatId, `🚀 Memulai broadcast...\n\nPesan: ${message}`);

        // Jalankan broadcast dengan await
        await broadcastMessage(bot, message);

        // Beri tahu admin bahwa broadcast selesai
        await bot.sendMessage(chatId, "✅ Broadcast selesai!");
      });
    }
  });
}

module.exports = setupBroadcastHandler;