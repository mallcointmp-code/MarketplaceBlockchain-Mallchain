const { ethers } = require("ethers");
const RETRY_LIMIT = 3;
let _mallcoin, _mallpoints, _provider, _wallet;

function init() {
  if (_provider) return;
  _provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  _wallet = new ethers.Wallet(process.env.ADMIN_PK, _provider);
  const mallcoinAbi = require("../abis/Mallcoin.json");
  const mallpointsAbi = require("../abis/Mallpoints.json");
  _mallcoin = new ethers.Contract(process.env.MALLCOIN_ADDRESS, mallcoinAbi, _wallet);
  _mallpoints = new ethers.Contract(process.env.MALLPOINTS_ADDRESS, mallpointsAbi, _wallet);
}

async function withRetry(fn, ...args) {
  let attempt = 0;
  while (attempt < RETRY_LIMIT) {
    try {
      return await fn(...args);
    } catch (err) {
      attempt++;
      if (attempt >= RETRY_LIMIT) throw err;
      await new Promise(res => setTimeout(res, 500 * attempt));
    }
  }
}

function getMallcoin() { init(); return _mallcoin; }
function getMallpoints() { init(); return _mallpoints; }
function getProvider() { init(); return _provider; }
function getWallet() { init(); return _wallet; }

module.exports = { getMallcoin, getMallpoints, getProvider, getWallet, withRetry };