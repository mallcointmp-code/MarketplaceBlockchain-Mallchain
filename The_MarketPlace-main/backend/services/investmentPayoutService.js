// backend/services/investmentPayoutService.js
const GrowInvestment = require("../models/GrowInvestment");
const InvestmentParticipation = require("../models/InvestmentParticipation");
const User = require("../models/User");
const { sendNotification } = require("./notificationServices");

/**
 * This function:
 * 1. Finds all active funded investments
 * 2. Calculates ROI for each user based on their investment and ROI%
 * 3. Pays monthly Mallmoney to each user
 * 4. Marks payment progress in participation record
 */

const processMonthlyROI = async () => {
  try {
    console.log("🔄 Processing monthly ROI payouts...");

    // Step 1: Fetch all Funded investments still running
    const activeInvestments = await GrowInvestment.find({ status: "Funded" });

    for (const investment of activeInvestments) {
      // Fetch all users who participated
      const participations = await InvestmentParticipation.find({
        investmentId: investment._id,
        refunded: false,
      });

      for (const part of participations) {
        const user = await User.findById(part.userId);
        if (!user) continue;

        // Step 2: Calculate this month's return
        const monthlyReturn = (part.amountInvested * investment.roiPercent) / 100;

        // Step 3: Pay user
        user.mallmoney += monthlyReturn;
        await user.save();

        // Step 4: Log payout
        part.roiPaid += monthlyReturn;
        await part.save();

        // Step 5: Notify user
        await sendNotification(
          "📈 Monthly ROI Credited",
          `You received ${monthlyReturn.toFixed(
            2
          )} Mallmoney as ROI from "${investment.title}".`,
          "reward",
          user._id,
          "Investments"
        );

        console.log(`✅ ROI paid to ${user.email} for ${investment.title}`);
      }

      // Optional: Close investment if ROI completed
      const monthsPaid =
        participations[0]?.roiPaid /
        ((participations[0]?.amountInvested * investment.roiPercent) / 100);
      if (monthsPaid >= investment.durationMonths) {
        investment.status = "Closed";
        await investment.save();

        await sendNotification(
          "🏁 Investment Completed",
          `"${investment.title}" has completed its ROI period.`,
          "info",
          null,
          "Investments"
        );
      }
    }

    console.log("✅ All ROI payouts processed successfully.");
  } catch (err) {
    console.error("❌ Error processing ROI payouts:", err.message);
  }
};

module.exports = {
  processMonthlyROI,
};
