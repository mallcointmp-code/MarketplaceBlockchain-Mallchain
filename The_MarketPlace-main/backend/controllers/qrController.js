const qrcode = require('qrcode');
const crypto = require('crypto');

const createPaymentQr = async (req, res) => {
  try {
    const { amount, receiverUserId, expiresIn = 300 } = req.body;
    if (!amount || !receiverUserId) return res.status(400).json({ error: 'amount & receiverUserId required' });

    const payload = { id: crypto.randomBytes(12).toString('hex'), amount, receiverUserId, createdAt: Date.now(), expiresAt: Date.now() + expiresIn * 1000 };
    const secret = process.env.QR_SIGN_SECRET || 'changeme';
    const hmac = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    const tokenPayload = { payload, hmac };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
    const url = `${process.env.FRONTEND_BASE || 'https://themarketplace.example'}/pay/qr?token=${encodeURIComponent(token)}`;
    const qrDataUrl = await qrcode.toDataURL(url);
    res.json({ token, url, qrDataUrl });
  } catch (err) {
    console.error('createPaymentQr err', err);
    res.status(500).json({ error: 'failed' });
  }
};

const verifyQrAndPay = async (req, res) => {
  try {
    const { token, payerId } = req.body;
    if (!token || !payerId) return res.status(400).json({ error: 'token & payerId required' });
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const secret = process.env.QR_SIGN_SECRET || 'changeme';
    const check = crypto.createHmac('sha256', secret).update(JSON.stringify(decoded.payload)).digest('hex');
    if (check !== decoded.hmac) return res.status(400).json({ error: 'invalid token signature' });
    if (decoded.payload.expiresAt < Date.now()) return res.status(400).json({ error: 'token expired' });

    // Perform wallet transfer
    const { send } = require('../services/walletService.js');
    const result = await send(payerId, decoded.payload.receiverUserId, decoded.payload.amount, { qrPayment: true, qrId: decoded.payload.id });
    return res.json({ ok: true, amount: decoded.payload.amount, receiver: decoded.payload.receiverUserId, txOut: result.txOut._id, txIn: result.txIn._id });
  } catch (err) {
    console.error('verifyQrAndPay err', err);
    res.status(500).json({ error: 'failed' });
  }
};

module.exports = { createPaymentQr, verifyQrAndPay };