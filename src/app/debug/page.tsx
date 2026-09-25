"use client";

import { useEffect, useState } from "react";
import VerifyButton from "@/components/VerifyButton";

type Row = { role: string; guest_label: string | null; credential: string; nullifier: string; created_at: string };

export default function DebugPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tests, setTests] = useState<{ credential: string; nullifier: string; at: string }[]>([]);

  async function onHuman(idkitResponse: unknown) {
    const res = await fetch("/api/debug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idkitResponse }),
    });
    const d = await res.json();
    setTests((t) => [...t, { credential: d.credential ?? "error", nullifier: d.nullifier ?? d.error, at: new Date().toLocaleTimeString() }]);
  }
  useEffect(() => {
    fetch("/api/debug").then((r) => r.json()).then((d) => setRows(d.passes));
  }, []);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Question for the World team</h1>
      <ol className="list-decimal space-y-1 pl-6">
        <li>Host verified with <b>simulator Identity #4</b> (passport, staging).</li>
        <li>Friend verified with <b>simulator Identity #2</b> (passport, staging) — a different identity.</li>
        <li>Same app, same action <code>basecamp-identity</code>.</li>
      </ol>
      <p className="rounded-xl bg-yellow-100 p-4 text-yellow-900">
        <b>Both got the same nullifier.</b> We expected different nullifiers for different identities.
        <br />Is this because proofs are mocked in staging? How can we test two different people?
      </p>
      <table className="w-full text-left text-sm">
        <thead><tr><th>Time</th><th>Who</th><th>Credential</th><th>Nullifier</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t align-top">
              <td>{new Date(r.created_at).toLocaleTimeString()}</td>
              <td>{r.role === "host" ? "Host (Identity #4)" : `Friend: ${r.guest_label}`}</td>
              <td>{r.credential}</td>
              <td className="break-all font-mono text-xs">0x{BigInt(r.nullifier).toString(16)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <h2 className="font-semibold">Test: Human credential (proof_of_human)</h2>
        <p className="text-sm">Switch the simulator identity, then press again. Each result is added below.</p>
        <VerifyButton label="Verify with Human credential" signal="debug" credentials={["proof_of_human"]} onVerified={onHuman} />
        <table className="w-full text-left text-sm">
          <thead><tr><th>Time</th><th>Credential</th><th>Nullifier</th></tr></thead>
          <tbody>
            {tests.map((t, i) => (
              <tr key={i} className="border-t align-top"><td>{t.at}</td><td>{t.credential}</td><td className="break-all font-mono text-xs">{t.nullifier}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
