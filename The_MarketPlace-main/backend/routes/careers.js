const express = require("express");
const Career = require("../models/Career");
const JobListing = require("../models/JobListing");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

 // --- Admin Post a Career ---
 router.post("/create", authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: "Admin only" });

  try {
    const { title, description, location, type, requirements, companyName, about,  contact,} = req.body;
    const career = new Career({
      title,
      description,
      location,
      type,
      requirements,
      companyName,
      about,
      contact,
      postedBy: req.user.userId,
    });
    await career.save();
    res.json({ message: "Career posted successfully", career });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
 });

 // 🧾 Get all company career listings
 router.get("/", async (_req, res) => {
  try {
    const careers = await JobListing.find().sort({ createdAt: -1 });
    res.json(careers);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

 // --- View All Careers ---
 router.get("/", async (req, res) => {
  try {
    const careers = await Career.find().populate("postedBy", "email");
    res.json(careers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
 });

 // --- Apply for a Career ---
 router.post("/apply/:id", authMiddleware, async (req, res) => {
  try {
    const career = await Career.findById(req.params.id);
    if (!career) return res.status(404).json({ error: "Career not found" });

    if (!career.applicants.includes(req.user.userId)) {
      career.applicants.push(req.user.userId);
      await career.save();
    }

    res.json({ message: "Applied successfully", career });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
 });

 router.put("/:id", async (req, res) => {
  try {
    const updated = await JobListing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
 });

module.exports = router;

