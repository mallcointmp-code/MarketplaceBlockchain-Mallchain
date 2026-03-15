const Notification = require("../models/Notification");
const User = require("../models/User");
const sendNotification = require("../utils/notify");

// Scheduled reminders
async function processScheduledReminders() {
  const now = new Date();
  const reminders = await Notification.find({
    scheduledAt: { $lte: now },
    read: false,
    category: "reminder"
  });
  for (const notif of reminders) {
    await sendNotification(notif.user, notif.type, notif.message, notif.details, notif.category);
    notif.scheduledAt = null;
    await notif.save();
  }
}

// Digest notifications (daily summary)
async function sendDailyDigests() {
  const users = await User.find();
  for (const user of users) {
    const unread = await Notification.find({
      user: user._id,
      read: false,
      archived: false
    });
    if (unread.length > 0 && user.notificationSettings?.email) {
      const digestMsg = `You have ${unread.length} unread notifications:\n` +
        unread.map(n => `- ${n.message}`).join("\n");
      await sendNotification(user._id, "digest", digestMsg, {}, "system");
    }
  }
}

// Category-based mute (check in notify.js)
function isCategoryMuted(user, category) {
  return user.notificationSettings?.categories?.includes(category) === false;
}

// Priority alerts (send via all channels in notify.js)
async function sendNotificationWithPriority(userId, type, message, details = {}, category = "system", priority = "normal") {
  const notification = await Notification.create({ user: userId, type, message, details, category, priority });
  const user = await User.findById(userId);
  if (isCategoryMuted(user, category)) return notification;
  if (global.io) global.io.to(userId.toString()).emit("notification", notification);
  if (priority === "high") {
    if (user.notificationSettings?.email) await sendEmail(user.email, "High Priority Alert", message);
    if (user.pushSubscription && user.notificationSettings?.push) await sendPush(user.pushSubscription, message);
    if (user.phone && user.notificationSettings?.sms) await sendSMS(user.phone, message);
  } else {
    // Normal priority logic (as before)
  }
  return notification;
}

// Notification templates
const templates = {
  "wallet_transfer": (details) => `You received ${details.amount} Mallcoins from ${details.fromUser}.`,
  "reminder": (details) => `Reminder: ${details.event} is coming up at ${details.time}.`,
  "digest": (details) => details.digestMsg || "You have unread notifications."
};

function getNotificationMessage(type, details) {
  return templates[type] ? templates[type](details) : details.message || "";
}

module.exports = {
  processScheduledReminders,
  sendDailyDigests,
  sendNotificationWithPriority,
  getNotificationMessage
};

const { processScheduledReminders, sendDailyDigests } = require("./services/notificationScheduler");
setInterval(processScheduledReminders, 60 * 1000); // Every minute
setInterval(sendDailyDigests, 24 * 60 * 60 * 1000); // Every day