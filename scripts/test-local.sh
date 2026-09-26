#!/bin/bash
# Start anvil, deploy AccessKey, run the access-rule checks, stop anvil.
set -e
cd "$(dirname "$0")/.."
~/.foundry/bin/anvil --silent &
ANVIL=$!
trap "kill $ANVIL" EXIT
sleep 1
export CHAIN_ID=31337 ETH_RPC_URL=http://127.0.0.1:8545
# anvil's well-known dev account #0 (public test key, local only)
export ISSUER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export HOLDER_SECRET=local-test-secret
node scripts/compile.mjs
export ACCESS_KEY_ADDRESS=$(node scripts/deploy.mjs)
echo "contract $ACCESS_KEY_ADDRESS"
npx -y tsx scripts/test-local.ts
