"use client";

import { useState } from "react";
import VerifyButton from "@/components/VerifyButton";
import { PROPERTY, ROOM, ROOM_NO } from "@/lib/room";

type Key = { tokenId: string; validUntil: string; status: string };
type Result = { allowed: boolean; identity: boolean; reason: string; key: Key | null };

// Tablet mounted at the door. World ID says who you are; the digital key says whether
// you may enter. Both are shown so the difference is visible.
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
      <p className="text-sm tracking-widest text-zinc-500">{PROPERTY}</p>
      <h1 className="text-3xl font-bold">Room {ROOM_NO}</h1>
      {result ? (
        <>
          <section className={`rounded-2xl p-8 text-white ${result.allowed ? "bg-green-600" : "bg-red-600"}`}>
            <p className="text-3xl font-bold">{result.allowed ? "ACCESS GRANTED" : "ACCESS DENIED"}</p>
            <p className="mt-2 text-xl font-semibold">{result.allowed ? "DOOR UNLOCKED" : result.reason}</p>
            {result.allowed && result.key && (
              <p className="mt-2 text-sm">Key valid until {new Date(result.key.validUntil).toLocaleString()}</p>
            )}
          </section>
          <ul className="rounded-2xl border p-4 text-left text-sm">
            <li>{result.identity ? "✓" : "✗"} Identity (World ID) {result.identity ? "verified" : "not verified"}</li>
            <li>{result.allowed ? "✓" : "✗"} Digital key for Room {ROOM_NO} {result.allowed ? "valid" : result.key ? result.key.status.toLowerCase().replace(/_/g, " ") : "not found"}</li>
          </ul>
        </>
      ) : (
        <p className="text-zinc-600 dark:text-zinc-400">Prove it&apos;s you to open the door.</p>
      )}
      <VerifyButton
        label={result ? "Try again" : "Open with World ID"}
        signal={`door:${ROOM}`}
        onVerified={onVerified}
      />
    </main>
  );
}
