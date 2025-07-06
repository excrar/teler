const {
  roundUpSpecs
} = require('./specFormatter');

function createPaymentMessage(paymentData, amount, uniqueAmount) {
  const messageText = `💰 *Deposit Saldo*\n\n` +
    `Nominal Deposit: Rp ${amount.toLocaleString('id-ID')}\n` +
    `Kode Unik: Rp ${uniqueAmount.toLocaleString('id-ID')}\n` +
    `Total Bayar: Rp ${(amount + uniqueAmount).toLocaleString('id-ID')}\n\n` +
    `*Panduan Pembayaran QRIS:*\n` +
    `1. Scan QR Code di atas\n` +
    `2. Konfirmasi & selesaikan pembayaran\n` +
    `3. Tunggu saldo masuk otomatis\n` +
    `4. Jika ada kendala chat wa.me/6285173329868\n\n` +
    `⏳ Pembayaran akan kadaluarsa dalam 30 menit.`;

  const keyboard = {
    // inline_keyboard: [[{ text: '« Kembali ke Menu', callback_data: 'back_to_menu' }]]
  };

  return { 
    messageText, 
    keyboard,
  };
}

function createSuccessMessage(amount, newBalance) {
  return `✅ *Pembayaran Berhasil!*\n\n` +
  `💰 Saldo ditambahkan: Rp ${amount.toLocaleString('id-ID')}\n` +
  `💳 Saldo saat ini: Rp ${newBalance.toLocaleString('id-ID')}`;
}

function createErrorMessage(status) {
  return status === 'Expired'
  ? '⏰ Waktu pembayaran telah habis.': '❌ Pembayaran dibatalkan.';
}

function formatVPSSpecs(rawSpecs, configSpecs) {
  const roundedSpecs = roundUpSpecs(rawSpecs);
  return `📊 *Spesifikasi VPS:*\n\n` +
  `*Spesifikasi Asli:*\n` +
  `• CPU: ${roundedSpecs.cpu} Core\n` +
  `• RAM: ${roundedSpecs.ram}GB\n` +
  `• Storage: ${roundedSpecs.storage}GB\n\n` +
  `*Spesifikasi Setelah Instalasi:*\n` +
  `• CPU: ${configSpecs.cpu} Core\n` +
  `• RAM: ${configSpecs.ram}GB (dikurangi 2GB)\n` +
  `• Storage: ${configSpecs.storage}GB (dikurangi 10GB)\n\n`;
}

module.exports = {
  createPaymentMessage,
  createSuccessMessage,
  createErrorMessage,
  formatVPSSpecs
};
