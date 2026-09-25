import { hashSignal } from "@worldcoin/idkit-core/hashing";

export const APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`;
export const RP_ID = process.env.NEXT_PUBLIC_WORLD_RP_ID!;
export const WORLD_ENV = (process.env.NEXT_PUBLIC_WORLD_ENV ?? "staging") as
  | "production"
  | "staging";

// One action for every identity check, so the same person always maps to the
// same nullifier inside Basecamp Pass (host enrollment, guest join, door entry).
export const ACTION = "basecamp-identity";

type ResponseItem = {
  identifier: string;
  signal_hash?: string;
  nullifier?: string;
};

export type Verified = { nullifier: string; credential: string };

// Forward the IDKit result to the Developer Portal, then check what the portal
// does not: environment, the signal we bound into the proof, and the nullifier.
export async function verifyWithWorld(
  idkitResponse: { environment?: string; responses?: ResponseItem[] },
  expectedSignal: string,
): Promise<Verified> {
  const res = await fetch(`https://developer.world.org/api/v4/verify/${RP_ID}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(idkitResponse),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`World verification failed: ${JSON.stringify(body)}`);
  if (idkitResponse.environment !== WORLD_ENV) throw new Error("Wrong World ID environment");

  const item = idkitResponse.responses?.[0];
  if (!item?.nullifier) throw new Error("Proof has no nullifier");
  if (item.signal_hash && BigInt(item.signal_hash) !== BigInt(hashSignal(expectedSignal))) {
    throw new Error("Proof was made for a different request");
  }
  // Store as a decimal string (NUMERIC(78,0)) to avoid hex casing issues.
  return { nullifier: BigInt(item.nullifier).toString(), credential: item.identifier };
}
