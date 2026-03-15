// backend/services/notificationService.js
const nodemailer = require("nodemailer");
const Notification = require("../models/Notification");
let app;
try {
  app = require("../app");
} catch (e) {
  app = null;
}
const io = app && app.get ? app.get("io") : null;

/**
 * Generic function to send notifications and optionally email alerts.
 * @param {String} title - Short title of the alert
 * @param {String} message - Full message for admin dashboard
 * @param {String} type - "info" | "warning" | "error" | "fraud"
 * @param {Boolean} sendEmail - Whether to send an email too
 * @param {String|ObjectId|null} userId - optional recipient user id
 */
const sendNotification = async (title, message, type = "info", sendEmail = false, userId = null) => {
  try {
    // 1️⃣ Store notification in DB
    await Notification.create({
      user: userId,
      title,
      message,
      type,
      createdAt: new Date(),
      read: false,
    });

    // 2️⃣ Emit to socket if available
    if (io && userId) {
      try {
        io.to(userId.toString()).emit("notification", { title, message, type });
      } catch (e) {
        // ignore socket emit errors
      }
    }

    // 3️⃣ Optionally email admin
    if (sendEmail) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.ADMIN_EMAIL || "avastaian36@gmail.com",
          pass: process.env.ADMIN_PASS || "your_app_password_here",
        },
      });

      await transporter.sendMail({
        from: `"The Market Place" <${process.env.ADMIN_EMAIL}>`,
        to: process.env.ADMIN_EMAIL || "avastaian36@gmail.com",
        subject: `🚨 ${title}`,
        html: `
          <h3>${title}</h3>
          <p>${message}</p>
          <small>This alert was generated automatically by The Market Place security system.</small>
        `,
      });
    }

    console.log(`📨 Notification processed: ${title}`);
  } catch (err) {
    console.error("❌ Notification error:", err.message);
  }
};

module.exports = {
  sendNotification,
};

