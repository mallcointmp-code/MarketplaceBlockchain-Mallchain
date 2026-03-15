const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middlewares/authMiddleware');

const upload = require('../middlewares/uploadMiddleware');

// Validates and standardizes conversation IDs (always smaller_id + "_" + larger_id)
const getConversationId = (id1, id2) => {
  return [id1, id2].sort().join('_');
};

// --- Get Conversations List ---
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Use aggregation to find the latest message per conversation
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { recipient: req.user._id }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$$ROOT" }
        }
      },
      { $sort: { "lastMessage.createdAt": -1 } }
    ]);

    const result = await Promise.all(conversations.map(async (convo) => {
      const otherUserId = convo.lastMessage.sender.toString() === userId
        ? convo.lastMessage.recipient.toString()
        : convo.lastMessage.sender.toString();

      const otherUser = await User.findById(otherUserId)
        .select('username fullName avatar role');

      const unreadCount = await Message.countDocuments({
        conversationId: convo._id,
        recipient: req.user._id,
        read: false
      });

      return {
        _id: convo._id,
        lastMessage: convo.lastMessage,
        otherUser: otherUser || { _id: otherUserId, username: 'Unknown User', fullName: 'Unknown User' },
        unreadCount
      };
    }));

    res.json(result);
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Get Message History ---
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const recipientId = req.params.userId;
    const senderId = req.user._id.toString();
    const conversationId = getConversationId(senderId, recipientId);

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(100);

    // Mark messages sent to me as read
    await Message.updateMany(
      { conversationId, recipient: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- User Search (for starting new chats) ---
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } }
      ],
      _id: { $ne: req.user._id } // Don't find self
    })
      .select('username fullName avatar role')
      .limit(10);

    res.json({ users });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Typing Indicator ---
router.post('/typing', authMiddleware, async (req, res) => {
  const { recipientId, isTyping } = req.body;
  const senderId = req.user._id;
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${recipientId}`).emit('chat:typing', {
      senderId,
      isTyping
    });
  }
  res.json({ ok: true });
});

// --- Send Message (with optional file upload) ---
router.post('/:userId', authMiddleware, upload.uploadHandler, async (req, res) => {
  try {
    let payload = req.body;
    // Handle multipart if sent via FormData
    if (req.body.data) {
      try { payload = JSON.parse(req.body.data); } catch (e) { }
    }

    const { content, type } = payload;
    const recipientId = req.params.userId;
    const senderId = req.user._id;

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ error: 'User not found' });

    const conversationId = getConversationId(senderId.toString(), recipientId);

    const attachments = [];
    if (req.uploadedFiles && req.uploadedFiles.length) {
      req.uploadedFiles.forEach(f => {
        attachments.push({
          url: f.url || f.path || f.filename,
          filename: f.originalname || f.filename,
          type: f.mimetype || 'image'
        });
      });
    }

    const newMessage = new Message({
      sender: senderId,
      recipient: recipientId,
      conversationId,
      content: content || (attachments.length ? 'Shared a file' : ''),
      type: type || (attachments.length ? 'image' : 'text'),
      attachments
    });

    await newMessage.save();

    // Create a notification for the recipient
    try {
      await Notification.create({
        user: recipientId,
        type: 'message',
        category: 'social',
        message: `New message from ${req.user.fullName || req.user.username}: ${content || 'Shared a file'}`,
        details: {
          conversationId,
          senderId: senderId.toString(),
          messageId: newMessage._id
        }
      });
    } catch (notiErr) {
      console.error('Failed to create notification for chat message:', notiErr);
    }

    // Emit Real-Time Event via Socket.io
    const io = req.app.get('io');
    if (io) {
      // Emit to recipient's room (user:recipientId)
      io.to(`user:${recipientId}`).emit('message:receive', newMessage);
      // Also emit to sender (for multi-device sync)
      io.to(`user:${senderId}`).emit('message:sent', newMessage);

      // Trigger global notification update for the recipient
      io.to(`user:${recipientId}`).emit('notification', {
        title: 'New Message',
        message: `You have a new message from ${req.user.fullName || req.user.username}`,
        type: 'info'
      });
    }

    res.json(newMessage);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
