const express = require('express');
const router = express.Router();
const adminOnly = require('../middlewares/adminOnly');
const PlatformConfig = require('../models/PlatformConfig');

// Get all config keys under rates
router.get('/rates', adminOnly, async (req, res) => {
  try {
    const docs = await PlatformConfig.find({ key: /^rate:/ }).lean();
    const out = {};
    docs.forEach(d => { out[d.key.replace(/^rate:/, '')] = d.value; });
    res.json({ ok: true, rates: out });
  } catch (e) { res.status(500).json({ error: 'failed' }); }
});

// Set a rate for platform:action -> value (mallpoints per action)
router.post('/rates', adminOnly, async (req, res) => {
  try {
    const { platform, action, value } = req.body;
    if (!platform || !action || typeof value === 'undefined') return res.status(400).json({ error: 'missing' });
    const key = `rate:${platform}:${action}`;
    await PlatformConfig.findOneAndUpdate({ key }, { value }, { upsert: true });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'failed' }); }
});

module.exports = router;
