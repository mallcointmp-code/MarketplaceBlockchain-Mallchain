let mallcoinBuyPrice = 2.0;
let mallcoinSellPrice = 1.96;
const mallcoinTotalSupply = 450_000_000;
let mallcoinCirculating = 0; // Update this as users buy/sell

function getMallcoinBuyPrice() {
  return mallcoinBuyPrice;
}

function getMallcoinSellPrice() {
  return mallcoinSellPrice;
}

function getMallcoinSupply() {
  return { total: mallcoinTotalSupply, circulating: mallcoinCirculating };
}

// Call this when a user buys Mallcoin
function recordMallcoinBuy(amount) {
  mallcoinCirculating += amount;
  // Example price formula: price increases by 0.000001 per coin bought (reduced sensitivity)
  mallcoinBuyPrice += 0.000001 * amount;
  mallcoinSellPrice = mallcoinBuyPrice - 0.04; // Keep a spread
}

// Call this when a user sells Mallcoin
function recordMallcoinSell(amount) {
  mallcoinCirculating -= amount;
  // Example price formula: price decreases by 0.000001 per coin sold
  mallcoinBuyPrice -= 0.000001 * amount;
  if (mallcoinBuyPrice < 1.0) mallcoinBuyPrice = 1.0; // Floor at 1 KES
  mallcoinSellPrice = mallcoinBuyPrice - 0.04;
}

module.exports = {
  getMallcoinBuyPrice,
  getMallcoinSellPrice,
  getMallcoinSupply,
  recordMallcoinBuy,
  recordMallcoinSell
};