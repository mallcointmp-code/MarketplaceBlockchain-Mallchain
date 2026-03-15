// backend/routes/contact.js
const express = require("express");
const ContactMessage = require("../models/ContactMessage");
const { authMiddleware } = require("../middlewares/authMiddleware");

const router = express.Router();

// 📬 User sends message
router.post("/", async (req, res) => {
  try {
    const message = new ContactMessage(req.body);
    await message.save();
    res.json({ message: "Your message has been received. Thank you for reaching out!" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send message", error: err.message });
  }
});

// 📋 Admin views all messages
router.get("/admin", authMiddleware, async (req, res) => {
  if (req.user.email !== "avastaian36@gmail.com")
    return res.status(403).json({ message: "Unauthorized" });

  const messages = await ContactMessage.find().sort({ createdAt: -1 });
  res.json(messages);
});

module.exports = router;
