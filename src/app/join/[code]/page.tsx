"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import VerifyButton from "@/components/VerifyButton";

type Invite = { room: string; guest_label: string; stay_until: string; stay_ms: string | null };
type Pass = { room: string; validUntil: string; credential: string; nullifier: string };

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [pass, setPass] = useState<Pass | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/join?code=${code}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setInvite(d.invite)));
  }, [code]);

  async function onVerified(idkitResponse: unknown) {
    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, idkitResponse }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      throw new Error(data.error);
    }
    setPass(data);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">You&apos;re invited</h1>
      {pass ? (
        <section className="rounded-2xl border border-green-600 p-5">
          <p className="text-sm text-zinc-500">Guest pass · only works for you</p>
          <p className="text-xl font-semibold">{pass.room}</p>
          <p className="mt-2 text-sm">Verified with: {pass.credential}</p>
          <p className="text-sm">Valid until: {new Date(pass.validUntil).toLocaleString()}</p>
          <p className="mt-2 break-all font-mono text-xs text-zinc-500">nullifier 0x{BigInt(pass.nullifier).toString(16)}</p>
          <Link href="/key" className="mt-4 block text-center underline">Open my digital key →</Link>
        </section>
      ) : error ? (
        <p className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      ) : invite ? (
        <>
          <section className="rounded-2xl border p-5">
            <p className="text-sm text-zinc-500">For {invite.guest_label}</p>
            <p className="text-xl font-semibold">{invite.room}</p>
            <p className="text-sm">
              {invite.stay_ms
                ? `Stay: ${Number(invite.stay_ms) / 60e3} minutes from when you accept`
                : `Stay until ${new Date(invite.stay_until).toLocaleString()}`}
            </p>
          </section>
          <p className="text-zinc-600 dark:text-zinc-400">
            The host only lets in people who prove a real passport or My Number Card. Your document
            data stays on your phone.
          </p>
          <VerifyButton label="Verify and accept invite" signal={`join:${code}`} onVerified={onVerified} />
        </>
      ) : (
        <p>Loading…</p>
      )}
    </main>
  );
}
