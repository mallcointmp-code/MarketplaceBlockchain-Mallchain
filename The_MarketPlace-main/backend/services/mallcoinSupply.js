const mallcoinTotalSupply = 450_000_000;

let referralSupply = 50_000_000;
let socialSupply = 50_000_000;
let sellingSupply = 2500_000_000;
let conversionSupply = 100_000_000;

function getMallcoinSupplies() {
  return {
    total: mallcoinTotalSupply,
    referral: referralSupply,
    social: socialSupply,
    selling: sellingSupply,
    conversion: conversionSupply
  };
}

function useReferralCoins(amount) {
  if (referralSupply < amount) throw new Error("Not enough referral supply");
  referralSupply -= amount;
}

function useSocialCoins(amount) {
  if (socialSupply < amount) throw new Error("Not enough social supply");
  socialSupply -= amount;
}

function useSellingCoins(amount) {
  if (sellingSupply < amount) throw new Error("Not enough selling supply");
  sellingSupply -= amount;
}

function useConversionCoins(amount) {
  if (conversionSupply < amount) throw new Error("Not enough conversion supply");
  conversionSupply -= amount;
}

module.exports = {
  getMallcoinSupplies,
  useReferralCoins,
  useSocialCoins,
  useSellingCoins,
  useConversionCoins
};