const Web3Stats = require("../models/Web3Stats");
const { getMallcoin } = require("./web3Contracts");
const Notification = require("../models/Notification");

async function listenMallcoinEvents() {
  const stats = await Web3Stats.findOne({ key: "mallcoin_last_block" }) || { block: 0 };
  const contract = getMallcoin();
  const startBlock = stats.block || 0;

  contract.on("Transfer", async (from, to, value, event) => {
    // Save notification for recipient
    await Notification.create({
      user: to,
      type: "mallcoin_received",
      details: { from, value: value.toString(), tx: event.transactionHash }
    });

    await Web3Stats.updateOne(
      { key: "mallcoin_last_block" },
      { $set: { block: event.blockNumber } },
      { upsert: true }
    );
  });

  // Optionally, replay missed events from startBlock
  // contract.queryFilter("Transfer", startBlock, "latest").then(events => { ... });
}

module.exports = { listenMallcoinEvents };