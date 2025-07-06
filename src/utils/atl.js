const axios = require("axios");

const createPayment = async (apiKey, reffId, amount) => {
  try {
    const formData = {
      api_key: apiKey.trim(),
      reff_id: reffId,
      nominal: String(amount),
      type: "ewallet",
      metode: "qris",
    };

    const response = await axios.post("https://atlantich2h.com/deposit/create", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
    });

    if (!response.data) {
      throw new Error("Tidak ada response data");
    }

    return response.data;
  } catch (error) {
    console.error("Payment creation error:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
    throw new Error(`Gagal membuat pembayaran: ${error.message}`);
  }
};

const checkPaymentStatus = async (apiKey, depositId) => {
  try {
    const formData = {
      api_key: apiKey.trim(),
      id: depositId,
    };

    const response = await axios.post("https://atlantich2h.com/deposit/status", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Payment status check error:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
    throw new Error(`Gagal mengecek status pembayaran: ${error.message}`);
  }
};

const confirmInstantDeposit = async (apiKey, depositId) => {
  try {
    const formData = {
      api_key: apiKey.trim(),
      id: depositId,
      action: true,
    };

    const response = await axios.post("https://atlantich2h.com/deposit/instant", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Instant confirm error:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
    throw new Error(`Gagal konfirmasi instant: ${error.message}`);
  }
};

module.exports = {
  createPayment,
  checkPaymentStatus,
  confirmInstantDeposit,
};

