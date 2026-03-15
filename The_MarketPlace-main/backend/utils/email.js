const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function sendEmail(to, subject, text, html) {
  const msg = { from: process.env.EMAIL_USER, to, subject };
  if (html) msg.html = html; else msg.text = text;
  return transporter.sendMail(msg);
}

module.exports = sendEmail;
module.exports = { nodemailer, transporter, msg };