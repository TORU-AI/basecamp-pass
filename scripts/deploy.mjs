// Deploy AccessKey. Env: ISSUER_PRIVATE_KEY, ETH_RPC_URL (default Sepolia), CHAIN_ID (31337 for anvil).
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const { abi, bytecode } = JSON.parse(readFileSync("src/lib/AccessKey.json", "utf8"));
const rpc = process.env.ETH_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const chain =
  process.env.CHAIN_ID === "31337"
    ? defineChain({ id: 31337, name: "anvil", nativeCurrency: sepolia.nativeCurrency, rpcUrls: { default: { http: [rpc] } } })
    : sepolia;

const account = privateKeyToAccount(process.env.ISSUER_PRIVATE_KEY);
const wallet = createWalletClient({ account, chain, transport: http(rpc) });
const client = createPublicClient({ chain, transport: http(rpc) });

const hash = await wallet.deployContract({ abi, bytecode });
console.error(`deploy tx ${hash} on ${chain.name}…`);
const receipt = await client.waitForTransactionReceipt({ hash });
console.log(receipt.contractAddress);
