# Contracts Test Instructions

1. Install dependencies:
   npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers @openzeppelin/contracts chai mocha @nomicfoundation/hardhat-toolbox

2. Run tests (Hardhat network):
   npx hardhat test

3. Deploy to Hardhat local node:
   npx hardhat node
   npx hardhat run contracts/deploy/deploy.js --network localhost
