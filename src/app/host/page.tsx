"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VerifyButton from "@/components/VerifyButton";
import InvitePanel from "@/components/InvitePanel";
import { ROOM } from "@/lib/room";

type Pass = { id: string; room: string; credential: string; valid_until: string; nullifier: string };

export default function HostPage() {
  const [pass, setPass] = useState<Pass | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/host").then((r) => r.json()).then((d) => setPass(d.pass));
  }, []);

  async function onVerified(idkitResponse: unknown) {
    const res = await fetch("/api/host", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idkitResponse, room: ROOM }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      throw new Error(data.error);
    }
    setError(null);
    setPass({ id: data.passId, room: data.room, credential: data.credential, valid_until: data.validUntil, nullifier: data.nullifier });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Host check-in</h1>
      {!pass ? (
        <>
          <p className="text-zinc-600 dark:text-zinc-400">
            Prove your passport (or My Number Card) with World ID and a live face check. We never
            see your document — only a proof that it is real and yours.
          </p>
          <VerifyButton label="Verify with World ID" signal={`host:${ROOM}`} requirePresence onVerified={onVerified} />
          {error && <p className="text-red-600">{error}</p>}
        </>
      ) : (
        <>
        <section className="rounded-2xl border p-5">
          <p className="text-sm text-zinc-500">Host pass</p>
          <p className="text-xl font-semibold">{pass.room}</p>
          <p className="mt-2 text-sm">Verified with: {pass.credential}</p>
          <p className="text-sm">Valid until: {new Date(pass.valid_until).toLocaleString()}</p>
          <p className="mt-2 break-all font-mono text-xs text-zinc-500">nullifier 0x{BigInt(pass.nullifier).toString(16)}</p>
          <Link href="/key" className="mt-3 block underline">My digital key →</Link>
        </section>
        <InvitePanel />
        </>
      )}
    </main>
  );
}
