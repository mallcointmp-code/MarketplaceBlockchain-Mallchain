const QRCode = require('qrcode');
const pendingStore = require('./pendingStore.js');

export async function generateQrDataUrl(payload) {
  const data = JSON.stringify(payload);
  return QRCode.toDataURL(data, { margin: 1, width: 300 });
}

export async function generateQRCodeForPayment({ userId, amount, maxUses = 1, expiresInMinutes = 60 }) {
  const token = {
    userId,
    amount,
    maxUses,
    expiresAt: Date.now() + expiresInMinutes * 60 * 1000,
    id: `qr_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
  };
  const data = JSON.stringify(token);
  const url = await QRCode.toDataURL(data);
  await pendingStore.setQr(token.id, { token, uses: 0 }, expiresInMinutes * 60);
  return { id: token.id, dataUrl: url, token };
}

module.exports = { generateQrDataUrl, generateQRCodeForPayment };

module.exports = { QRCode, pendingStore, data, token, data, url };