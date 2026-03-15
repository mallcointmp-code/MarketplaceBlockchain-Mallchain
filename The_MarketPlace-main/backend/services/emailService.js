// backend/services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
  }
});

/**
 * Premium HTML Template Wrapper
 */
function getTemplate(content) {
  return `
    <div style="background-color: #020617; color: #f8fafc; font-family: 'Inter', sans-serif; padding: 40px; border-radius: 20px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #6366f1; font-size: 24px; font-weight: 900; letter-spacing: -0.05em; margin: 0;">THE MARKET PLACE</h1>
        <p style="color: #64748b; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 5px;">Next-Gen Trading Platform</p>
      </div>
      <div style="background-color: rgba(255,255,255,0.03); padding: 30px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);">
        ${content}
      </div>
      <div style="text-align: center; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.05); pt: 20px;">
        <p style="color: #475569; font-size: 12px;">&copy; ${new Date().getFullYear()} The Market Place. Secure established.</p>
      </div>
    </div>
  `;
}

/**
 * Send email helper
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 */
async function sendEmail(to, subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email provider not configured. Skipping email send.");
    console.log(`[EMAIL-DEV] To: ${to} | Subject: ${subject} | HTML: ${html.substring(0, 100)}...`);
    return { success: false, ignored: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"The Market Place" <${process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html: getTemplate(html)
    });
    return { success: true, id: info.messageId };
  } catch (err) {
    console.error("sendEmail error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send Welcome Email
 */
async function sendWelcomeEmail(user) {
  const html = `
    <h2 style="color: #fff; font-weight: 900; margin-bottom: 20px;">System Access Granted.</h2>
    <p style="color: #94a3b8; line-height: 1.6;">Welcome, <strong>${user.fullName}</strong>. Your account has been successfully initialized on the platform.</p>
    <p style="color: #94a3b8; line-height: 1.6;">You now have access to global trading, specialized task sets, and our high-velocity financial tools as a <strong>${user.role.toUpperCase()}</strong>.</p>
    <div style="margin-top: 30px;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background-color: #6366f1; color: #fff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Finalize Setup</a>
    </div>
  `;
  return sendEmail(user.email, "Welcome to the Machine.", html);
}

/**
 * Send Password Reset Email
 */
async function sendPasswordResetEmail(email, resetUrl) {
  const html = `
    <h2 style="color: #fff; font-weight: 900; margin-bottom: 20px;">Recovery Protocol Initiated.</h2>
    <p style="color: #94a3b8; line-height: 1.6;">A password reset was requested for your account. If you did not initiate this, please secure your credentials immediately.</p>
    <p style="color: #94a3b8; line-height: 1.6;">This link will remain active for 60 minutes.</p>
    <div style="margin-top: 30px;">
      <a href="${resetUrl}" style="background-color: #fff; color: #000; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Reset Credentials</a>
    </div>
    <p style="color: #475569; font-size: 10px; margin-top: 20px;">Or copy/paste: ${resetUrl}</p>
  `;
  return sendEmail(email, "Secure Recovery Link", html);
}

module.exports = { nodemailer, transporter, sendEmail, sendWelcomeEmail, sendPasswordResetEmail };