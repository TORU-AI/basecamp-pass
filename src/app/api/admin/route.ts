import { ensureSchema, sql } from "@/lib/db";
import { denied, isAdmin } from "@/lib/admin";
import { CONTRACT, EXPLORER, holderAddress, keysOf } from "@/lib/chain";
import { ROOM_ID } from "@/lib/room";

// Everyone who verified with World ID, their digital keys (read from Ethereum), and the door log.
export async function GET() {
  if (!(await isAdmin())) return denied();
  await ensureSchema();
  const passes = await sql`
    SELECT p.id, p.role, p.credential, p.nullifier, p.created_at, i.guest_label
    FROM passes p LEFT JOIN invites i ON i.used_by_pass_id = p.id
    ORDER BY p.created_at DESC LIMIT 30`;
  const txs = await sql`SELECT token_id, tx_hash FROM chain_keys`;
  const txOf = Object.fromEntries(txs.map((t) => [t.token_id, t.tx_hash]));

  // One holder per person; several passes can belong to the same person.
  const people = new Map<string, { holder: string; nullifier: string; passes: typeof passes }>();
  for (const p of passes) {
    const holder = holderAddress(p.nullifier);
    if (!people.has(holder)) people.set(holder, { holder, nullifier: p.nullifier, passes: [] });
    people.get(holder)!.passes.push(p);
  }
  const rows = await Promise.all(
    [...people.values()].map(async (person) => {
      const latest = person.passes[0];
      const keys = (await keysOf(person.holder as `0x${string}`)).map((k) => ({ ...k, txHash: txOf[k.tokenId] ?? null }));
      return {
        passId: latest.id,
        label: person.passes.map((p) => (p.role === "host" ? "Host" : p.guest_label)).find(Boolean) ?? "—",
        roles: [...new Set(person.passes.map((p) => p.role))],
        credential: latest.credential,
        nullifier: `0x${BigInt(person.nullifier).toString(16).slice(0, 10)}…`,
        verifiedAt: latest.created_at,
        holder: person.holder,
        keys,
      };
    }),
  );

  const entries = await sql`SELECT at, result, reason, holder, token_id FROM entries ORDER BY at DESC LIMIT 30`;
  return Response.json({ people: rows, entries, contract: CONTRACT, explorer: EXPLORER, roomId: ROOM_ID });
}
