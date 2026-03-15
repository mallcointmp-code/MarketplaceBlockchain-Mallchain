const fs = require('fs');
const crypto = require('crypto');

/**
 * Encrypt security credential (plaintext password) using MPESA public certificate in PEM format.
 * Use PKCS1 padding for compatibility with Safaricom.
 */
export function encryptSecurityCredential(plainText, certPath) {
  if (!certPath || !fs.existsSync(certPath)) throw new Error('MPESA cert path missing');
  const cert = fs.readFileSync(certPath, 'utf8');
  const buffer = Buffer.from(plainText, 'utf8');
  const encrypted = crypto.publicEncrypt({ key: cert, padding: crypto.constants.RSA_PKCS1_PADDING }, buffer);
  return encrypted.toString('base64');
}

module.exports = { encryptSecurityCredential };

module.exports = { fs, crypto, cert, buffer, encrypted };