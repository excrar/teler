const { checkPaymentStatus } = require('./payment');
const { createSuccessMessage, createErrorMessage } = require('./messageFormatter');
const BalanceManager = require('../handlers/balanceHandler');

async function handlePaymentStatus(bot, chatId, messageId, uniqueCode, amount) {
  const CHECK_INTERVAL = 5000; // 5 seconds
  const MAX_DURATION = 1800000; // 30 minutes
  let attempts = 0;
  const maxAttempts = Math.floor(MAX_DURATION / CHECK_INTERVAL);

  const interval = setInterval(async () => {
    try {
      attempts++;
      const statusData = await checkPaymentStatus(process.env.PAYDISINI_API_KEY, uniqueCode);
      
      if (statusData.success && statusData.data) {
        const status = statusData.data.status;
        
        if (status === 'Success') {
          clearInterval(interval);
          await handleSuccessfulPayment(bot, chatId, messageId, amount);
        } else if (status === 'Expired' || status === 'Canceled') {
          clearInterval(interval);
          await handleFailedPayment(bot, chatId, messageId, status);
        }
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        await handleFailedPayment(bot, chatId, messageId, 'Expired');
      }
    } catch (error) {
      console.error('Payment status check error:', error);
    }
  }, CHECK_INTERVAL);
}

async function handleSuccessfulPayment(bot, chatId, messageId, amount) {
  try {
    const newBalance = await BalanceManager.updateBalance(chatId, amount);
    
    // Edit the original message text without QR code
    await bot.editMessageText(
      createSuccessMessage(amount, newBalance),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '« Kembali ke Menu', callback_data: 'back_to_menu' }
          ]]
        }
      }
    );
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

async function handleFailedPayment(bot, chatId, messageId, status) {
  try {
    await bot.editMessageText(
      createErrorMessage(status),
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [[
            { text: '🔄 Coba Lagi', callback_data: 'deposit' },
            { text: '« Kembali ke Menu', callback_data: 'back_to_menu' }
          ]]
        }
      }
    );
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

module.exports = {
  handlePaymentStatus
};