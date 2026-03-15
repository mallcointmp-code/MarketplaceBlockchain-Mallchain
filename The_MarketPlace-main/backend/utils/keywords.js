function extractKeywords(text) {
  if (!text) return [];
  const stop = new Set(['the','and','a','an','of','in','on','for','with','to','is','it','by','from','at','as','or']);
  const words = text.toString().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const filtered = words.filter(w => w.length > 2 && !stop.has(w));
  const uniq = [...new Set(filtered)];
  return uniq.slice(0, 10);
}

module.exports = extractKeywords;
