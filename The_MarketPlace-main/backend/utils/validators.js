// backend/utils/validators.js
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isStrongPassword = (password) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
const isValidPhone = (phone) => /^\+\d{10,15}$/.test(phone);
const isValidPin = (pin) => /^\d{4,6}$/.test(pin);
const isValidAmount = (amount) => typeof amount === "number" && amount > 0;
const isValidUrl = (url) => { try { new URL(url); return true;} catch {return false;} };
const sanitize = (input) => typeof input === "string" ? input.trim().replace(/[<>]/g, "") : input;
const Validators = {
  isPositiveNumber(value) {
    return typeof value === "number" && value > 0;
  },

  validateWalletAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address); // Ethereum-style
  },
};

module.exports = {
  isValidEmail,
  isStrongPassword,
  isValidPhone,
  isValidPin,
  isValidAmount,
  isValidUrl,
  sanitize,
  Validators,
};