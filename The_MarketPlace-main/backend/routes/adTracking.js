const express = require('express');
const Ad = require('../models/Ad.js');

const router = express.Router();

// increment impression
router.post("/impression/:adId", async (req, res) => {
  try {
    const adId = req.params.adId;
    const a = await Ad.findByIdAndUpdate(adId, { $inc: { impressions: 1 } }, { new: true });
    res.json({ ok: true, ad: a });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed" });
  }
});

// increment click
router.post("/click/:adId", async (req, res) => {
  try {
    const adId = req.params.adId;
    const a = await Ad.findByIdAndUpdate(adId, { $inc: { clicks: 1 } }, { new: true });
    res.json({ ok: true, ad: a });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed" });
  }
});

module.exports = router;
