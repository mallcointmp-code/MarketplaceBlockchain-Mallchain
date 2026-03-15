// Simple WhatsApp sender stub. Replace with real provider integration in production.
async function sendWhatsApp(to, message) {
  try {
    console.log("[whatsAppService] sendWhatsApp ->", to, message?.slice?.(0,100));
    return { ok: true };
  } catch (e) {
    console.error('whatsApp send error', e);
    return { ok: false, error: e.message };
  }
}

module.exports = { sendWhatsApp };
