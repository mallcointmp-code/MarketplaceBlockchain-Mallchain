// backend/routes/grow.js
const express = require("express");
const GrowInvestment = require("../models/GrowInvestment");
const InvestmentParticipation = require("../models/InvestmentParticipation");
const authMiddleware = require("../middlewares/authMiddleware");
const { sendNotification } = require("../services/notificationServices");
const { processMonthlyROI } = require("../services/investmentPayoutService");
const router = express.Router();

/**
 * ADMIN  Creates a new investment project
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.email !== "avastaian36@gmail.com")
      return res.status(403).json({ message: "Unauthorized" });

    const newInvestment = await GrowInvestment.create(req.body);

    await sendNotification(
      " New Investment Opportunity",
      `A new Grow project "${newInvestment.title}" is now open for funding.`,
      "system",
      null,
      "Investments"
    );

    res.json({ message: "Investment created successfully", newInvestment });
  } catch (err) {
    res.status(500).json({ message: "Failed to create investment", error: err.message });
  }
});

/**
 *  USER: View all active investments
 */
router.get("/active", async (req, res) => {
  try {
    const active = await GrowInvestment.find({ status: "Active" });
    res.json(active);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch investments", error: err.message });
  }
});

/**
 *  USER: Join an investment
 */
router.post("/:id/join", authMiddleware, async (req, res) => {
  try {
    const investment = await GrowInvestment.findById(req.params.id);
    if (!investment) return res.status(404).json({ message: "Investment not found" });

    if (investment.status !== "Active")
      return res.status(400).json({ message: "Investment is not open" });

    const { slots } = req.body;
    const totalAmount = slots * investment.slotPrice;

    // Check availability
    if (investment.slotsTaken + slots > investment.totalSlots)
      return res.status(400).json({ message: "Not enough slots left" });

    // Check wallet balance (Mallmoney)
    if (req.user.mallmoney < totalAmount)
      return res.status(400).json({ message: "Insufficient Mallmoney balance" });

    // Deduct from wallet
    req.user.mallmoney -= totalAmount;
    await req.user.save();

    // Create participation
    const expectedReturn = totalAmount * (investment.roiPercent / 100) * investment.durationMonths;
    const join = await InvestmentParticipation.create({
      investmentId: investment._id,
      userId: req.user.id,
      slotsBought: slots,
      amountInvested: totalAmount,
      expectedReturn,
    });
    // ADMIN: Trigger ROI payout manually
router.post("/payouts/run", authMiddleware, async (req, res) => {
  try {
    if (req.user.email !== "avastaian36@gmail.com")
      return res.status(403).json({ message: "Unauthorized" });

    await processMonthlyROI();

    res.json({ message: "Monthly ROI payouts processed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to process ROI payouts", error: err.message });
  }
});


    investment.slotsTaken += slots;
    investment.raisedAmount += totalAmount;
    await investment.save();

    await sendNotification(
      " Investment Confirmed",
      `You invested ${totalAmount} Mallmoney in "${investment.title}".`,
      "reward",
      req.user._id,
      "Investments"
    );

    res.json({ message: "Investment successful", join });
  } catch (err) {
    res.status(500).json({ message: "Failed to join investment", error: err.message });
  }
});

/**
 *  ADMIN: Close and check funding status
 */
router.post("/:id/close", authMiddleware, async (req, res) => {
  try {
    if (req.user.email !== "avastaian36@gmail.com")
      return res.status(403).json({ message: "Unauthorized" });

    const investment = await GrowInvestment.findById(req.params.id);
    if (!investment) return res.status(404).json({ message: "Investment not found" });

    if (investment.raisedAmount >= investment.totalGoal) {
      investment.status = "Funded";
      await sendNotification(
        " Investment Funded",
        `"${investment.title}" reached its goal and is now active for payouts.`,
        "system",
        null,
        "Investments"
      );
    } else {
      investment.status = "Failed";

      const participations = await InvestmentParticipation.find({
        investmentId: investment._id,
        refunded: false,
      });

      // Refund all
      for (const part of participations) {
        const user = await User.findById(part.userId);
        if (user) {
          user.mallmoney += part.amountInvested;
          await user.save();
        }
        part.refunded = true;
        await part.save();

        await sendNotification(
          " Investment Refunded",
          `Your contribution to "${investment.title}" was refunded (goal not met).`,
          "info",
          part.userId,
          "Investments"
        );
      }
    }

    await investment.save();
    res.json({ message: `Investment marked as ${investment.status}` });
  } catch (err) {
    res.status(500).json({ message: "Failed to close investment", error: err.message });
  }
});

module.exports = router;
