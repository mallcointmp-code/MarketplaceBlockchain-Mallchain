import * as cjs from './ethService.js';
// Re-export commonly used functions as ESM named exports
export const init = cjs.init || cjs.default && cjs.default.init;
export const provider = cjs.provider || (cjs.default && cjs.default.provider);
export const deployerWallet = cjs.deployerWallet || (cjs.default && cjs.default.deployerWallet);
export const treasuryWallet = cjs.treasuryWallet || (cjs.default && cjs.default.treasuryWallet);
export const mintMallcoin = cjs.mintMallcoin || (cjs.default && cjs.default.mintMallcoin);
export const transferMallcoin = cjs.transferMallcoin || (cjs.default && cjs.default.transferMallcoin);
export const getMallcoinBalance = cjs.getMallcoinBalance || (cjs.default && cjs.default.getMallcoinBalance);
export default cjs;
