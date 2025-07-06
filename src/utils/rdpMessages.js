const createInputMessage = (type, error = null) => {
  const messages = {
    ip: {
      title: '📝 *Masukkan detail VPS*',
      instruction: '🌐 Silakan masukkan IP VPS:',
      note: '_IP akan dihapus otomatis setelah dikirim untuk keamanan_'
    },
    password: {
      title: '🔑 *Masukkan Password VPS*',
      instruction: 'Silakan masukkan password root VPS:',
      note: '_Password akan dihapus otomatis setelah dikirim untuk keamanan_'
    }
  };

  const msg = messages[type];
  return `${msg.title}\n\n` +
         `${msg.instruction}\n` +
         `${msg.note}\n\n` +
         `⚠️ *PENTING:* VPS Wajib Fresh Install Ubuntu 22.04` +
         (error ? `\n\n❌ Error: ${error}` : '');
};

const createVpsSpecsMessage = (windowsVersion) => {
  return `🖥️ *Pilih Spesifikasi VPS*\n\n` +
         `Windows: ${windowsVersion.name}\n` +
         `💰 Harga: Rp ${windowsVersion.price.toLocaleString()}\n\n` +
         `⚠️ *PENTING:* VPS Wajib Fresh Install Ubuntu 22.04\n\n` +
         `Spesifikasi yang tersedia:\n\n` +
         `1. VPS 4/8/150:\n` +
         `   • CPU: 4 Core\n` +
         `   • RAM: 6 GB (dari 8 GB)\n` +
         `   • Storage: 140 GB (dari 150 GB)\n\n` +
         `2. VPS 2/4/80:\n` +
         `   • CPU: 2 Core\n` +
         `   • RAM: 2 GB (dari 4 GB)\n` +
         `   • Storage: 70 GB (dari 80 GB)\n\n` +
         `3. Custom VPS:\n` +
         `   • RAM dikurangi 2 GB\n` +
         `   • Storage dikurangi 10 GB`;
};

module.exports = {
  createInputMessage,
  createVpsSpecsMessage
};