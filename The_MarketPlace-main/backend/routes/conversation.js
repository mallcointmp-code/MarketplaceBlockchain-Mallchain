

const express = require("express");
const Conversation = require("../models/Conversation");

const router = express.Router();

// 🧾 List all conversations for a user
router.get("/:userId", async (req, res) => {
  try {
    const convos = await Conversation.find({
      participants: { $in: [req.params.userId] },
    }).sort({ updatedAt: -1 });
    res.json(convos);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// one to one (1-on-1)
router.post("/", async (req, res) => {
  try {
    const { members } = req.body; // [userA, userB]
    const existing = await Conversation.findOne({
      participants: { $all: members, $size: 2 },
    });
    if (existing) return res.json(existing);

    const convo = await Conversation.create({ participants: members });
    res.status(201).json(convo);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;


