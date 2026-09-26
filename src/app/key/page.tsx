"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PROPERTY, ROOM_ID, ROOM_NO } from "@/lib/room";

type Key = { tokenId: string; roomId: string; validFrom: string; validUntil: string; status: string };

const fmt = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// What the guest sees: a boarding-pass style key. The chain stays behind the scenes.
export default function KeyPage() {
  const [keys, setKeys] = useState<Key[] | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/key").then((r) => r.json()).then((d) => setKeys(d.keys));
  }, []);

  if (keys === undefined) return <main className="p-10">Loading…</main>;
  if (keys === null)
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 text-center">
        <p>Check in with World ID first.</p>
        <Link href="/host" className="underline">Check in →</Link>
      </main>
    );

  const mine = keys.filter((k) => k.roomId === ROOM_ID).reverse();
  const key = mine.find((k) => k.status === "ACTIVE") ?? mine[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      {key ? (
        <section className={`rounded-3xl p-6 text-white ${key.status === "ACTIVE" ? "bg-zinc-900" : "bg-zinc-500"}`}>
          <p className="text-xs tracking-[0.3em] opacity-70">DIGITAL KEY</p>
          <p className="mt-4 text-sm opacity-70">Property</p>
          <p className="text-xl font-semibold">{PROPERTY}</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div><p className="text-sm opacity-70">Room</p><p className="text-3xl font-bold">{ROOM_NO}</p></div>
            <div><p className="text-sm opacity-70">Status</p><p className="text-xl font-semibold">{key.status.replace(/_/g, " ")}</p></div>
            <div><p className="text-sm opacity-70">Valid from</p><p>{fmt(key.validFrom)}</p></div>
            <div><p className="text-sm opacity-70">Valid until</p><p>{fmt(key.validUntil)}</p></div>
          </div>
          <p className="mt-4 text-xs opacity-60">Only works for you · cannot be transferred</p>
        </section>
      ) : (
        <section className="rounded-3xl border p-6 text-center">
          <p className="text-xs tracking-[0.3em] text-zinc-500">DIGITAL KEY</p>
          <p className="mt-4">No key yet. The property manager issues it after your contract.</p>
        </section>
      )}
      <Link href="/door" className="rounded-xl bg-black px-5 py-4 text-center text-lg font-semibold text-white dark:bg-white dark:text-black">
        UNLOCK
      </Link>
    </main>
  );
}
