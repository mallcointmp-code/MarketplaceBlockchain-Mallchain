let twilio;
try {
  const Twilio = require("twilio");
  twilio = new Twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
} catch (e) {
  twilio = { messages: { create: async () => {} } };
}
const nodemailer = require("nodemailer");

async function sendWhatsApp(to, message) {
  await twilio.messages.create({
    to: `whatsapp:${to}`,
    from: process.env.TWILIO_WHATSAPP_FROM,
    body: message
  });
}

async function sendSMS(to, message) {
  await twilio.messages.create({
    to,
    from: process.env.TWILIO_FROM,
    body: message
  });
}

async function sendEmail(to, subject, text) {
  const transporter = nodemailer.createTransport({ /* SMTP config */ });
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
}

module.exports = { sendWhatsApp, sendSMS, sendEmail };