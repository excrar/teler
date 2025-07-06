const fs = require("fs");
const axios = require("axios");
const QRCode = require("qrcode");
const FormData = require("form-data");
const { fromBuffer } = require("file-type");

const { createPaymentMessage } = require("../utils/messageFormatter");
const { createPayment, checkPaymentStatus, confirmInstantDeposit } = require("../utils/atl");
const BalanceManager = require("./balanceHandler");

const filePath = "user_data.json";

const readData = () => {
  if (!fs.existsSync(filePath)) return [];
  const rawData = fs.readFileSync(filePath, "utf8");
  return rawData ? JSON.parse(rawData) : [];
};

const saveData = (data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const saveBalanceToJson = (chat_id, amount) => {
  let users = readData();
  const userIndex = users.findIndex((user) => user.chat_id === chat_id);

  if (userIndex !== -1) {
    users[userIndex].amount += amount;
  } else {
    users.push({ chat_id, amount });
  }

  saveData(users);
  console.log(`Saldo pengguna ${chat_id} tersimpan di JSON: Rp ${amount.toLocaleString()}`);
};

function generateUniqueCode() {
  return Math.random().toString(36).substr(2, 10).toUpperCase();
}

function generateUniqueAmount(amount) {
  const randomCode = Math.floor(Math.random() * 999) + 1;
  return { totalAmount: amount + randomCode, uniqueCode: randomCode };
}

// ✅ Uploader terbaru (file.idnet.my.id)
async function uploadImage(buffer) {
  try {
    const { ext } = await fromBuffer(buffer);
    const bodyForm = new FormData();
    bodyForm.append("file", buffer, "file." + ext);

    const response = await axios.post("https://file.idnet.my.id/api/upload.php", bodyForm, {
      headers: bodyForm.getHeaders(),
    });

    if (response.data && response.data.file && response.data.file.url) {
      return response.data.file.url;
    } else {
      throw new Error("Gagal upload ke server IDNet");
    }
  } catch (error) {
    console.error("Uploader error:", error.response?.data || error.message);
    throw new Error("Gagal mengupload gambar QRIS.");
  }
}

async function handleDeposit(bot, chatId, messageId) {
  const msg = await bot.editMessageText(
    "💰 *Deposit Saldo*\n\nMasukkan jumlah deposit:\n_(minimal Rp 1000)_",
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "« Kembali ke Menu", callback_data: "back_to_menu" }]],
      },
    }
  );

  return { step: "waiting_amount", messageId: msg.message_id };
}

async function handleDepositAmount(bot, msg, session) {
  const chatId = msg.chat.id;
  const amount = parseInt(msg.text.replace(/[^0-9]/g, ""));

  try {
    await bot.deleteMessage(chatId, msg.message_id);
  } catch (error) {
    console.log("Failed to delete amount message:", error.message);
  }

  if (isNaN(amount) || amount < 1000) {
    await bot.editMessageText(
      "❌ Jumlah deposit tidak valid.\n\n💰 *Deposit Saldo*\n\nMasukkan jumlah deposit:\n_(minimal Rp 1000)_",
      {
        chat_id: chatId,
        message_id: session.messageId,
        parse_mode: "Markdown",
      }
    );
    return;
  }

  await bot.editMessageText("🔄 Membuat tagihan pembayaran...", {
    chat_id: chatId,
    message_id: session.messageId,
    parse_mode: "Markdown",
  });

  try {
    const apiKey = "hsh8P9MFZKND0uZyCF4w0txe5yatMDVkFknUXJmpAmDTBdRKpmtqeyQO70wpFAxDZVJ5zs3hEfm9wa2OaSq0OWaycdxjGumhmz8X";
    const reffId = generateUniqueCode();
    const { totalAmount, uniqueCode: randomCode } = generateUniqueAmount(amount);

    const paymentResponse = await createPayment(apiKey, reffId, totalAmount);

    if (!paymentResponse.status || !paymentResponse.data.qr_string) {
      throw new Error("Gagal membuat pembayaran");
    }

    const paymentData = paymentResponse.data;
    const { messageText, keyboard } = createPaymentMessage(paymentData, amount, randomCode);

    const qrBuffer = await QRCode.toBuffer(paymentData.qr_string);

    const uploadedUrl = await uploadImage(qrBuffer);

    try {
      await bot.editMessageMedia(
        {
          type: "photo",
          media: uploadedUrl,
          caption: messageText,
          parse_mode: "Markdown",
        },
        {
          chat_id: chatId,
          message_id: session.messageId,
          reply_markup: keyboard,
        }
      );
    } catch (error) {
      console.error("Gagal edit media, mengirim pesan baru...");
      await bot.sendPhoto(chatId, uploadedUrl, {
        caption: messageText,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    }

    await monitorPaymentStatus(bot, chatId, session.messageId, amount, randomCode, paymentData.id, apiKey);
  } catch (error) {
    console.error("Payment creation error:", error);
    await bot.editMessageText("❌ Terjadi kesalahan saat membuat pembayaran.", {
      chat_id: chatId,
      message_id: session.messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Coba Lagi", callback_data: "deposit" }, { text: "« Kembali ke Menu", callback_data: "back_to_menu" }],
        ],
      },
    });
  }
}

async function monitorPaymentStatus(bot, chatId, messageId, originalAmount, uniqueCode, depositId, apiKey) {
  const checkInterval = setInterval(async () => {
    try {
      const statusResponse = await checkPaymentStatus(apiKey, depositId);

      if (statusResponse.status && (statusResponse.data.status === "success" || statusResponse.data.status === "processing")) {
        clearInterval(checkInterval);

        try {
          const instantRes = await confirmInstantDeposit(apiKey, depositId);
          console.log("=== LOG RESPONSE INSTANT CONFIRMATION ===");
          console.log(instantRes);
          console.log("=========================================");
        } catch (err) {
          console.error("❌ Gagal konfirmasi instant:", err.message);
        }

        const finalAmount = originalAmount + uniqueCode;

        await BalanceManager.updateBalance(chatId, finalAmount);
        saveBalanceToJson(chatId, finalAmount);

        try {
          await bot.deleteMessage(chatId, messageId);
        } catch (deleteError) {
          console.error("Gagal menghapus pesan lama:", deleteError.message);
        }

        await bot.sendMessage(
          chatId,
          `✅ *Pembayaran berhasil!*\n\nSaldo sebesar *Rp ${finalAmount.toLocaleString()}* telah ditambahkan.\n\nJumlah deposit: Rp ${originalAmount.toLocaleString()}\nKode unik: Rp ${uniqueCode}\n\nSilakan ketik /start untuk kembali ke menu.`,
          {
            parse_mode: "Markdown",
          }
        );
      }
    } catch (error) {
      console.log("Gagal mengecek status pembayaran:", error.message);
    }
  }, 60000);
}

module.exports = { handleDeposit, handleDepositAmount };

