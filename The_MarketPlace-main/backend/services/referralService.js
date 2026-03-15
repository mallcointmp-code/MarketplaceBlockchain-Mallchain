// backend/services/referralService.js
const Referral = require("../models/Referral");
const Wallet = require("../models/Wallet");
const Config = require("../models/Config");

const ReferralService = {
  async handleReferralSignup(referrerId, newUserId) {
    const config = await Config.findOne();
    const reward = config?.referralReward || 15;
    const commissionRate = config?.referralCommission || 0.25;

    // Primary reward for direct referral
    await Wallet.findOneAndUpdate(
      { user: referrerId },
      { $inc: { mallcoins: reward } },
      { upsert: true }
    );

    // Quarter reward for grand-referrer
    const referrer = await Referral.findOne({ referredUser: referrerId });
    if (referrer) {
      const quarterReward = reward * commissionRate;
      await Wallet.findOneAndUpdate(
        { user: referrer.referrer },
        { $inc: { mallcoins: quarterReward } }
      );
    }

    await Referral.create({ referrer: referrerId, referredUser: newUserId, reward });
  },
};

module.exports = {
  ReferralService,
};
