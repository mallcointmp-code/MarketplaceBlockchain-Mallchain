const Notification = require('../models/Notification.js');
const { sendEmail: _sendEmail } = require('../services/emailService.js');
const sendPush = require('./push.js');
const { sendSms: _sendSms } = require('../services/smsService.js');
const sendWhatsApp = require('./whatsapp.js');
const getWhatsAppMessage = require('./whatsappTemplates.js');
const User = require('../models/User.js');

async function sendNotification(userId, type, message, details = {}, category = "system") {
  const notification = await Notification.create({ user: userId, type, message, details, category });
  // Emit real-time notification if Socket.IO is available
  try { global.io?.to(String(userId)).emit("notification", notification); } catch (e) { }

  const user = await User.findById(userId);
  if (!user) return notification;

  // Email
  try { if (user.notificationSettings?.email) await _sendEmail(user.email, "Marketplace Notification", message, `<p>${message}</p>`); } catch (e) { console.warn('notify: sendEmail failed', e && e.message); }
  // Push
  try { if (user.pushSubscription && user.notificationSettings?.push) await sendPush(user.pushSubscription, message); } catch (e) { console.warn('notify: sendPush failed', e && e.message); }
  // SMS
  try { if (user.phone && user.notificationSettings?.sms) await _sendSms(user.phone, message); } catch (e) { console.warn('notify: sendSms failed', e && e.message); }
  // WhatsApp
  try { if (user.notificationSettings?.whatsapp && user.whatsappNumber) { const waMessage = getWhatsAppMessage(type, details) || message; await sendWhatsApp(user.whatsappNumber, waMessage); } } catch (e) { console.warn('notify: sendWhatsApp failed', e && e.message); }

  return notification;
}

module.exports = sendNotification;