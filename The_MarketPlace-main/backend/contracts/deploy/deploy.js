// contracts/deploy/deploy.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  const Mallcoin = await hre.ethers.getContractFactory("Mallcoin");
  const mallcoin = await Mallcoin.deploy();
  await mallcoin.waitForDeployment();

  const Mallpoints = await hre.ethers.getContractFactory("Mallpoints");
  const mallpoints = await Mallpoints.deploy();
  await mallpoints.waitForDeployment();

  console.log("✅ Mallcoin deployed to:", await mallcoin.getAddress());
  console.log("✅ Mallpoints deployed to:", await mallpoints.getAddress());

  // Add deployer as minter
  await mallcoin.addMinter(deployer.address);
  console.log("Deployer added as Minter");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
