#!/bin/bash
echo "🚀 Deploying Mallcoin & Mallpoints..."
npx hardhat run contracts/deploy/deploy.js --network localhost

echo "✅ Deployed. Now granting MINTER_ROLE..."
npx hardhat run contracts/deploy/grantRoles.js --network localhost
