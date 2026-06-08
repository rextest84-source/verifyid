import * as jose from "jose";
import { env } from "./lib/env";

export const AdminComposeSession = {
  cookieName: "verifyid_admin",
  maxAgeSec: 7 * 24 * 60 * 60,
} as const;

function getSecret(): Uint8Array | null {
  const raw = env.adminComposeSecret || env.appSecret;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export async function signAdminComposeToken(): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;

  return new jose.SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${AdminComposeSession.maxAgeSec}s`)
    .sign(secret);
}

export async function verifyAdminComposeToken(token: string): Promise<boolean> {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;

  try {
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ["HS256"] });
    return payload.admin === true;
  } catch {
    return false;
  }
}
