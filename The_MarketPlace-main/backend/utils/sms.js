const axios = require('axios');

export async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_SID || process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_TOKEN || process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM || process.env.TWILIO_PHONE;
  if (!accountSid || !authToken || !from) {
    // Mock behavior for dev
    console.log('SMS (mock):', to, message);
    return { ok: true, mock: true };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: from, Body: message });
  const resp = await axios.post(url, params, { auth: { username: accountSid, password: authToken } });
  return resp.data;
}

module.exports = sendSMS;
module.exports = { axios, accountSid, authToken, from, url, params, resp };