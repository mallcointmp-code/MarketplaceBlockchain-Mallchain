const { ethers } = require("ethers");
const { getProvider } = require("./web3Contracts");

const marketplaceAbi = require("../abis/Marketplace.json");
const marketplaceAddress = process.env.MARKETPLACE_CONTRACT;

function getMarketplaceContract() {
  return new ethers.Contract(marketplaceAddress, marketplaceAbi, getProvider());
}

async function listProduct(sellerPrivateKey, productId, price) {
  const wallet = new ethers.Wallet(sellerPrivateKey, getProvider());
  const contract = getMarketplaceContract().connect(wallet);
  return contract.listProduct(productId, price);
}

async function buyProduct(buyerPrivateKey, productId) {
  const wallet = new ethers.Wallet(buyerPrivateKey, getProvider());
  const contract = getMarketplaceContract().connect(wallet);
  return contract.buyProduct(productId);
}

module.exports = { listProduct, buyProduct };