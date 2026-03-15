// backend/utils/currency.js
const Config = require("../models/Config");

const CurrencyUtils = {
  async mlptsToMallcoins(mlptsAmount) {
    const config = await Config.findOne();
    const rate = config?.mlptsToMallcoinRate || 1000; // 1000 MLPTS = 1 MLCNS
    return mlptsAmount / rate;
  },

  async mallcoinsToKES(mallcoinAmount) {
    // Use dynamic pricing from mallcoinPrice service
    const mp = require("../services/mallcoinPrice.js");
    const getMallcoinBuyPrice = mp.getMallcoinBuyPrice || (mp.default && mp.default.getMallcoinBuyPrice);
    const rate = getMallcoinBuyPrice ? getMallcoinBuyPrice() : 0.62;
    return mallcoinAmount * rate;
  },

  async kesToMallcoins(kesAmount) {
    // Use dynamic pricing from mallcoinPrice service
    const mp = require("../services/mallcoinPrice.js");
    const getMallcoinBuyPrice = mp.getMallcoinBuyPrice || (mp.default && mp.default.getMallcoinBuyPrice);
    const rate = getMallcoinBuyPrice ? getMallcoinBuyPrice() : 0.62;
    return kesAmount / rate;
  },
};

module.exports = {
  CurrencyUtils,
};
