import { denied, isAdmin } from "@/lib/admin";
import { revokeKey } from "@/lib/chain";

// Emergency revoke of one access key.
export async function POST(request: Request) {
  if (!(await isAdmin())) return denied();
  const { tokenId } = await request.json();
  try {
    return Response.json(await revokeKey(String(tokenId)));
  } catch (e) {
    return Response.json({ error: (e as Error).message.split("\n")[0] }, { status: 500 });
  }
}
