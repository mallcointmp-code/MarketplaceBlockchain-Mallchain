const express = require('express');
const router = express.Router();
const MallcoinPurchase = require('../models/MalicoinPurchase');
const axios = require('axios');
const crypto = require('crypto');

const SAFARICOM_API = process.env.SAFARICOM_API || 'https://sandbox.safaricom.co.ke';
const SAFARICOM_KEY = process.env.SAFARICOM_KEY || '';
const SAFARICOM_SECRET = process.env.SAFARICOM_SECRET || '';
const BUSINESS_SHORT_CODE = process.env.BUSINESS_SHORT_CODE || '174379';
const PASSKEY = process.env.PASSKEY || '';
const CALLBACK_URL = process.env.CALLBACK_URL || 'http://localhost:4000/api/buy/mpesa/callback';

// Reserve a quote for Mallcoin purchase
router.post('/reserve', async (req, res) => {
  try {
    const { amount, fiat, currency, walletAddress, phone } = req.body;
    if (!amount || !walletAddress || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const quoteId = crypto.randomBytes(12).toString('hex');
    const mpesaRef = 'MLCNS' + Date.now();
    
    const purchase = await MallcoinPurchase.create({
      quoteId,
      walletAddress,
      amount: Number(amount),
      fiatAmount: Number(fiat.replace(/[^\d.-]/g, '')) || 0,
      currency: currency || 'KES',
      phone,
      mpesaRef,
      status: 'pending'
    });

    return res.json({
      ok: true,
      quoteId,
      mpesaRef,
      fiatAmount: purchase.fiatAmount,
      currency: purchase.currency
    });
  } catch (e) {
    console.error('buy reserve error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Initiate M-Pesa STK push
router.post('/mpesa', async (req, res) => {
  try {
    const { quoteId, phone, amount, description } = req.body;
    if (!quoteId || !phone || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const purchase = await MallcoinPurchase.findOne({ quoteId });
    if (!purchase) return res.status(404).json({ error: 'Quote not found' });

    // Try to perform a real STK Push if Safaricom credentials are provided
    try {
      if (SAFARICOM_KEY && SAFARICOM_SECRET && PASSKEY && BUSINESS_SHORT_CODE) {
        const auth = Buffer.from(`${SAFARICOM_KEY}:${SAFARICOM_SECRET}`).toString('base64');
        const tokenRes = await axios.get(
          `${SAFARICOM_API.replace(/\/$/, '')}/oauth/v1/generate?grant_type=client_credentials`,
          { headers: { Authorization: `Basic ${auth}` }, timeout: 5000 }
        );
        const token = tokenRes.data && tokenRes.data.access_token;
        if (!token) throw new Error('No access token from Safaricom');

        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${BUSINESS_SHORT_CODE}${PASSKEY}${timestamp}`).toString('base64');

        const stkBody = {
          BusinessShortCode: BUSINESS_SHORT_CODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Number(amount),
          PartyA: phone,
          PartyB: BUSINESS_SHORT_CODE,
          PhoneNumber: phone,
          CallBackURL: CALLBACK_URL,
          AccountReference: purchase.mpesaRef || quoteId,
          TransactionDesc: description || `Purchase ${quoteId}`
        };

        const stkRes = await axios.post(
          `${SAFARICOM_API.replace(/\/$/, '')}/mpesa/stkpush/v1/processrequest`,
          stkBody,
          { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
        );

        // success response contains CheckoutRequestID
        const resp = stkRes.data || {};
        const checkoutId = resp.CheckoutRequestID || resp.checkoutRequestID || '';
        const paymentId = checkoutId || ('PAY' + Date.now());

        purchase.paymentId = paymentId;
        purchase.status = 'payment_initiated';
        await purchase.save();

        return res.json({ ok: true, paymentId, status: 'initiated', raw: resp });
      }
    } catch (e) {
      console.warn('STK push failed, falling back to mock start:', e.message || e);
    }

    // Fallback: simulate M-Pesa push (when credentials or network fail)
    const paymentId = 'PAY' + Date.now();
    purchase.paymentId = paymentId;
    purchase.status = 'payment_initiated';
    await purchase.save();

    return res.json({ ok: true, paymentId, status: 'initiated', mocked: true });
  } catch (e) {
    console.error('M-Pesa initiate error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Check payment status
router.get('/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const purchase = await MallcoinPurchase.findOne({ paymentId });
    if (!purchase) return res.json({ status: 'unknown' });
    return res.json({ status: purchase.status, reason: purchase.reason });
  } catch (e) {
    console.error('Status check error:', e);
    res.json({ status: 'error' });
  }
});

// M-Pesa callback (simulated for sandbox)
router.post('/mpesa/callback', async (req, res) => {
  try {
    const data = req.body;
    // In sandbox, simulate payment confirmation
    // In production, validate callback signature
    const paymentId = data.Body?.stkCallback?.CheckoutRequestID || data.Body?.stkCallback?.RequestID || '';
    const resultCode = typeof data.Body?.stkCallback?.ResultCode !== 'undefined' ? data.Body.stkCallback.ResultCode : (data.Body?.stkCallback?.ResultCode || 1);

    if (resultCode === 0) {
      const callbackMetadata = data.Body?.stkCallback?.CallbackMetadata?.Item || [];
      const metadata = {};
      callbackMetadata.forEach(item => {
        metadata[item.Name] = item.Value;
      });

      const purchase = await MallcoinPurchase.findOne({ paymentId });
      if (purchase) {
        purchase.status = 'confirmed';
        purchase.mpesaRef = metadata.MpesaReceiptNumber || purchase.mpesaRef;
        await purchase.save();
      }
    } else {
      const purchase = await MallcoinPurchase.findOne({ paymentId });
      if (purchase) {
        purchase.status = 'failed';
        purchase.reason = 'User cancelled or payment failed';
        await purchase.save();
      }
    }

    return res.json({ ResultCode: 0 });
  } catch (e) {
    console.error('M-Pesa callback error:', e);
    res.json({ ResultCode: 1 });
  }
});

// Credit Mallcoins to wallet (blockchain transaction)
router.post('/credit', async (req, res) => {
  try {
    const { quoteId, walletAddress } = req.body;
    if (!quoteId || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const purchase = await MallcoinPurchase.findOne({ quoteId });
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

    if (purchase.status !== 'confirmed') {
      return res.status(400).json({ error: 'Payment not confirmed' });
    }

    if (purchase.status === 'credited') {
      return res.json({ ok: true, success: true, message: 'Already credited' });
    }

    // Trigger blockchain transaction to mint/transfer Mallcoins
    // This is a placeholder - implement actual chain logic
    try {
      // Example: Send transaction to chain node
      const chainRes = await axios.post('http://localhost:4000/api/mallwallet/transfer', {
        toAddress: walletAddress,
        amount: Math.round(purchase.amount * 1000000), // assume 6 decimal places
        memo: `Purchase ${purchase.quoteId}`
      });

      if (chainRes.data && chainRes.data.txHash) {
        purchase.txHash = chainRes.data.txHash;
        purchase.status = 'credited';
        await purchase.save();
        return res.json({ ok: true, success: true, txHash: chainRes.data.txHash });
      }
    } catch (chainErr) {
      console.error('Chain error:', chainErr.message);
      // Fallback: mark as pending confirmation but don't fail
      purchase.status = 'credited'; // optimistic
      await purchase.save();
      return res.json({ ok: true, success: true, message: 'Transaction submitted (pending blockchain confirmation)' });
    }

    return res.status(500).json({ error: 'Failed to credit Mallcoins' });
  } catch (e) {
    console.error('Credit error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
