import { cookies } from "next/headers";
import { ensureSchema, sql } from "@/lib/db";

const STAYS: Record<string, number> = {
  demo: 2 * 60 * 1000, // 2 minutes, to show an expired pass during the demo
  night: 24 * 3600 * 1000,
  week: 7 * 24 * 3600 * 1000,
};

// Host invites a friend: who (label for the guest register), and until when.
export async function POST(request: Request) {
  const hostPassId = (await cookies()).get("host_pass")?.value;
  if (!hostPassId) return Response.json({ error: "Host check-in required" }, { status: 401 });
  const { guestLabel, stay } = await request.json();
  if (!guestLabel || !STAYS[stay]) return Response.json({ error: "Invalid invite" }, { status: 400 });

  await ensureSchema();
  const [host] = await sql`SELECT room FROM passes WHERE id = ${hostPassId} AND role = 'host'`;
  if (!host) return Response.json({ error: "Host pass not found" }, { status: 401 });

  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const stayUntil = new Date(Date.now() + STAYS[stay]);
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // invite link lives 24h
  await sql`INSERT INTO invites (code, host_pass_id, room, guest_label, stay_until, expires_at, stay_ms)
            VALUES (${code}, ${hostPassId}, ${host.room}, ${guestLabel}, ${stayUntil}, ${expiresAt}, ${STAYS[stay]})`;
  return Response.json({ code, stayUntil });
}

export async function GET() {
  const hostPassId = (await cookies()).get("host_pass")?.value;
  if (!hostPassId) return Response.json({ invites: [] });
  await ensureSchema();
  const invites = await sql`SELECT code, guest_label, stay_until, expires_at, used_by_pass_id
                            FROM invites WHERE host_pass_id = ${hostPassId} ORDER BY created_at DESC`;
  return Response.json({ invites });
}
