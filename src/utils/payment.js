const axios = require('axios');
const crypto = require('crypto');

const SERVICE_DESCRIPTIONS = [
  'Diamond Mobile Legends',
  'Diamond Free Fire'
];

let lastDescriptionIndex = -1;

const getNextDescription = () => {
  // Random selection with different description than last one
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * SERVICE_DESCRIPTIONS.length);
  } while (SERVICE_DESCRIPTIONS.length > 1 && newIndex === lastDescriptionIndex);
  
  lastDescriptionIndex = newIndex;
  return SERVICE_DESCRIPTIONS[newIndex];
};

const generateSignature = (params) => {
  const { key, uniqueCode, service, amount, validTime, request } = params;
  
  let signatureString;
  if (request === 'status') {
    signatureString = `${key}${uniqueCode}StatusTransaction`;
  } else {
    signatureString = `${key}${uniqueCode}${service}${amount}${validTime}NewTransaction`;
  }
  
  return crypto.createHash('md5').update(signatureString).digest('hex');
};

const createPayment = async (apiKey, uniqueCode, amount) => {
  try {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API Key is required');
    }

    const service = '11'; // QRIS service code
    const description = getNextDescription();
    const validTime = '1800'; // 30 minutes
    
    const signature = generateSignature({
      key: apiKey.trim(),
      uniqueCode,
      service,
      amount: String(amount),
      validTime,
      request: 'new'
    });
    
    const formData = {
      key: apiKey.trim(),
      request: 'new',
      unique_code: uniqueCode,
      service,
      amount: String(amount),
      note: description,
      valid_time: validTime,
      type_fee: '1',
      payment_guide: true,
      signature
    };

    console.log('PayDisini Request:', formData);
    
    const response = await axios.post('https://api.paydisini.co.id/v1/', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });
    
    if (!response.data.success) {
      throw new Error(response.data.msg || 'Payment creation failed');
    }
    
    return response.data;
  } catch (error) {
    console.error('Payment creation error:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    throw new Error(`Gagal membuat pembayaran: ${error.message}`);
  }
};

const checkPaymentStatus = async (apiKey, uniqueCode) => {
  try {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API Key is required');
    }

    const signature = generateSignature({
      key: apiKey.trim(),
      uniqueCode,
      request: 'status'
    });
    
    const formData = {
      key: apiKey.trim(),
      request: 'status',
      unique_code: uniqueCode,
      signature
    };

    console.log('PayDisini Status Check Request:', formData);
    
    const response = await axios.post('https://api.paydisini.co.id/v1/', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });
    
    console.log('PayDisini Status Check Response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Payment status check error:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    throw new Error(`Gagal mengecek status pembayaran: ${error.message}`);
  }
};

module.exports = { createPayment, checkPaymentStatus };