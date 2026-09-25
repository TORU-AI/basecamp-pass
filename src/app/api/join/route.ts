import { cookies } from "next/headers";
import { ensureSchema, newId, sql } from "@/lib/db";
import { verifyWithWorld } from "@/lib/world";

async function loadInvite(code: string) {
  await ensureSchema();
  const [invite] = await sql`SELECT code, room, guest_label, stay_until, expires_at, used_by_pass_id
                             FROM invites WHERE code = ${code}`;
  if (!invite) return { error: "This invite does not exist." };
  if (invite.used_by_pass_id) return { error: "This invite was already used by someone else." };
  if (new Date(invite.expires_at) < new Date()) return { error: "This invite has expired." };
  return { invite };
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  const { invite, error } = await loadInvite(code);
  if (error) return Response.json({ error }, { status: 410 });
  return Response.json({ invite });
}

// Friend opens the invite and proves a government document. The proof is bound
// to this invite code, so it cannot be replayed on another invite.
export async function POST(request: Request) {
  const { code, idkitResponse } = await request.json();
  const { invite, error } = await loadInvite(code);
  if (error) return Response.json({ error }, { status: 410 });

  let verified;
  try {
    verified = await verifyWithWorld(idkitResponse, `join:${code}`);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  const id = newId("pass");
  await sql`INSERT INTO passes (id, role, nullifier, credential, room, valid_until, invite_code)
            VALUES (${id}, 'guest', ${verified.nullifier}, ${verified.credential}, ${invite!.room},
                    ${invite!.stay_until}, ${code})`;
  // Single use: the pass is tied to this person, the invite cannot be passed on.
  const used = await sql`UPDATE invites SET used_by_pass_id = ${id}
                         WHERE code = ${code} AND used_by_pass_id IS NULL RETURNING code`;
  if (used.length === 0) {
    await sql`DELETE FROM passes WHERE id = ${id}`;
    return Response.json({ error: "This invite was already used by someone else." }, { status: 410 });
  }

  (await cookies()).set("guest_pass", id, { httpOnly: true, sameSite: "lax", path: "/" });
  return Response.json({ passId: id, room: invite!.room, validUntil: invite!.stay_until, credential: verified.credential });
}
