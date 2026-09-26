import { ensureSchema, sql } from "@/lib/db";
import { denied, isAdmin } from "@/lib/admin";
import { holderAddress, issueKey } from "@/lib/chain";
import { ROOM_ID } from "@/lib/room";

// Contract signed → the property manager issues the Ethereum access key to that verified person.
export async function POST(request: Request) {
  if (!(await isAdmin())) return denied();
  const { passId, validFrom, validUntil } = await request.json();
  await ensureSchema();
  const [pass] = await sql`SELECT id, nullifier FROM passes WHERE id = ${passId}`;
  if (!pass) return Response.json({ error: "Unknown person" }, { status: 404 });
  const from = new Date(validFrom);
  const until = new Date(validUntil);
  if (!(until > from)) return Response.json({ error: "Valid until must be after valid from" }, { status: 400 });

  const holder = holderAddress(pass.nullifier);
  try {
    const { tokenId, txHash } = await issueKey(holder, ROOM_ID, from, until);
    await sql`INSERT INTO chain_keys (token_id, pass_id, holder, room_id, tx_hash)
              VALUES (${tokenId}, ${pass.id}, ${holder}, ${ROOM_ID}, ${txHash})`;
    return Response.json({ tokenId, txHash });
  } catch (e) {
    return Response.json({ error: (e as Error).message.split("\n")[0] }, { status: 500 });
  }
}
