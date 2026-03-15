const axios = require("axios");
const MallcoinTrade = require("../models/MallcoinTrade");
let lastCandlestick = { open: 0, close: 0, high: 0, low: 0, trend: "neutral" };

async function fetchMallcoinCandlestick() {
  // Example: Replace with your Mallcoin API endpoint
  const res = await axios.get("https://api.coingecko.com/api/v3/coins/mallcoin/ohlc?vs_currency=usd&days=1");
  const [timestamp, open, high, low, close] = res.data[res.data.length - 1];
  lastCandlestick = { open, close, high, low, trend: close > open ? "bullish" : close < open ? "bearish" : "neutral" };
}

function getMallcoinTrend() {
  return lastCandlestick.trend;
}

function getMallcoinCandlestick() {
  return lastCandlestick;
}

async function getCandlestick(intervalMinutes = 5) {
  const since = new Date(Date.now() - intervalMinutes * 60 * 1000);
  const trades = await MallcoinTrade.find({ timestamp: { $gte: since } }).sort({ timestamp: 1 });

  if (!trades.length) return { open: 0, close: 0, high: 0, low: 0, trend: "neutral" };

  const open = trades[0].price;
  const close = trades[trades.length - 1].price;
  const high = Math.max(...trades.map(t => t.price));
  const low = Math.min(...trades.map(t => t.price));
  const trend = close > open ? "bullish" : close < open ? "bearish" : "neutral";

  return { open, close, high, low, trend };
}

module.exports = { fetchMallcoinCandlestick, getMallcoinTrend, getMallcoinCandlestick, getCandlestick };