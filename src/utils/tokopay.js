const axios = require('axios');
require('dotenv').config();

class TokoPay {
  constructor() {
    this.merchantId = process.env.TOKOPAY_MERCHANT_ID;
    this.secret = process.env.TOKOPAY_SECRET;
    this.baseUrl = 'https://api.tokopay.id/v1';
  }

  _generateRefId() {
    return `RDP${Date.now()}`;
  }

  _getCommonParams() {
    return {
      merchant: this.merchantId,
      secret: this.secret
    };
  }

  async createPayment(amount, method = 'QRIS') {
    console.log('🚀 Creating payment request:', { amount });
    
    const refId = this._generateRefId();
    const params = {
      ...this._getCommonParams(),
      ref_id: refId,
      nominal: amount,
      metode: method
    };

    try {
      const response = await axios.get(`${this.baseUrl}/order`, { params });
      console.log('✅ Payment creation successful:', response.data);
      
      const paymentData = {
        ...response.data,
        ref_id: refId
      };

      // Start monitoring immediately after creation
      this.monitorPaymentStatus({
        refId,
        onSuccess: (status) => console.log('💰 Payment completed:', { refId, status }),
        onTimeout: () => console.log('⏰ Payment monitoring timeout:', { refId }),
        onError: (error) => console.error('❌ Payment monitoring error:', { refId, error: error.message })
      });

      return paymentData;
    } catch (error) {
      console.error('❌ Payment creation failed:', {
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error('Payment creation failed');
    }
  }

  async checkPaymentStatus(refId) {
    console.log('🔍 Checking payment status:', { refId });

    const params = {
      ...this._getCommonParams(),
      ref_id: refId
    };

    try {
      const response = await axios.get(`${this.baseUrl}/order`, { params });
      console.log('✅ Status check result:', { refId, status: response.data.status });
      return response.data;
    } catch (error) {
      console.error('❌ Status check failed:', {
        refId,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  async monitorPaymentStatus({
    refId,
    onSuccess,
    onTimeout,
    onError,
    checkInterval = 5000,
    maxAttempts = 720
  }) {
    console.log('🔄 Starting payment monitoring:', { refId });
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const status = await this.checkPaymentStatus(refId);
        attempts++;

        if (status.status === 'Success') {
          onSuccess(status);
          return true;
        }

        if (attempts >= maxAttempts) {
          onTimeout();
          return true;
        }

        return false;
      } catch (error) {
        onError(error);
        return true;
      }
    };

    const intervalId = setInterval(async () => {
      const shouldStop = await checkStatus();
      if (shouldStop) {
        clearInterval(intervalId);
      }
    }, checkInterval);

    return intervalId;
  }
}

module.exports = TokoPay;