// Lightweight device fingerprint for anti-fraud header
export function getDeviceFingerprint() {
  try {
    const parts = [navigator.userAgent || '', navigator.platform || '', screen.width + 'x' + screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone || ''];
    const s = parts.join('||');
    // simple DJB2 hash
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    // convert to unsigned hex
    return (h >>> 0).toString(16);
  } catch (e: any) {
    return 'unknown';
  }
}
