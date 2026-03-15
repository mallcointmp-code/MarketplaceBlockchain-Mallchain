const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const { sendWhatsApp, sendSMS, sendEmail } = require("../services/orthopharmNotificationService");

// Send notification to employee or customer
router.post("/send", authMiddleware, async (req, res) => {
  try {
    const { type, to, message, subject } = req.body;
    if (!to || !message) return res.status(400).json({ error: "Recipient and message required" });
    if (type === "whatsapp") await sendWhatsApp(to, message);
    else if (type === "sms") await sendSMS(to, message);
    else if (type === "email") await sendEmail(to, subject || "Notification", message);
    else return res.status(400).json({ error: "Invalid notification type" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send notification" });
  }
});

module.exports = router;