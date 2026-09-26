import { ensureSchema, sql } from "@/lib/db";
import { ROOM as DOOR_ROOM, ROOM_ID } from "@/lib/room";
import { verifyWithWorld } from "@/lib/world";
import { hasValidAccess, holderAddress, keysOf } from "@/lib/chain";
import { unlockDoor } from "@/lib/lock";

// Door tablet. Two separate checks, both required:
//   1. World ID  — who is this person? (nullifier)
//   2. Ethereum — does this person hold a valid access key for this room right now?
// Passing World ID alone never opens the door.
export async function POST(request: Request) {
  const { idkitResponse } = await request.json();
  await ensureSchema();

  let verified;
  try {
    verified = await verifyWithWorld(idkitResponse, `door:${DOOR_ROOM}`);
  } catch (e) {
    await sql`INSERT INTO entries (result, reason) VALUES ('denied', 'Identity proof failed')`;
    return Response.json({ allowed: false, identity: false, reason: "IDENTITY NOT VERIFIED", detail: (e as Error).message }, { status: 400 });
  }

  const holder = holderAddress(verified.nullifier);
  const allowed = await hasValidAccess(holder, ROOM_ID);
  const keys = (await keysOf(holder)).filter((k) => k.roomId === ROOM_ID);
  const active = keys.find((k) => k.status === "ACTIVE");
  const latest = active ?? keys.at(-1);

  let reason: string;
  if (allowed) reason = "ACCESS GRANTED";
  else if (latest?.status === "REVOKED") reason = "ACCESS REVOKED";
  else if (latest?.status === "EXPIRED") reason = "ACCESS EXPIRED";
  else if (latest?.status === "NOT_YET_VALID") reason = "ACCESS NOT YET VALID";
  else reason = "NO VALID ACCESS RIGHT";

  if (allowed) await unlockDoor();

  const [key] = latest ? await sql`SELECT pass_id FROM chain_keys WHERE token_id = ${latest.tokenId}` : [];
  await sql`INSERT INTO entries (pass_id, nullifier, result, reason, holder, token_id)
            VALUES (${key?.pass_id ?? null}, ${verified.nullifier}, ${allowed ? "allowed" : "denied"},
                    ${reason}, ${holder}, ${latest?.tokenId ?? null})`;
  return Response.json({ allowed, identity: true, reason, key: latest ?? null, holder });
}
