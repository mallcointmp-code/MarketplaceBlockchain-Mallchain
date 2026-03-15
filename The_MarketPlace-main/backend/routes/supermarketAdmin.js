const express = require('express');
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const adminOnly = require('../middlewares/adminOnly');
const SupermarketBranch = require('../models/SupermarketBranch');

// GET /api/supermarket/admin/branches
router.get('/branches', authMiddleware, async (req, res) => {
  try {
    const branches = await SupermarketBranch.find().sort({ createdAt: -1 });
    res.json({ branches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load branches' });
  }
});

// POST /api/supermarket/admin/branches
router.post('/branches', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, location, tillNumber } = req.body;
    if (!name) return res.status(400).json({ error: 'Branch name required' });
    const branch = new SupermarketBranch({ name, location, tillNumber, createdBy: req.user._id });
    await branch.save();
    res.status(201).json({ branch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

module.exports = router;
