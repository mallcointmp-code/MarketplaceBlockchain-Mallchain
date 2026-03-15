const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
  title: { type: String }, // optional (group chat)
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  unreadCounts: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      count: { type: Number, default: 0 },
    },
  ],
}, { timestamps: true });

module.exports = mongoose.models.Conversation || mongoose.model("Conversation", ConversationSchema);

module.exports = { mongoose, ConversationSchema };