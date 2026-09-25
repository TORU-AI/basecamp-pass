import { cookies } from "next/headers";
import { ensureSchema, sql } from "@/lib/db";

// Guest register for the host: who is allowed in, and every door attempt.
// No names or document data are stored — only which invite a verified person used.
export async function GET() {
  const hostPassId = (await cookies()).get("host_pass")?.value;
  if (!hostPassId) return Response.json({ error: "Host check-in required" }, { status: 401 });
  await ensureSchema();
  const guests = await sql`
    SELECT p.id, p.credential, p.valid_until, i.guest_label
    FROM passes p JOIN invites i ON i.used_by_pass_id = p.id
    WHERE i.host_pass_id = ${hostPassId} ORDER BY p.created_at DESC`;
  const entries = await sql`
    SELECT e.at, e.result, e.reason, i.guest_label, p.role
    FROM entries e
    LEFT JOIN passes p ON p.id = e.pass_id
    LEFT JOIN invites i ON i.used_by_pass_id = p.id
    ORDER BY e.at DESC LIMIT 50`;
  return Response.json({ guests, entries });
}
