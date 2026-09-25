import { ensureSchema, sql } from "@/lib/db";
import { ROOM as DOOR_ROOM } from "@/lib/room";
import { verifyWithWorld } from "@/lib/world";

// Door tablet: the person proves they are a World ID holder; we look up whether
// that same person (nullifier) holds a valid pass for this room right now.
export async function POST(request: Request) {
  const { idkitResponse } = await request.json();
  await ensureSchema();

  let verified;
  try {
    verified = await verifyWithWorld(idkitResponse, `door:${DOOR_ROOM}`);
  } catch (e) {
    await sql`INSERT INTO entries (result, reason) VALUES ('denied', 'Identity proof failed')`;
    return Response.json({ allowed: false, reason: (e as Error).message }, { status: 400 });
  }

  const passes = await sql`SELECT id, role, valid_from, valid_until FROM passes
                           WHERE nullifier = ${verified.nullifier} AND room = ${DOOR_ROOM}
                           ORDER BY valid_until DESC`;
  const now = new Date();
  const valid = passes.find((p) => new Date(p.valid_from) <= now && now <= new Date(p.valid_until));

  let reason: string;
  if (valid) reason = valid.role === "host" ? "Host" : "Invited guest";
  else if (passes.length > 0) reason = "Pass expired";
  else reason = "No pass for this room";

  const allowed = Boolean(valid);
  await sql`INSERT INTO entries (pass_id, nullifier, result, reason)
            VALUES (${valid?.id ?? passes[0]?.id ?? null}, ${verified.nullifier},
                    ${allowed ? "allowed" : "denied"}, ${reason})`;
  return Response.json({ allowed, reason, validUntil: valid?.valid_until ?? null });
}
