"use client";

import { useCallback, useEffect, useState } from "react";

type Key = { tokenId: string; roomId: string; validFrom: string; validUntil: string; status: string; txHash: string | null };
type Person = { passId: string; label: string; roles: string[]; credential: string; nullifier: string; verifiedAt: string; holder: string; keys: Key[] };
type Entry = { at: string; result: string; reason: string; holder: string | null; token_id: string | null };
type Data = { people: Person[]; entries: Entry[]; contract: string; explorer: string | null; roomId: string };

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "text-green-600",
  EXPIRED: "text-zinc-500",
  REVOKED: "text-red-600",
  NOT_YET_VALID: "text-amber-600",
};

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function AdminPage() {
  const [data, setData] = useState<Data | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(() => local(new Date()));
  const [until, setUntil] = useState(() => local(new Date(Date.now() + 4 * 86400e3)));

  const load = useCallback(async () => {
    const res = await fetch("/api/admin");
    if (res.status === 401) return setNeedLogin(true);
    setNeedLogin(false);
    setData(await res.json());
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 5000);
    return () => (clearTimeout(first), clearInterval(t));
  }, [load]);

  async function post(path: string, body: unknown, label: string) {
    setBusy(label);
    setError(null);
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json();
    setBusy(null);
    if (!res.ok) setError(d.error);
    load();
  }

  if (needLogin)
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">Property manager</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await post("/api/admin/login", { passcode }, "login");
          }}
          className="flex flex-col gap-3"
        >
          <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Passcode" className="rounded-lg border bg-transparent px-3 py-2" />
          <button className="rounded-lg bg-black px-4 py-2 font-semibold text-white dark:bg-white dark:text-black">Sign in</button>
          {error && <p className="text-red-600">{error}</p>}
        </form>
      </main>
    );
  if (!data) return <main className="p-10">Loading…</main>;

  const tx = (hash: string | null) =>
    hash && data.explorer ? (
      <a href={`${data.explorer}/tx/${hash}`} target="_blank" className="text-blue-600 underline">tx</a>
    ) : null;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold">Property manager · {data.roomId}</h1>
        <p className="text-sm text-zinc-500">
          Access keys live on Ethereum Sepolia ·{" "}
          {data.explorer ? (
            <a href={`${data.explorer}/address/${data.contract}`} target="_blank" className="font-mono underline">{short(data.contract)}</a>
          ) : (
            <span className="font-mono">{data.contract}</span>
          )}
        </p>
      </header>

      <section className="flex flex-wrap items-end gap-3 rounded-2xl border p-4 text-sm">
        <label className="flex flex-col">Valid from<input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border bg-transparent px-2 py-1" /></label>
        <label className="flex flex-col">Valid until<input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className="rounded border bg-transparent px-2 py-1" /></label>
        <p className="text-zinc-500">Window used when you press “Issue key”.</p>
      </section>
      {error && <p className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <section>
        <h2 className="mb-2 font-semibold">People verified with World ID</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="text-zinc-500"><th>Who</th><th>World ID</th><th>Holder</th><th>Digital keys (on chain)</th><th /></tr></thead>
            <tbody>
              {data.people.map((p) => (
                <tr key={p.holder} className="border-t align-top">
                  <td className="py-2">{p.label}<div className="text-xs text-zinc-500">{p.roles.join(", ")}</div></td>
                  <td className="py-2">✓ {p.credential}<div className="font-mono text-xs text-zinc-500">{p.nullifier}</div></td>
                  <td className="py-2 font-mono text-xs">{short(p.holder)}</td>
                  <td className="py-2">
                    {p.keys.length === 0 && <span className="text-zinc-500">No key</span>}
                    {p.keys.map((k) => (
                      <div key={k.tokenId} className="flex flex-wrap items-center gap-2">
                        <span>#{k.tokenId}</span>
                        <span className={STATUS_COLOR[k.status]}>{k.status}</span>
                        <span className="text-xs text-zinc-500">
                          {new Date(k.validFrom).toLocaleString()} → {new Date(k.validUntil).toLocaleString()}
                        </span>
                        {tx(k.txHash)}
                        {(k.status === "ACTIVE" || k.status === "NOT_YET_VALID") && (
                          <button
                            onClick={() => post("/api/admin/revoke", { tokenId: k.tokenId }, `revoke-${k.tokenId}`)}
                            disabled={busy !== null}
                            className="rounded border border-red-600 px-2 text-xs text-red-600 disabled:opacity-50"
                          >
                            {busy === `revoke-${k.tokenId}` ? "Revoking…" : "Revoke"}
                          </button>
                        )}
                      </div>
                    ))}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => post("/api/admin/issue", { passId: p.passId, validFrom: new Date(from), validUntil: new Date(until) }, `issue-${p.holder}`)}
                      disabled={busy !== null}
                      className="whitespace-nowrap rounded-lg bg-black px-3 py-1 text-white disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                      {busy === `issue-${p.holder}` ? "Issuing…" : "Issue key"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Door log</h2>
        <table className="w-full text-left text-sm">
          <thead><tr className="text-zinc-500"><th>Time</th><th>Holder</th><th>Result</th><th>Reason</th></tr></thead>
          <tbody>
            {data.entries.map((e, i) => (
              <tr key={i} className="border-t">
                <td className="py-1">{new Date(e.at).toLocaleString()}</td>
                <td className="py-1 font-mono text-xs">{e.holder ? short(e.holder) : "—"}</td>
                <td className={`py-1 ${e.result === "allowed" ? "text-green-600" : "text-red-600"}`}>{e.result}</td>
                <td className="py-1">{e.reason}{e.token_id ? ` (#${e.token_id})` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
