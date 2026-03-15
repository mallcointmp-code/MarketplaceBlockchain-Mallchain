const express = require("express");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const { authMiddleware } = require("../middlewares/authMiddleware");

const router = express.Router();

// 🧾 List posts (feed)
router.get("/", async (_req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(100);
    res.json(posts);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 📝 Create a new post
router.post("/", async (req, res) => {
  try {
    const { userId, text, mediaUrl } = req.body;
    const post = await Post.create({ userId, text, mediaUrl });

    // notify followers (simplified)
    await Notification.create({
      userId,
      type: "post",
      title: "New Post",
      message: "Your post is now live.",
    });

    res.status(201).json({ message: "Post published", post });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// --- Like/Unlike Post ---
router.post("/like/:id", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    let action = "";
    if (post.likes.includes(req.user.userId)) {
      post.likes.pull(req.user.userId);
      action = "unliked";
    } else {
      post.likes.push(req.user.userId);
      action = "liked";

      if (post.author.toString() !== req.user.userId.toString()) {
        const notif = new Notification({
          user: post.author,
          type: "post_like",
          message: `Someone liked your post: "${post.content.substring(0, 50)}..."`,
          link: `/posts/${post._id}`,
        });
        await notif.save();

        io.to(post.author.toString()).emit("newNotification", {
          type: "post_like",
          message: `Someone liked your post`,
          link: `/posts/${post._id}`,
        });
      }
    }

    await post.save();
    res.json({ likes: post.likes.length, action });
  } catch (err) {
    console.error("Error liking post:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Add Comment ---
router.post("/comment/:id", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.comments.push({ user: req.user.userId, text });
    await post.save();

    if (post.author.toString() !== req.user.userId.toString()) {
      const notif = new Notification({
        user: post.author,
        type: "post_comment",
        message: `Someone commented: "${text.substring(0, 50)}..." on your post`,
        link: `/posts/${post._id}`,
      });
      await notif.save();

      io.to(post.author.toString()).emit("newNotification", {
        type: "post_comment",
        message: `Someone commented on your post`,
        link: `/posts/${post._id}`,
      });
    }

    res.json(post.comments);
  } catch (err) {
    console.error("Error commenting:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
