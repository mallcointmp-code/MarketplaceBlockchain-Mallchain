const Notification = require("../models/Notification");
const User = require("../models/User");
const sendNotification = require("../utils/notify");
const sendEmail = require("../utils/email");
const sendPush = require("../utils/push");
const sendSMS = require("../utils/sms");

// In-app notification badge update (emit unread count)
async function emitUnreadCount(userId) {
  const unread = await Notification.countDocuments({ user: userId, read: false, archived: false });
  if (global.io) {
    global.io.to(userId.toString()).emit("unread_count", { unread });
  }
}

// Weekly digest (summary of all categories)
async function sendWeeklyDigest() {
  const users = await User.find();
  for (const user of users) {
    const unread = await Notification.find({
      user: user._id,
      read: false,
      archived: false
    });
    if (unread.length > 0 && user.notificationSettings?.email) {
      const summary = unread.reduce((acc, n) => {
        acc[n.category] = (acc[n.category] || 0) + 1;
        return acc;
      }, {});
      const digestMsg = `Weekly Digest:\n` +
        Object.entries(summary).map(([cat, count]) => `- ${cat}: ${count} notifications`).join("\n");
      await sendEmail(user.email, "Your Weekly Marketplace Digest", digestMsg);
    }
  }
}

// Integration with external services (e.g., Slack, Telegram)
const axios = require("axios");
async function sendToSlack(channel, message) {
  await axios.post(process.env.SLACK_WEBHOOK_URL, { text: `[${channel}] ${message}` });
}

async function sendToTelegram(chatId, message) {
  await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text: message
  });
}

// Use in notification logic
async function sendNotificationWithIntegrations(userId, type, message, details = {}, category = "system", priority = "normal") {
  const notification = await Notification.create({ user: userId, type, message, details, category, priority });
  const user = await User.findById(userId);
  if (global.io) global.io.to(userId.toString()).emit("notification", notification);
  await emitUnreadCount(userId);

  // Priority alerts
  if (priority === "high") {
    if (user.notificationSettings?.email) await sendEmail(user.email, "High Priority Alert", message);
    if (user.pushSubscription && user.notificationSettings?.push) await sendPush(user.pushSubscription, message);
    if (user.phone && user.notificationSettings?.sms) await sendSMS(user.phone, message);
    if (user.notificationSettings?.slackChannel) await sendToSlack(user.notificationSettings.slackChannel, message);
    if (user.notificationSettings?.telegramChatId) await sendToTelegram(user.notificationSettings.telegramChatId, message);
  }
  return notification;
}

module.exports = {
  emitUnreadCount,
  sendWeeklyDigest,
  sendNotificationWithIntegrations,
  sendToSlack,
  sendToTelegram
};