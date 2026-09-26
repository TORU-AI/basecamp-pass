import { cookies } from "next/headers";
import { ensureSchema, sql } from "@/lib/db";
import { holderAddress, keysOf } from "@/lib/chain";

// The signed-in person's digital keys (host or guest cookie from World ID check-in).
export async function GET() {
  const jar = await cookies();
  const passId = jar.get("guest_pass")?.value ?? jar.get("host_pass")?.value;
  if (!passId) return Response.json({ keys: null });
  await ensureSchema();
  const [pass] = await sql`SELECT nullifier FROM passes WHERE id = ${passId}`;
  if (!pass) return Response.json({ keys: null });
  return Response.json({ keys: await keysOf(holderAddress(pass.nullifier)) });
}
