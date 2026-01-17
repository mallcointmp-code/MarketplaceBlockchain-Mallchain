#!/usr/bin/env sh
set -eu

echo "Waiting for node RPC..."
# wait for RPC to be available
for i in $(seq 1 30); do
  if nc -z localhost 26657; then
    echo "RPC available"
    break
  fi
  sleep 1
done

echo "Querying node status"
marketplaced status --node http://validator:26657 || true

echo "Listing keys"
marketplaced keys list --keyring-backend test || true

echo "CLI runner finished"
