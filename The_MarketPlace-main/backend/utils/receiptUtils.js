const THEMES = [
  { name: 'green', colorHex: '#10b981' },
  { name: 'blue', colorHex: '#3b82f6' },
  { name: 'yellow', colorHex: '#f59e0b' },
  { name: 'orange', colorHex: '#fb923c' },
  { name: 'slate', colorHex: '#64748b' }
];

function randomTheme() {
  const idx = Math.floor(Math.random() * THEMES.length);
  return THEMES[idx];
}

module.exports = { THEMES, randomTheme };