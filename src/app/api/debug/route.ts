import { ensureSchema, sql } from "@/lib/db";
import { verifyWithWorld } from "@/lib/world";

// Temporary: shows the nullifier each pass was created with, to debug staging behaviour.
export async function GET() {
  await ensureSchema();
  const passes = await sql`
    SELECT p.role, i.guest_label, p.credential, p.nullifier, p.created_at
    FROM passes p LEFT JOIN invites i ON i.used_by_pass_id = p.id
    ORDER BY p.created_at`;
  return Response.json({ passes });
}

// Temporary: verify any credential and return the nullifier without creating a pass.
export async function POST(request: Request) {
  const { idkitResponse } = await request.json();
  try {
    const v = await verifyWithWorld(idkitResponse, "debug");
    return Response.json({ credential: v.credential, nullifier: `0x${BigInt(v.nullifier).toString(16)}` });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
