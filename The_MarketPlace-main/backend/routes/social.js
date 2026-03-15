const express = require("express");
const SocialLink = require("../models/SocialLink");
const SocialTaskCompletion = require("../models/SocialTaskCompletion");
const authMiddleware = require("../middlewares/authMiddleware");
const User = require("../models/User");
const sendNotification = require("../utils/notify");
const { useSocialCoins } = require("../services/mallcoinSupply");
const Badge = require("../models/Badge");
const Feed = require("../models/Feed");

const router = express.Router();

// 🟢 User participates in a social task
router.post("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params; // Social task ID
    const userId = req.user.id;

    // 1️⃣ Check if the link exists
    const task = await SocialLink.findById(id);
    if (!task || !task.active)
      return res.status(404).json({ message: "Social task not found or inactive" });

    // 2️⃣ Check if the user already completed it
    const already = await SocialTaskCompletion.findOne({ userId, socialTaskId: id });
    if (already)
      return res.status(400).json({ message: "You have already completed this task" });

    // 3️⃣ Create completion record
    await SocialTaskCompletion.create({ userId, socialTaskId: id, completed: true, rewarded: true });

    // 4️⃣ Reward the user (Mallcoins)
    // Example placeholder (replace with your wallet logic)
    req.user.mallcoins += task.reward;
    await req.user.save();

    // Reward for social activity (e.g., sharing, reviewing)
    const activity = "completing a social task";
    const user = await User.findById(userId);
    if (!user.socialRewards.includes(activity)) {
      user.socialRewards.push(activity);
      await user.save();
      useSocialCoins(5); // Deduct from social supply
      // ...credit Mallcoins or points...
      await sendNotification(userId, "social_reward", `You earned Mallcoins for ${activity}!`, { activity }, "social");
    }

    res.json({ message: `✅ Task completed! You earned ${task.reward} Mallcoins.` });
  } catch (err) {
    res.status(500).json({ message: "Error completing social task", error: err.message });
  }
});

// Gamification: award points for activities
router.post("/activity", async (req, res) => {
  const { userId, activity } = req.body;
  const user = await User.findById(userId);
  // Example: points per activity
  const pointsMap = { share: 5, invite: 10, review: 3, achievement: 7 };
  const points = pointsMap[activity] || 1;
  user.mallpoints = (user.mallpoints || 0) + points;
  await user.save();
  await sendNotification(userId, "gamification", `You earned ${points} points for ${activity}!`, { activity, points }, "social");
  res.json({ success: true, message: "Points awarded", points });
});

// Badges for referrals
router.post("/referral-badge", async (req, res) => {
  const { userId } = req.body;
  const user = await User.findById(userId);
  if (user.referrals.length >= 10) {
    // Award badge if not already awarded
    const badge = await Badge.findOne({ type: "referral", level: "gold" });
    if (!user.badges.includes(badge._id)) {
      user.badges.push(badge._id);
      await user.save();
      await sendNotification(userId, "badge_awarded", "You earned the Gold Referral badge!", { badge: badge.name }, "social");
      res.json({ success: true, message: "Badge awarded", badge: badge.name });
    } else {
      res.json({ success: false, message: "Badge already awarded" });
    }
  } else {
    res.json({ success: false, message: "Not enough referrals for badge" });
  }
});

// Social feed: post and view activities
router.post("/feed", async (req, res) => {
  const { userId, content, type } = req.body;
  const post = await Feed.create({ user: userId, content, type });
  await sendNotification(userId, "feed_posted", "Your post was added to the social feed.", { postId: post._id }, "social");
  res.json({ success: true, post });
});

router.get("/feed", async (req, res) => {
  const posts = await Feed.find().sort({ createdAt: -1 }).limit(50).populate("user", "username avatar");
  res.json({ success: true, posts });
});

// Add reaction to a feed post
router.post("/feed/:id/reaction", authMiddleware, async (req, res) => {
  const { type } = req.body; // e.g., "like", "love", "wow", "laugh"
  const feed = await Feed.findById(req.params.id).populate("user");
  if (!feed.reactions[type]) feed.reactions[type] = [];
  if (!feed.reactions[type].includes(req.user.userId)) {
    feed.reactions[type].push(req.user.userId);
    await feed.save();
    // Notify post owner
    if (feed.user._id.toString() !== req.user.userId) {
      await sendNotification(
        feed.user._id,
        "feed_reaction",
        `${req.user.username} reacted (${type}) to your post.`,
        { postId: feed._id, reaction: type },
        "social"
      );
    }
    res.json({ success: true, message: "Reaction added" });
  } else {
    res.json({ success: false, message: "Already reacted" });
  }
});

// Remove reaction
router.post("/feed/:id/unreact", authMiddleware, async (req, res) => {
  const { type } = req.body;
  const feed = await Feed.findById(req.params.id);
  feed.reactions[type] = feed.reactions[type].filter(u => u.toString() !== req.user.userId);
  await feed.save();
  res.json({ success: true, message: "Reaction removed" });
});

// Add comment to a feed post
router.post("/feed/:id/comment", authMiddleware, async (req, res) => {
  const { content } = req.body;
  const feed = await Feed.findById(req.params.id).populate("user");
  feed.comments.push({ user: req.user.userId, content });
  await feed.save();
  // Notify post owner
  if (feed.user._id.toString() !== req.user.userId) {
    await sendNotification(
      feed.user._id,
      "feed_comment",
      `${req.user.username} commented on your post.`,
      { postId: feed._id, comment: content },
      "social"
    );
  }
  res.json({ success: true, message: "Comment added", comments: feed.comments });
});

// Get comments for a feed post
router.get("/feed/:id/comments", async (req, res) => {
  const feed = await Feed.findById(req.params.id).populate("comments.user", "username avatar");
  res.json({ success: true, comments: feed.comments });
});

// Trending posts (by reactions + comments in last 24h)
router.get("/feed/trending", async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const posts = await Feed.find({ createdAt: { $gte: since } })
    .lean();
  posts.forEach(post => {
    post.engagement = Object.values(post.reactions || {}).reduce((a, arr) => a + arr.length, 0) + (post.comments ? post.comments.length : 0);
  });
  posts.sort((a, b) => b.engagement - a.engagement);
  res.json({ success: true, posts: posts.slice(0, 10) });
});

// Moderation tools: delete post, delete comment
router.delete("/feed/:id", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.userId);
  const feed = await Feed.findById(req.params.id);
  if (user.isAdmin || feed.user.toString() === req.user.userId) {
    await Feed.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Post deleted" });
  } else {
    res.status(403).json({ success: false, message: "Forbidden" });
  }
});

router.delete("/feed/:postId/comment/:commentId", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.userId);
  const feed = await Feed.findById(req.params.postId);
  const comment = feed.comments.id(req.params.commentId);
  if (user.isAdmin || comment.user.toString() === req.user.userId) {
    comment.remove();
    await feed.save();
    res.json({ success: true, message: "Comment deleted" });
  } else {
    res.status(403).json({ success: false, message: "Forbidden" });
  }
});

module.exports = router;
