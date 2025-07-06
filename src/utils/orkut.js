const axios = require("axios");
const FormData = require("form-data");
const { fromBuffer } = require("file-type");
const qris = require("./qr");

const QRIS_BASE = "00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214522579636198220303UMI51440014ID.CO.QRIS.WWW0215ID20243618488390303UMI5204541153033605802ID5924PENJAHIT JANTI OK21489826010BALIKPAPAN61057611162070703A0163047310";
const CHECK_PAYMENT_URL = "https://gateway.okeconnect.com/api/mutasi/qris/OK2148982/650288317326127162148982OKCTD8073A07FA73356453190282B1CE56DD";

// Fungsi upload QRIS pakai axios
const catbox = async (buffer) => {
  try {
    const { ext } = await fromBuffer(buffer);
    const bodyForm = new FormData();
    bodyForm.append("file", buffer, "file." + ext);

    const response = await axios.post("https://file.idnet.my.id/api/upload.php", bodyForm, {
      headers: bodyForm.getHeaders(),
    });

    return response.data.file.url;
  } catch (error) {
    console.error("Uploader error:", error.response?.data || error.message);
    throw new Error("Gagal mengupload gambar QRIS.");
  }
};

// Fungsi membuat QRIS dan upload
const createPayment = async (amount) => {
  try {
    const qrBuffer = await qris.qrisDinamisBuffer(QRIS_BASE, amount);
    const qrLink = await catbox(qrBuffer);
    return { qr: qrLink };
  } catch (error) {
    console.error("Payment creation error:", error.message);
    throw new Error(`Gagal membuat pembayaran: ${error.message}`);
  }
};

// Fungsi cek status pembayaran
const checkPaymentStatus = async (amount) => {
  try {
    const response = await axios.get(CHECK_PAYMENT_URL, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    const data = response.data;

    if (data.status !== "success" || !Array.isArray(data.data)) {
      throw new Error("Respon dari server tidak valid atau transaksi tidak ditemukan.");
    }

    const formattedAmount = amount.toString();

    const transaction = data.data.find(
      (trx) => trx.amount === formattedAmount && trx.type === "CR"
    );

    if (transaction) {
      console.log("Pembayaran berhasil:", transaction);
      return { status: "success", transaction };
    } else {
      console.log("Belum ada pembayaran yang sesuai.");
      return { status: "pending" };
    }
  } catch (error) {
    console.error("Payment status check error:", error.message);
    throw new Error(`Gagal mengecek status pembayaran: ${error.message}`);
  }
};

module.exports = { createPayment, checkPaymentStatus };