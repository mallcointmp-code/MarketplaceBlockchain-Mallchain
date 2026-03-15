const { getMallcoin, getMallpoints, withRetry } = require("./web3Contracts");

async function transferMallcoin(fromPrivateKey, toAddress, amount) {
  const provider = getMallcoin().provider;
  const wallet = new ethers.Wallet(fromPrivateKey, provider);
  const contract = getMallcoin().connect(wallet);
  return withRetry(() => contract.transfer(toAddress, amount));
}

async function convertMallpointsToMallcoin(userWallet, amount) {
  const mallpoints = getMallpoints();
  const mallcoin = getMallcoin();
  // Example: call conversion logic on contract
  return withRetry(() => mallpoints.convertToMallcoin(userWallet, amount));
}

async function buyProduct(buyerPrivateKey, sellerAddress, price) {
  // Transfer mallcoin from buyer to seller
  return transferMallcoin(buyerPrivateKey, sellerAddress, price);
}

async function sendMallcoin(fromPrivateKey, toAddress, amount) {
  return transferMallcoin(fromPrivateKey, toAddress, amount);
}

module.exports = {
  transferMallcoin,
  convertMallpointsToMallcoin,
  buyProduct,
  sendMallcoin
};