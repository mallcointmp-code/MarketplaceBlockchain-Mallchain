#!/usr/bin/env sh
set -eu

# Minimal chain bootstrap for a single validator
CHAIN_ID="localchain"
MONIKER="validator"
BINARY=marketplaced

if [ -d "/data/config" ] && [ -f "/data/config/genesis.json" ]; then
  echo "Genesis already exists, skipping init"
  exit 0
fi

echo "Initializing chain: $CHAIN_ID"

$BINARY init $MONIKER --chain-id $CHAIN_ID

echo "Creating key 'val'"
printf "y\n" | $BINARY keys add val --keyring-backend test

echo "Adding genesis account"
$BINARY add-genesis-account val 1000000000000000000mpstake --keyring-backend test

echo "Creating gentx"
printf "y\n" | $BINARY gentx val 50000000000000000mpstake --chain-id $CHAIN_ID --keyring-backend test

echo "Collecting gentxs"
$BINARY collect-gentxs

echo "Init chain complete"
