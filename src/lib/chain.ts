import { createHmac } from "node:crypto";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  hexToString,
  http,
  parseEventLogs,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import AccessKey from "./AccessKey.json";

// Ethereum Sepolia by default. CHAIN_ID=31337 points at a local anvil for testing.
const RPC_URL = process.env.ETH_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const chain =
  process.env.CHAIN_ID === "31337"
    ? defineChain({ id: 31337, name: "anvil", nativeCurrency: sepolia.nativeCurrency, rpcUrls: { default: { http: [RPC_URL] } } })
    : sepolia;

export const CONTRACT = process.env.ACCESS_KEY_ADDRESS as Address;
export const EXPLORER = chain.id === sepolia.id ? "https://sepolia.etherscan.io" : null;
const abi = AccessKey.abi;

const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });

export const STATUS = ["NOT_YET_VALID", "ACTIVE", "EXPIRED", "REVOKED"] as const;
export type KeyStatus = (typeof STATUS)[number];

export type Key = {
  tokenId: string;
  roomId: string;
  validFrom: string; // ISO
  validUntil: string; // ISO
  status: KeyStatus;
};

export const roomIdHex = (roomId: string) => stringToHex(roomId, { size: 32 });

// Each verified person gets a holder address derived from their World ID nullifier and a
// server secret. The user needs no wallet, the same person always maps to the same address,
// and the address cannot be traced back to the nullifier without the secret.
export function holderAddress(nullifier: string): Address {
  const pk = createHmac("sha256", process.env.HOLDER_SECRET!).update(`holder:${nullifier}`).digest("hex");
  return privateKeyToAccount(`0x${pk}`).address;
}

export async function hasValidAccess(holder: Address, roomId: string): Promise<boolean> {
  return (await publicClient.readContract({
    address: CONTRACT,
    abi,
    functionName: "hasValidAccess",
    args: [holder, roomIdHex(roomId)],
  })) as boolean;
}

export async function keysOf(holder: Address): Promise<Key[]> {
  const ids = (await publicClient.readContract({ address: CONTRACT, abi, functionName: "keysOf", args: [holder] })) as bigint[];
  return Promise.all(ids.map(keyById));
}

export async function keyById(tokenId: bigint): Promise<Key> {
  const [access, status] = await Promise.all([
    publicClient.readContract({ address: CONTRACT, abi, functionName: "accessOf", args: [tokenId] }) as Promise<
      [Hex, bigint, bigint, boolean]
    >,
    publicClient.readContract({ address: CONTRACT, abi, functionName: "statusOf", args: [tokenId] }) as Promise<number>,
  ]);
  const [room, from, until] = access;
  return {
    tokenId: tokenId.toString(),
    roomId: hexToString(room, { size: 32 }),
    validFrom: new Date(Number(from) * 1000).toISOString(),
    validUntil: new Date(Number(until) * 1000).toISOString(),
    status: STATUS[status],
  };
}

function issuer() {
  const account = privateKeyToAccount(process.env.ISSUER_PRIVATE_KEY as Hex);
  return createWalletClient({ account, chain, transport: http(RPC_URL) });
}

async function send(functionName: "issue" | "revoke", args: unknown[]) {
  const wallet = issuer();
  const hash = await wallet.writeContract({ address: CONTRACT, abi, functionName, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Transaction failed: ${hash}`);
  return receipt;
}

export async function issueKey(holder: Address, roomId: string, validFrom: Date, validUntil: Date) {
  const receipt = await send("issue", [
    holder,
    roomIdHex(roomId),
    BigInt(Math.floor(validFrom.getTime() / 1000)),
    BigInt(Math.floor(validUntil.getTime() / 1000)),
  ]);
  const [issued] = parseEventLogs({ abi, logs: receipt.logs, eventName: "Issued" }) as unknown as { args: { tokenId: bigint } }[];
  return { tokenId: issued.args.tokenId.toString(), txHash: receipt.transactionHash };
}

export async function revokeKey(tokenId: string) {
  const receipt = await send("revoke", [BigInt(tokenId)]);
  return { txHash: receipt.transactionHash };
}
