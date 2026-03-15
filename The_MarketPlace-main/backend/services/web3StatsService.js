// backend/services/web3StatsService.js
const cron = require("node-cron");
const ethService = require("./ethService");
const Web3Stats = require("../models/Web3Stats");

/**
 * Pulls token metrics directly from blockchain
 * and stores/updates them in MongoDB every hour.
 */
const startWeb3StatsSync = () => {
  console.log("⏳ Starting Web3 stats auto-sync service...");

  // Run every hour (at minute 0)
  cron.schedule("0 * * * *", async () => {
    try {
      await ethService.init();

      const totalSupply = await ethService.getMallcoinTotalSupply();
      const burned = await ethService.getMallcoinBurned();
      const holders = await ethService.getHolderCount();

      const data = { totalSupply, burned, holders, lastUpdated: new Date() };
      await Web3Stats.findOneAndUpdate({}, data, { upsert: true });

      console.log(`✅ Web3 stats synced — Supply: ${totalSupply}, Burned: ${burned}, Holders: ${holders}`);
    } catch (err) {
      console.error("❌ Web3 stats sync failed:", err.message);
    }
  });
};

module.exports = {
  startWeb3StatsSync,
};
