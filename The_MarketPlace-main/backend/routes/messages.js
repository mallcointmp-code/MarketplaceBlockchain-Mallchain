const express = require("express");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");

const router = express.Router();

// 🧾 Fetch all messages in a conversation
router.get("/:conversationId", async (req, res) => {
  try {
    const msgs = await Message.find({ conversationId: req.params.conversationId });
    res.json(msgs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 💌 Send a message
router.post("/", async (req, res) => {
  try {
    const { conversationId, senderId, text } = req.body;
    const msg = await Message.create({ conversationId, senderId, text });

    await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });

    // create notification for receiver
    const convo = await Conversation.findById(conversationId);
    const receiverId = convo.participants.find((id) => id.toString() !== senderId);
    await Notification.create({
      userId: receiverId,
      type: "message",
      title: "New Message",
      message: "You have a new message waiting.",
    });

    res.status(201).json(msg);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

