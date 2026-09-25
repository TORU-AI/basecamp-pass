import { signRequest } from "@worldcoin/idkit-core/signing";
import { ACTION } from "@/lib/world";

// The RP signing key never leaves the server.
export async function POST() {
  const { sig, nonce, createdAt, expiresAt } = signRequest({
    signingKeyHex: process.env.RP_SIGNING_KEY!,
    action: ACTION,
  });
  return Response.json({ sig, nonce, created_at: createdAt, expires_at: expiresAt });
}
