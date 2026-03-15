const express = require("express");
const BugReport = require("../models/BugReport");

const router = express.Router();

// 🐛 Submit a bug report
router.post("/", async (req, res) => {
  try {
    const { userId, title, description, severity } = req.body;
    const report = await BugReport.create({
      userId,
      title,
      description,
      severity,
      status: "pending",
    });
    res.status(201).json({ message: "Bug report submitted", report });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 🧾 List all bug reports (Admin)
router.get("/", async (_req, res) => {
  try {
    const list = await BugReport.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ✅ Admin resolves bug
router.put("/:id/resolve", async (req, res) => {
  try {
    const { resolution, reward } = req.body;
    const updated = await BugReport.findByIdAndUpdate(
      req.params.id,
      { status: "resolved", resolution, reward },
      { new: true }
    );
    res.json({ message: "Bug marked as resolved", updated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

