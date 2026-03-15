const webpush = require('web-push');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

let hasVapid = false;
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:your@email.com', VAPID_PUBLIC, VAPID_PRIVATE);
    hasVapid = true;
  } catch (e) {
    console.warn('Failed to set VAPID details for web-push:', e.message);
    const webpush = require('web-push');

    const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

    let hasVapid = false;
    if (VAPID_PUBLIC && VAPID_PRIVATE) {
      try {
        webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:your@email.com', VAPID_PUBLIC, VAPID_PRIVATE);
        hasVapid = true;
      } catch (e) {
        console.warn('Failed to set VAPID details for web-push:', e.message);
        hasVapid = false;
      }
    } else {
      console.warn('VAPID keys not set — push notifications are disabled.');
    }

    async function sendPush(subscription, message) {
      if (!hasVapid) {
        console.warn('sendPush skipped: VAPID not configured');
        return null;
      }
      return webpush.sendNotification(subscription, JSON.stringify({ message }));
    }

    module.exports = sendPush;