const Twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TOKEN || "";
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_MESSAGING_SERVICE || "";
const smsFrom = process.env.TWILIO_PHONE || process.env.TWILIO_FROM || null;

let client = null;
if (accountSid && authToken) {
  try {
    client = Twilio(accountSid, authToken);
  } catch (e) {
    console.warn("Twilio init failed:", e && e.message);
    client = null;
  }
}

async function sendSms(to, message) {
  if (!client) {
    // Safe fallback for environments without Twilio credentials: log and return mock success
    console.info("[sms stub]", to, message);
    return { ok: true, mock: true };
  }
  try {
    const res = await client.messages.create({
      to,
      body: message,
      messagingServiceSid: messagingServiceSid || undefined,
      from: smsFrom || undefined
    });
    return { ok: true, sid: res.sid };
  } catch (err) {
    console.error("sendSms error:", err && err.message);
    return { ok: false, error: err && err.message };
  }
}

async function getSmsBalance() {
  if (!client) throw new Error("Twilio not configured");
  try {
    const usage = await client.usage.records.lastMonth.list({ limit: 1 });
    return usage[0] || null;
  } catch (err) {
    console.error("getSmsBalance err", err && err.message);
    throw err;
  }
}

module.exports = { sendSms, getSmsBalance };