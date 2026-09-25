"use client";

import { useState } from "react";
import {
  IDKitRequestWidget,
  any,
  CredentialRequest,
  type CredentialType,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit";

const APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`;
const RP_ID = process.env.NEXT_PUBLIC_WORLD_RP_ID!;
const WORLD_ENV = (process.env.NEXT_PUBLIC_WORLD_ENV ?? "staging") as "production" | "staging";

// Government document: passport for travelers, My Number Card for residents.
export const DOCUMENT: CredentialType[] = ["passport", "mnc"];

type Props = {
  label: string;
  signal: string;
  credentials?: CredentialType[];
  requirePresence?: boolean;
  onVerified: (result: IDKitResult) => Promise<void>;
};

export default function VerifyButton({ label, signal, credentials = DOCUMENT, requirePresence, onVerified }: Props) {
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    const sig = await fetch("/api/rp-signature", { method: "POST" }).then((r) => r.json());
    setRpContext({
      rp_id: RP_ID,
      nonce: sig.nonce,
      created_at: sig.created_at,
      expires_at: sig.expires_at,
      signature: sig.sig,
    });
    setOpen(true);
    setBusy(false);
  }

  return (
    <>
      <button
        onClick={start}
        disabled={busy}
        className="w-full rounded-xl bg-black px-5 py-4 text-lg font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {busy ? "Preparing…" : label}
      </button>
      {rpContext && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={APP_ID}
          action="basecamp-identity"
          rp_context={rpContext}
          allow_legacy_proofs={false}
          environment={WORLD_ENV}
          // The staging simulator cannot run a live face check, so presence is only
          // requested in production.
          require_user_presence={requirePresence && WORLD_ENV === "production"}
          // Bind the request context (room / invite code / door) into every credential request.
          constraints={any(...credentials.map((c) => CredentialRequest(c, { signal })))}
          handleVerify={onVerified}
          onSuccess={() => {}}
        />
      )}
    </>
  );
}

