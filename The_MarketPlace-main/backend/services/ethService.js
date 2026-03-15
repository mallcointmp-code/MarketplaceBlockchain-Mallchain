// backend/services/ethService.js
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { ethers } = require("ethers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY || null;
const MALLCOIN_ADDRESS = process.env.MALLCOIN_ADDRESS;
const MALLPOINTS_ADDRESS = process.env.MALLPOINTS_ADDRESS;
const MALLCOIN_ABI_PATH = process.env.MALLCOIN_ABI_PATH || path.join(process.cwd(), "artifacts", "contracts", "Mallcoin.sol", "Mallcoin.json");
const MALLPOINTS_ABI_PATH = process.env.MALLPOINTS_ABI_PATH || path.join(process.cwd(), "artifacts", "contracts", "Mallpoints.sol", "Mallpoints.json");
const MALLCOIN_MINT_ENABLED = (process.env.MALLCOIN_MINT_ENABLED || "true").toLowerCase() === "true";
const DEFAULT_DECIMALS = Number(process.env.DEFAULT_DECIMALS || 18);

let provider;
let deployerWallet;
let treasuryWallet = null;
let mallcoinContract;
let mallpointsContract;
let mallcoinAbi;
let mallpointsAbi;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let isMockMode = false;

/**
 * Load ABI from JSON file (Hardhat artifact style) or parse raw ABI array.
 * Accepts path to JSON artifact or a JS array (stringified).
 */
function loadAbi(filePathOrJson) {
  if (!filePathOrJson) throw new Error("ABI path not provided");
  // If it's JSON content already
  try {
    const maybe = JSON.parse(filePathOrJson);
    if (maybe.abi) return maybe.abi;
  } catch {
    // not JSON string, assume file path
  }

  if (fs.existsSync(filePathOrJson)) {
    const content = fs.readFileSync(filePathOrJson, "utf8");
    const json = JSON.parse(content);
    if (json.abi) return json.abi;
    if (Array.isArray(json)) return json;
    throw new Error(`ABI file ${filePathOrJson} does not contain 'abi' or is not a raw ABI array`);
  }

  throw new Error(`ABI path not found: ${filePathOrJson}`);
}

/**
 * Init service: connect to provider, create wallets and contract instances.
 */
async function init() {
  console.log("[ETH] Initializing ethService...");

  if (!DEPLOYER_PRIVATE_KEY) {
    console.warn("[ETH] Warning: DEPLOYER_PRIVATE_KEY not set. Eth service will use dummy wallet.");
  }
  if (!MALLCOIN_ADDRESS || !MALLPOINTS_ADDRESS) {
    console.warn("[ETH] Warning: MALLCOIN/MALLPOINTS addresses missing. Falling back to dummy.");
  }

  provider = new ethers.JsonRpcProvider(RPC_URL);

  // Check connection to prevent server crash
  try {
    const network = await provider.getNetwork();
    console.log(`[ETH] Connected to network: ${network.name} (ChainID: ${network.chainId})`);
  } catch (err) {
    console.error(`[ETH] ❌ FAILED TO CONNECT TO RPC AT ${RPC_URL}. Entering MOCK MODE.`);
    isMockMode = true;
  }

  // Use a dummy key if no private key is provided to prevent crash on dev
  const dummyKey = "0x0123456789012345678901234567890123456789012345678901234567890123";
  const keyToUse = DEPLOYER_PRIVATE_KEY || dummyKey;

  try {
    deployerWallet = new ethers.Wallet(keyToUse, provider);
  } catch (err) {
    console.warn("[ETH] Invalid DEPLOYER_PRIVATE_KEY, using dummy wallet for safe startup.");
    deployerWallet = new ethers.Wallet(dummyKey, provider);
  }

  if (TREASURY_PRIVATE_KEY) {
    try {
      treasuryWallet = new ethers.Wallet(TREASURY_PRIVATE_KEY, provider);
    } catch (err) {
      console.warn("[ETH] Invalid TREASURY_PRIVATE_KEY, treasury features disabled.");
      treasuryWallet = null;
    }
  }

  // Load ABIs with fallback
  const mockAbi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function mint(address, uint256)",
    "function burn(address, uint256)",
    "function transfer(address, uint256) returns (bool)",
    "function approve(address, uint256) returns (bool)",
    "function allowance(address, address) view returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ];

  try {
    mallcoinAbi = loadAbi(MALLCOIN_ABI_PATH);
  } catch (err) {
    console.warn("[ETH] ⚠️ Mallcoin ABI not found. Using MOCK ABI.");
    mallcoinAbi = mockAbi;
  }
  try {
    mallpointsAbi = loadAbi(MALLPOINTS_ABI_PATH);
  } catch (err) {
    console.warn("[ETH] ⚠️ Mallpoints ABI not found. Using MOCK ABI.");
    mallpointsAbi = mockAbi;
  }

  // Contract instances
  const safeMallcoinAddr = MALLCOIN_ADDRESS || "0x0000000000000000000000000000000000000001";
  const safeMallpointsAddr = MALLPOINTS_ADDRESS || "0x0000000000000000000000000000000000000002";

  mallcoinContract = new ethers.Contract(safeMallcoinAddr, mallcoinAbi, deployerWallet);
  mallpointsContract = new ethers.Contract(safeMallpointsAddr, mallpointsAbi, deployerWallet);

  console.log("✅ ethService initialized" + (isMockMode ? " (SIMULATED)" : ""));
  return true;
}

/* ---------------------------
   Helpers: unit conversions
   --------------------------- */
function toTokenUnits(amount, decimals = DEFAULT_DECIMALS) {
  // Accepts string or number; returns BigInt-style as ethers expects
  // ethers.parseUnits handles decimals
  if (typeof amount === "bigint") return amount;
  if (typeof amount === "number" || typeof amount === "string") {
    // allow passing "1000" meaning 1000 tokens (not wei)
    return ethers.parseUnits(String(amount), decimals);
  }
  throw new Error("Invalid amount type for conversion");
}

async function formatTokenUnits(big) {
  return ethers.formatUnits(big, DEFAULT_DECIMALS);
}

/* ---------------------------
   Balance readers
   --------------------------- */
async function getMallpointsBalance(address) {
  if (isMockMode) return "0.0";
  try {
    if (!mallpointsContract) throw new Error("ethService not initialized");
    const bal = await mallpointsContract.balanceOf(address);
    return formatTokenUnits(bal);
  } catch (err) {
    console.warn(`[ETH] getMallpointsBalance failed for ${address}:`, err.message);
    return "0.0";
  }
}

async function getMallcoinBalance(address) {
  if (isMockMode) return "0.0";
  try {
    if (!mallcoinContract) throw new Error("ethService not initialized");
    const bal = await mallcoinContract.balanceOf(address);
    return formatTokenUnits(bal);
  } catch (err) {
    console.warn(`[ETH] getMallcoinBalance failed for ${address}:`, err.message);
    return "0.0";
  }
}

/* ---------------------------
   Mint / Burn / Transfer
   --------------------------- */

/**
 * Mint Mallpoints (MLPTS) to a user address.
 */
async function mintMallpoints(to, amountMlpts) {
  if (isMockMode) {
    console.log(`[ETH] MOCK: Minted ${amountMlpts} MLPTS to ${to}`);
    return { success: true, txHash: "mock_tx_" + Date.now(), isMock: true };
  }
  try {
    if (!mallpointsContract) throw new Error("ethService not initialized");
    const amount = toTokenUnits(amountMlpts);
    const tx = await mallpointsContract.mint(to, amount);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.transactionHash, receipt };
  } catch (err) {
    console.error("[ETH] mintMallpoints error:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Burn Mallpoints from a user's balance.
 */
async function burnMallpoints(from, amountMlpts) {
  if (isMockMode) {
    console.log(`[ETH] MOCK: Burned ${amountMlpts} MLPTS from ${from}`);
    return { success: true, txHash: "mock_tx_" + Date.now(), isMock: true };
  }
  try {
    if (!mallpointsContract) throw new Error("ethService not initialized");
    const amount = toTokenUnits(amountMlpts);
    const tx = await mallpointsContract.burn(from, amount);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.transactionHash, receipt };
  } catch (err) {
    console.error("[ETH] burnMallpoints error:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Mint Mallcoin (MLCNS) to an address.
 */
async function mintMallcoin(to, amountMlcns) {
  if (isMockMode) {
    console.log(`[ETH] MOCK: Minted ${amountMlcns} MLCNS to ${to}`);
    return { success: true, txHash: "mock_tx_" + Date.now(), isMock: true };
  }
  try {
    if (!mallcoinContract) throw new Error("ethService not initialized");
    const amount = toTokenUnits(amountMlcns);
    // Try mint if enabled
    if (MALLCOIN_MINT_ENABLED) {
      try {
        const tx = await mallcoinContract.mint(to, amount);
        const receipt = await tx.wait();
        return { success: true, method: "mint", txHash: receipt.transactionHash, receipt };
      } catch (err) {
        console.warn("[ETH] mintMallcoin (mint) failed, trying fallback:", err.message);
      }
    }

    // Fallback: use treasury wallet to transfer
    if (!treasuryWallet) {
      return { success: false, error: "Treasury wallet not configured and mint not permitted" };
    }
    const mallcoinWithTreasury = new ethers.Contract(MALLCOIN_ADDRESS, mallcoinAbi, treasuryWallet);
    const tx = await mallcoinWithTreasury.transfer(to, amount);
    const receipt = await tx.wait();
    return { success: true, method: "transfer", txHash: receipt.transactionHash, receipt };
  } catch (err) {
    console.error("[ETH] mintMallcoin failed:", err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Transfer Mallcoin using a signer derived from 'fromPrivateKey'.
 */
async function transferMallcoin(fromPrivateKey, to, amountMlcns) {
  if (isMockMode) {
    console.log(`[ETH] MOCK: Transferred ${amountMlcns} MLCNS to ${to}`);
    return { success: true, txHash: "mock_tx_" + Date.now(), isMock: true };
  }
  try {
    if (!fromPrivateKey) throw new Error("fromPrivateKey required");
    const signer = new ethers.Wallet(fromPrivateKey, provider);
    const mallWithSigner = new ethers.Contract(MALLCOIN_ADDRESS, mallcoinAbi, signer);
    const amount = toTokenUnits(amountMlcns);
    const tx = await mallWithSigner.transfer(to, amount);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.transactionHash, receipt };
  } catch (err) {
    console.error("[ETH] transferMallcoin error:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/* ---------------------------
   High-level conversion helper
   --------------------------- */

/**
 * Convert MLPTS -> MLCNS for a user.
 */
async function convertMlptsToMlcns(userAddress, mlptsAmount, rate = 1000) {
  try {
    const mlpts = Number(mlptsAmount);
    if (mlpts <= 0) throw new Error("mlptsAmount must be > 0");
    if (rate <= 0) throw new Error("rate must be > 0");

    // 1) burn MLPTS from user
    const burnResult = await burnMallpoints(userAddress, mlptsAmount);
    if (!burnResult.success) {
      return { success: false, phase: "burn", error: burnResult.error };
    }

    // 2) compute mlcns to mint
    const mlcnsAmountFloat = Number(mlpts) / Number(rate);
    const mlcnsAmountUnits = String(mlcnsAmountFloat);

    // 3) mint or transfer MLCNS to user
    const mintResult = await mintMallcoin(userAddress, mlcnsAmountUnits);
    if (!mintResult.success) {
      return { success: false, phase: "mint", error: mintResult.error };
    }

    return {
      success: true,
      burnTx: burnResult.txHash,
      mintTx: mintResult.txHash,
      mlcnsAmount: mlcnsAmountFloat,
      isMock: isMockMode
    };
  } catch (err) {
    console.error("[ETH] convertMlptsToMlcns error:", err);
    return { success: false, error: err.message };
  }
}

/* ---------------------------
   Optional: event listeners
   --------------------------- */
function listenToEvents() {
  if (!mallpointsContract || !mallcoinContract) throw new Error("ethService not initialized");

  // Mallpoints events
  try {
    mallpointsContract.on("Transfer", (from, to, amount, event) => {
      console.log(`[MLPTS Transfer] ${from} -> ${to} : ${ethers.formatUnits(amount, DEFAULT_DECIMALS)} MLPTS`);
      // add application-level hooks here (e.g., create DB transaction record)
    });

    // Mallcoin events
    mallcoinContract.on("Transfer", (from, to, amount, event) => {
      console.log(`[MLCNS Transfer] ${from} -> ${to} : ${ethers.formatUnits(amount, DEFAULT_DECIMALS)} MLCNS`);
    });

    // Additional event: Mint / Burn for Mallpoints might not be standard events; watching Transfer(0x0,to,amount) acts as mint
    console.log("Listening to token Transfer events for Mallpoints and Mallcoin...");
  } catch (err) {
    console.warn("listenToEvents error:", err.message);
  }
}

/* ---------------------------
   Exported API
   --------------------------- */
const ethService = {
  init,
  provider: () => provider,
  deployerWallet: () => deployerWallet,
  treasuryWallet: () => treasuryWallet,
  mallcoinContract: () => mallcoinContract,
  mallpointsContract: () => mallpointsContract,

  // balances
  getMallpointsBalance,
  getMallcoinBalance,

  // token operations
  mintMallpoints,
  burnMallpoints,
  mintMallcoin,
  transferMallcoin,

  // high level
  convertMlptsToMlcns,

  // listeners
  listenToEvents,
};

module.exports = ethService;
