"use client";

import { useState } from "react";
import VerifyButton from "@/components/VerifyButton";
import { ROOM } from "@/lib/room";

type Result = { allowed: boolean; reason: string; validUntil: string | null };

// Tablet mounted at the door. Any World ID credential the person enrolled with
// is accepted here; what matters is whether this same person holds a valid pass.
export default function DoorPage() {
  const [result, setResult] = useState<Result | null>(null);

  async function onVerified(idkitResponse: unknown) {
    const res = await fetch("/api/door", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idkitResponse }),
    });
    setResult(await res.json());
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10 text-center">
      <p className="text-sm text-zinc-500">Door</p>
      <h1 className="text-2xl font-bold">{ROOM}</h1>
      {result ? (
        <section
          className={`rounded-2xl p-8 text-white ${result.allowed ? "bg-green-600" : "bg-red-600"}`}
        >
          <p className="text-4xl font-bold">{result.allowed ? "Unlocked" : "Locked"}</p>
          <p className="mt-2">{result.reason}</p>
          {result.validUntil && <p className="text-sm">Pass valid until {new Date(result.validUntil).toLocaleString()}</p>}
        </section>
      ) : (
        <p className="text-zinc-600 dark:text-zinc-400">Prove it&apos;s you to open the door.</p>
      )}
      <VerifyButton
        label={result ? "Try again" : "Open with World ID"}
        signal={`door:${ROOM}`}
        credentials={["passport", "mnc", "selfie"]}
        onVerified={onVerified}
      />
    </main>
  );
}
