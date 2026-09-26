// Local end-to-end check of the access rules against anvil, using the same src/lib/chain.ts the app uses.
// Run via scripts/test-local.sh.
import { createTestClient, http, createWalletClient, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { hasValidAccess, holderAddress, issueKey, keysOf, revokeKey, CONTRACT } from "../src/lib/chain";
import AccessKey from "../src/lib/AccessKey.json";
import { createHmac } from "node:crypto";

const ROOM = "STAYWORK-ASAKUSA-101";
const chain = defineChain({ id: 31337, name: "anvil", nativeCurrency: sepolia.nativeCurrency, rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } } });
const test = createTestClient({ chain, mode: "anvil", transport: http() });
let failed = 0;
const check = (name: string, got: unknown, want: unknown) => {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${got})`);
};

async function main() {
const A = holderAddress("111"); // contract holder A (nullifier 111)
const B = holderAddress("222"); // friend B (nullifier 222)
check("A and B map to different holders", A !== B, true);
check("same nullifier → same holder", holderAddress("111"), A);

const now = Date.now();
check("A before issue → denied", await hasValidAccess(A, ROOM), false);
const { tokenId } = await issueKey(A, ROOM, new Date(now - 60e3), new Date(now + 3600e3));
check("A after issue → GRANTED", await hasValidAccess(A, ROOM), true);
check("A other room → denied", await hasValidAccess(A, "STAYWORK-ASAKUSA-102"), false);
check("B (no key) → DENIED", await hasValidAccess(B, ROOM), false);
check("A key status", (await keysOf(A))[0].status, "ACTIVE");

// Soulbound: A tries to transfer the key to B with A's own derived account.
const aWallet = createWalletClient({
  account: privateKeyToAccount(`0x${createHmac("sha256", process.env.HOLDER_SECRET!).update("holder:111").digest("hex")}`),
  chain,
  transport: http(),
});
await test.setBalance({ address: A, value: BigInt(1e18) });
let transferReverted = false;
try {
  await aWallet.writeContract({ address: CONTRACT, abi: AccessKey.abi, functionName: "transferFrom", args: [A, B, BigInt(tokenId)] });
} catch {
  transferReverted = true;
}
check("transfer A → B reverts", transferReverted, true);
check("B still denied after transfer attempt", await hasValidAccess(B, ROOM), false);

// Guest key for B that starts in the future, then time passes.
await issueKey(B, ROOM, new Date(now + 600e3), new Date(now + 1200e3));
check("B key not yet valid → denied", await hasValidAccess(B, ROOM), false);
await test.increaseTime({ seconds: 700 });
await test.mine({ blocks: 1 });
check("B inside window → granted", await hasValidAccess(B, ROOM), true);
await test.increaseTime({ seconds: 3600 });
await test.mine({ blocks: 1 });
check("B after window → EXPIRED denied", await hasValidAccess(B, ROOM), false);
check("B key status", (await keysOf(B))[0].status, "EXPIRED");

// Revoke A's key (A's window also passed, so issue a fresh one first).
const fresh = new Date(Date.now() + 3 * 3600e3); // chain clock is ~1h ahead of wall clock now
const { tokenId: t2 } = await issueKey(A, ROOM, new Date(now), new Date(fresh.getTime() + 3600e3));
check("A fresh key → granted", await hasValidAccess(A, ROOM), true);
await revokeKey(t2);
check("A after revoke → REVOKED denied", await hasValidAccess(A, ROOM), false);

console.log(failed ? `\n${failed} FAILED` : "\nALL PASS");
process.exit(failed ? 1 : 0);
}

main();
