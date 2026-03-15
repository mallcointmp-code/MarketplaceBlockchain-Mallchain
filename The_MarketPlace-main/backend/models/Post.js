// backend/models/Post.js
const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, default: "" },
  media: [{ type: String }], // urls
  visibility: { type: String, enum: ["public", "followers", "private"], default: "public" },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  commentsCount: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Post", PostSchema);
