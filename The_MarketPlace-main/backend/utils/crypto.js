const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

if (!process.env.CRYPTO_SECRET) throw new Error('CRYPTO_SECRET must be set');
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set');

const SECRET_KEY = crypto.scryptSync(process.env.CRYPTO_SECRET, 'the_marketplace_salt', 32);
const JWT_SECRET = process.env.JWT_SECRET;

const CryptoUtils = {
  hash(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
  },
  encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(String(text));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  },
  decrypt(encryptedText) {
    const parts = String(encryptedText).split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  },
  generateJWT(payload, expiresIn = '7d') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  },
  verifyJWT(token) {
    return jwt.verify(token, JWT_SECRET);
  }
};

module.exports = { CryptoUtils };

module.exports = { crypto, jwt, ALGORITHM, IV_LENGTH, SECRET_KEY, JWT_SECRET, CryptoUtils, iv, cipher, parts, iv, encrypted, decipher };