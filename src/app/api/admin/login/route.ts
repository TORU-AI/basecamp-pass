import { login } from "@/lib/admin";

export async function POST(request: Request) {
  const { passcode } = await request.json();
  return (await login(passcode)) ? Response.json({ ok: true }) : Response.json({ error: "Wrong passcode" }, { status: 401 });
}
