#!/usr/bin/env sh
set -eu

BINARY=marketplaced

if [ ! -f /data/config/genesis.json ]; then
  echo "No genesis found — initializing chain"
  /scripts/init-chain.sh
  # tweak config to allow RPC on 0.0.0.0
  if [ -f /data/config/config.toml ]; then
    sed -i 's/^laddr = "tcp:\/\/127.0.0.1:26657"/laddr = "tcp:\/\/0.0.0.0:26657"/' /data/config/config.toml || true
  fi
fi

echo "Starting $BINARY node"
exec $BINARY start --home /data
