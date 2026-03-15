const hre = require('hardhat');
const dotenv = require('dotenv');

dotenv.config();

const MALLPOINTS_ADDRESS = process.env.MALLPOINTS_ADDRESS;
const BACKEND_MINTER_ADDRESS = process.env.BACKEND_MINTER_ADDRESS; // backend wallet address

async function main() {
  if (!MALLPOINTS_ADDRESS || !BACKEND_MINTER_ADDRESS) {
    throw new Error("Missing MALLPOINTS_ADDRESS or BACKEND_MINTER_ADDRESS in .env");
  }

  const [admin] = await hre.ethers.getSigners();
  console.log(`Granting MINTER_ROLE to ${BACKEND_MINTER_ADDRESS} using ${admin.address}`);

  const Mallpoints = await hre.ethers.getContractFactory("Mallpoints");
  const mallpoints = Mallpoints.attach(MALLPOINTS_ADDRESS);

  const MINTER_ROLE = await mallpoints.MINTER_ROLE();
  const tx = await mallpoints.grantRole(MINTER_ROLE, BACKEND_MINTER_ADDRESS);
  await tx.wait();

  console.log(`✅ Granted MINTER_ROLE to backend: ${BACKEND_MINTER_ADDRESS}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

module.exports = { hre, dotenv, MALLPOINTS_ADDRESS, BACKEND_MINTER_ADDRESS, [admin], Mallpoints, mallpoints, MINTER_ROLE, tx };