import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

let ready: Promise<void> | null = null;

// Tables are created on first use so the demo needs no migration step.
export function ensureSchema() {
  ready ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS passes (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,              -- 'host' | 'guest'
      nullifier NUMERIC(78,0) NOT NULL,
      credential TEXT NOT NULL,        -- passport | mnc | selfie ...
      room TEXT NOT NULL,
      valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
      valid_until TIMESTAMPTZ NOT NULL,
      invite_code TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS invites (
      code TEXT PRIMARY KEY,
      host_pass_id TEXT NOT NULL REFERENCES passes(id),
      room TEXT NOT NULL,
      guest_label TEXT NOT NULL,
      stay_until TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_by_pass_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS entries (
      id BIGSERIAL PRIMARY KEY,
      pass_id TEXT,
      nullifier NUMERIC(78,0),
      result TEXT NOT NULL,            -- 'allowed' | 'denied'
      reason TEXT NOT NULL,
      at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  })();
  return ready;
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
