const express = require('express');
const path = require('path');
const { pathToFileURL } = require('url');

const placeholder = express.Router();
(async () => {
  try {
    const mod = await import(pathToFileURL(path.resolve(__dirname, './adWallet.js')).href);
    const r = mod && (mod.default || mod.router || mod);
    if (r && (typeof r === 'function' || r.handle)) placeholder.use(r);
  } catch (e) { console.error('[shim] adWallet import failed', e && e.message); }
})();

module.exports = placeholder;
