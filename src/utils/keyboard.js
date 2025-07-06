function createMainMenu(isAdmin = false) {
  const keyboard = [
    [
      { text: '🖥️ Install RDPmu', callback_data: 'install_rdp' },
      { text: '💰 Deposit', callback_data: 'deposit' }
    ],
    [
      { text: '❓ FAQ', callback_data: 'faq' },
      { text: '🏢 Provider', callback_data: 'providers' }
    ]
  ];

  if (isAdmin) {
    keyboard.splice(1, 0, [
      { text: '💳 Tambah Saldo', callback_data: 'add_balance' },
      { text: '🗣️ Boardcast', callback_data: 'boardcast' },
      { text: '📊 Database', callback_data: 'manage_db' }
    ]);
  }

  return {
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
}

module.exports = {
  createMainMenu
};