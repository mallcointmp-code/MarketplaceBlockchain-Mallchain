const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const feedSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String,
  type: { type: String, enum: ["achievement", "review", "invite", "general"], default: "general" },
  reactions: {
    like: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    love: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    wow: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    laugh: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Feed", feedSchema);
module.exports = { mongoose, commentSchema, feedSchema };