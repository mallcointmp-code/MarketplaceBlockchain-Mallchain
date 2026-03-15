const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const OrthopharmAppointment = require("../models/OrthopharmAppointment");

// Book an appointment (customer)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { service, date, notes } = req.body;
    const appointment = await OrthopharmAppointment.create({
      customer: req.user._id,
      service,
      date,
      notes
    });
    res.json({ success: true, appointment });
  } catch (err) {
    res.status(500).json({ error: "Booking failed" });
  }
});

// List appointments (admin, employee, or customer)
router.get("/", authMiddleware, async (req, res) => {
  try {
    let query = {};
    if (req.user.isOrthopharmAdmin) {
      // Admin sees all
      query = {};
    } else if (req.user.isOrthopharmEmployee) {
      // Employee sees assigned
      query = { employee: req.user._id };
    } else {
      // Customer sees their own
      query = { customer: req.user._id };
    }
    const appointments = await OrthopharmAppointment.find(query);
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// Update appointment status (admin or assigned employee)
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["pending", "accepted", "rejected", "completed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const appointment = await OrthopharmAppointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    // Granular access control: only admin or assigned employee
    if (
      !(req.user.isOrthopharmAdmin || (appointment.employee && appointment.employee.equals(req.user._id)))
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    appointment.status = status;
    await appointment.save();
    res.json({ success: true, appointment });
  } catch (err) {
    res.status(500).json({ error: "Failed to update appointment status" });
  }
});

// Assign employee to appointment (admin)
router.post("/:id/assign", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isOrthopharmAdmin) return res.status(403).json({ error: "Access denied" });
    const { employeeId } = req.body;
    const appointment = await OrthopharmAppointment.findByIdAndUpdate(
      req.params.id,
      { employee: employeeId, status: "accepted" },
      { new: true }
    );
    res.json({ success: true, appointment });
  } catch (err) {
    res.status(500).json({ error: "Failed to assign employee" });
  }
});

module.exports = router;