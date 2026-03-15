// backend/services/mpesaService.js
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const moment = require('moment');

const BASE_URL = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "";
const SHORTCODE = process.env.MPESA_SHORTCODE || "";
const PASSKEY = process.env.MPESA_PASSKEY || "";
const CALLBACK_BASE = process.env.MPESA_CALLBACK_BASE || process.env.MPESA_CALLBACK || "";
const PAYOUT_SHORTCODE = process.env.MPESA_PAYOUT_SHORTCODE || process.env.MPESA_SHORTCODE || "";

// === Utilities ===
async function getAccessToken() {
  const tokenUrl = `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`;
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const resp = await axios.get(tokenUrl, { headers: { Authorization: `Basic ${auth}` } });
  return resp.data.access_token;
}

function lipaTimestamp() {
  return moment().utc().format("YYYYMMDDHHmmss");
}

function lipaPassword() {
  const ts = lipaTimestamp();
  const pwd = Buffer.from(`${SHORTCODE}${PASSKEY}${ts}`).toString("base64");
  return { ts, pwd };
}

function normalizePhone(phone) {
  if (!phone) return phone;
  let p = String(phone).replace(/\s+/g, "");
  if (p.startsWith("0")) p = "254" + p.substring(1);
  if (p.startsWith("+")) p = p.substring(1);
  return p;
}

// === M-Pesa STK Push ===
async function stkPush({ amount, phone, accountReference = "TheMarketPlace", transactionDesc = "Topup Mallmoney" }) {
  const token = await getAccessToken();
  const { ts, pwd } = lipaPassword();
  const url = `${BASE_URL}/mpesa/stkpush/v1/processrequest`;
  const body = {
    BusinessShortCode: SHORTCODE,
    Password: pwd,
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: normalizePhone(phone),
    PartyB: SHORTCODE,
    PhoneNumber: normalizePhone(phone),
    CallBackURL: `${CALLBACK_BASE.replace(/\/$/, "")}/mpesa/stk-callback`,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc
  };
  const resp = await axios.post(url, body, { headers: { Authorization: `Bearer ${token}` } });
  return resp.data;
}

// === M-Pesa B2C Payout ===
async function mpesaPayout({ phone, amount, remarks = "Payout", occasion = "" }) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/mpesa/b2c/v1/paymentrequest`;
  const body = {
    InitiatorName: process.env.MPESA_INITIATOR || "testapi",
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL || "",
    CommandID: "BusinessPayment",
    Amount: amount,
    PartyA: PAYOUT_SHORTCODE || SHORTCODE,
    PartyB: normalizePhone(phone),
    Remarks: remarks,
    QueueTimeOutURL: `${CALLBACK_BASE.replace(/\/$/, "")}/mpesa/payout-timeout`,
    ResultURL: `${CALLBACK_BASE.replace(/\/$/, "")}/mpesa/payout-result`,
    Occasion: occasion
  };
  const resp = await axios.post(url, body, { headers: { Authorization: `Bearer ${token}` } });
  return resp.data;
}

// === Callback parser ===
function parseStkCallback(body) {
  try {
    const cb = body?.Body?.stkCallback;
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = cb || {};
    let metadata = {};
    if (cb?.CallbackMetadata?.Item) {
      for (const it of cb.CallbackMetadata.Item) {
        metadata[it.Name] = it.Value || null;
      }
    }
    return { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, metadata };
  } catch (err) {
    console.error("parseStkCallback error", err);
    return null;
  }
}

// === Encrypt security credential ===
function encryptSecurityCredential(password) {
  try {
    const certPath = process.env.MPESA_SECURITY_CERT || process.env.MPESA_SECURITY_CREDENTIAL_FILE || "";
    if (!certPath || !fs.existsSync(certPath)) throw new Error("Security certificate not configured or not found");
    const cert = fs.readFileSync(certPath);
    const encrypted = crypto.publicEncrypt(cert, Buffer.from(password));
    return encrypted.toString("base64");
  } catch (err) {
    console.warn('encryptSecurityCredential failed', err && err.message);
    throw err;
  }
}

// === Compatibility helpers ===
async function initiateStkPush(phone, amount, accountReference = "TheMarketPlace", callbackUrl = undefined) {
  return await stkPush({ amount, phone, accountReference, transactionDesc: "Topup Mallmoney" });
}

// Alias for B2C worker
const b2cPayout = mpesaPayout;

// === Exports ===
module.exports = {
  getAccessToken,
  stkPush,
  initiateStkPush,
  mpesaPayout,
  b2cPayout,
  parseStkCallback,
  encryptSecurityCredential,
  axios,
  fs,
  crypto,
  moment,
  BASE_URL,
  CONSUMER_KEY,
  CONSUMER_SECRET,
  SHORTCODE,
  PASSKEY,
  CALLBACK_BASE,
  PAYOUT_SHORTCODE
};
