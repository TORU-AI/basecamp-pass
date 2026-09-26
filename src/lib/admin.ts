import { createHash } from "node:crypto";
import { cookies } from "next/headers";

// Property manager screen is behind a passcode (ADMIN_PASSCODE). Enough for the demo.
const token = () => createHash("sha256").update(`admin:${process.env.ADMIN_PASSCODE}`).digest("hex");

export async function isAdmin() {
  return Boolean(process.env.ADMIN_PASSCODE) && (await cookies()).get("admin")?.value === token();
}

export async function login(passcode: string) {
  if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) return false;
  (await cookies()).set("admin", token(), { httpOnly: true, sameSite: "lax", path: "/" });
  return true;
}

export const denied = () => Response.json({ error: "Admin passcode required" }, { status: 401 });
