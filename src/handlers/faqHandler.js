async function handleFAQ(bot, chatId, messageId) {
  const faqText = `❓ FAQ - Pertanyaan Umum

🔒 *Langkah Wajib Setelah Proses Installasi RDP Selesai*\n\n` +
          `*1. Mengatur Account Lockout Threshold Jadi Nol*\n\n` +
          `Langkah pertama ini bakal bikin akun kamu nggak akan terkunci lagi walaupun ada beberapa kali login gagal. Cocok banget buat menghindari gangguan penguncian akun.\n\n` +
          `*Caranya:*\n` +
          `1. Tekan tombol Windows + R, ketik secpol.msc, lalu tekan Enter.\n` +
          `2. Ini akan membuka jendela Local Security Policy.\n` +
          `3. Pergi ke Account Policies > Account Lockout Policy.\n` +
          `4. Cari Account lockout threshold, klik dua kali.\n` +
          `5. Ubah nilainya jadi 0 (nol), lalu klik OK.\n\n` +
          `*TIPS TAMBAHAN*\n\n` +
          `1. Tekan Monitor Insttalation Untuk Melihat proses installasinya.\n` +
          `2. Jika Muncul Pesan "NoVNC Encountered An Error" di monitoring installation, abaikan saja, tunggu 10 menit-1 jam sampai proses benar-benar selesai.\n` +
          `3. Sambil menunggu , anda dapat melakukan instalasi lain secara bersamaan.\n\n` +
          `4. Jika ingin bertanya, hubungi admin di wa.me/6285173329868.\n\n` +
          `4. Untuk memulai bot lagi, ketik /start`;

  await bot.editMessageText(faqText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '« Kembali', callback_data: 'back_to_menu' }
      ]]
    }
  });
}

module.exports = {
  handleFAQ
};