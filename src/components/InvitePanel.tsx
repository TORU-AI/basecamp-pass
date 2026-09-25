"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Invite = { code: string; guest_label: string; stay_until: string; stay_ms: string | null; used_by_pass_id: string | null };

const stayText = (ms: number) => (ms < 3600e3 ? `${ms / 60e3} minutes` : ms < 86400e3 * 2 ? "24 hours" : `${ms / 86400e3} days`);

const STAYS = [
  { value: "demo", label: "2 minutes (demo)" },
  { value: "night", label: "Tonight (24h)" },
  { value: "week", label: "1 week" },
];

export default function InvitePanel() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [guestLabel, setGuestLabel] = useState("");
  const [stay, setStay] = useState("demo");
  const [error, setError] = useState<string | null>(null);

  const load = () => fetch("/api/invites").then((r) => r.json()).then((d) => setInvites(d.invites));
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ guestLabel, stay }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setError(null);
    setGuestLabel("");
    load();
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border p-5">
      <h2 className="text-lg font-semibold">Invite a friend</h2>
      <form onSubmit={create} className="flex flex-col gap-3">
        <input
          value={guestLabel}
          onChange={(e) => setGuestLabel(e.target.value)}
          placeholder="Friend's name (for the guest register)"
          className="rounded-lg border bg-transparent px-3 py-2"
          required
        />
        <select value={stay} onChange={(e) => setStay(e.target.value)} className="rounded-lg border bg-transparent px-3 py-2">
          {STAYS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button className="rounded-lg bg-black px-4 py-2 font-semibold text-white dark:bg-white dark:text-black">
          Create invite link
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </form>
      <ul className="flex flex-col gap-2">
        {invites.map((i) => (
          <li key={i.code} className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
            <p className="font-semibold">{i.guest_label}</p>
            <p>{i.stay_ms ? `Stay: ${stayText(Number(i.stay_ms))} from acceptance` : `Stay until ${new Date(i.stay_until).toLocaleString()}`}</p>
            {i.used_by_pass_id ? (
              <p className="text-green-600">✓ Verified and joined</p>
            ) : (
              <Link href={`/join/${i.code}`} className="break-all text-blue-600 underline">
                {typeof window !== "undefined" ? window.location.origin : ""}/join/{i.code}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <Link href="/register" className="text-center text-sm underline">Guest register →</Link>
    </section>
  );
}
