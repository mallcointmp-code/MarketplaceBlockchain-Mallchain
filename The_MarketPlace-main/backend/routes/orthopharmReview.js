const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const OrthopharmEmployee = require("../models/OrthopharmEmployee");

// Add a review/rating for an employee
router.post("/employees/:id/review", authMiddleware, async (req, res) => {
  try {
    const { rating, review } = req.body;
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }
    const employee = await OrthopharmEmployee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    employee.reviews.push(review);
    // Update average rating
    employee.rating = ((employee.rating * employee.reviews.length) + rating) / (employee.reviews.length + 1);
    await employee.save();
    res.json({ success: true, employee });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit review" });
  }
});

module.exports = router;