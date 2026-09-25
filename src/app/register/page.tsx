"use client";

import { useEffect, useState } from "react";

type Guest = { id: string; credential: string; valid_until: string; guest_label: string };
type Entry = { at: string; result: string; reason: string; guest_label: string | null; role: string | null };

export default function RegisterPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/register")
        .then((r) => r.json())
        .then((d) => (d.error ? setError(d.error) : (setGuests(d.guests), setEntries(d.entries))));
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  if (error) return <main className="mx-auto max-w-2xl px-4 py-10">{error}</main>;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <h1 className="text-2xl font-bold">Guest register</h1>
      <section>
        <h2 className="mb-2 font-semibold">Verified guests</h2>
        <table className="w-full text-left text-sm">
          <thead><tr><th>Guest</th><th>Verified with</th><th>Pass until</th></tr></thead>
          <tbody>
            {guests.map((g) => (
              <tr key={g.id} className="border-t"><td>{g.guest_label}</td><td>{g.credential}</td><td>{new Date(g.valid_until).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Door log</h2>
        <table className="w-full text-left text-sm">
          <thead><tr><th>Time</th><th>Who</th><th>Result</th><th>Reason</th></tr></thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} className="border-t">
                <td>{new Date(e.at).toLocaleTimeString()}</td>
                <td>{e.guest_label ?? (e.role === "host" ? "Host" : "Unknown")}</td>
                <td className={e.result === "allowed" ? "text-green-600" : "text-red-600"}>{e.result}</td>
                <td>{e.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
