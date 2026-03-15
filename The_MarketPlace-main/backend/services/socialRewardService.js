// backend/services/socialRewardService.js
const Wallet = require("../models/Wallet");
const SocialLink = require("../models/SocialLink");
const Config = require("../models/Config");

const rewardedUsers = {}; // temporary memory tracker

const SocialRewardService = {
  async rewardForFollow(userId, platform) {
    const key = `${userId}-${platform}`;
    if (rewardedUsers[key]) throw new Error("Already rewarded for this platform");

    const link = await SocialLink.findOne({ platform });
    if (!link || !link.active) throw new Error("Invalid or inactive platform");

    const config = await Config.findOne();
    const mallcoinToKES = config?.mallcoinToKES || 0.62;
    const mallcoinsFor10KES = 10 / mallcoinToKES; // dynamic conversion (≈ 16.13 MLCNS)

    await Wallet.findOneAndUpdate(
      { user: userId },
      { $inc: { mallcoins: mallcoinsFor10KES } },
      { upsert: true }
    );

    rewardedUsers[key] = true;
    return mallcoinsFor10KES.toFixed(2);
  },
};

module.exports = {
  SocialRewardService,
};
