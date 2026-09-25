import { cookies } from "next/headers";
import { ensureSchema, newId, sql } from "@/lib/db";
import { verifyWithWorld } from "@/lib/world";

// Host (contract holder) proves a government document (passport / My Number Card)
// and gets the host pass for the room.
export async function POST(request: Request) {
  const { idkitResponse, room } = await request.json();
  await ensureSchema();

  let verified;
  try {
    verified = await verifyWithWorld(idkitResponse, `host:${room}`);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  const id = newId("pass");
  const until = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30-day stay
  await sql`INSERT INTO passes (id, role, nullifier, credential, room, valid_until)
            VALUES (${id}, 'host', ${verified.nullifier}, ${verified.credential}, ${room}, ${until})`;

  (await cookies()).set("host_pass", id, { httpOnly: true, sameSite: "lax", path: "/" });
  return Response.json({ passId: id, room, validUntil: until, credential: verified.credential });
}

export async function GET() {
  const passId = (await cookies()).get("host_pass")?.value;
  if (!passId) return Response.json({ pass: null });
  await ensureSchema();
  const [pass] = await sql`SELECT id, room, credential, valid_until FROM passes
                           WHERE id = ${passId} AND role = 'host'`;
  return Response.json({ pass: pass ?? null });
}
