/**
 * Session management using signed JWT stored in an HTTP-only cookie.
 *
 * - On successful PIN verification a short-lived JWT is created and set
 *   as an HTTP-only, Secure, SameSite=Strict cookie.
 * - All protected API routes call verifySession() which validates the JWT.
 * - The session auto-expires after SESSION_TTL_SECONDS (default 10 min).
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "vault_session";
const SESSION_TTL_SECONDS = 600; // 10 minutes

function getSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET || "default-dev-session-secret-change-me";
  return new TextEncoder().encode(raw);
}

/**
 * Create a session JWT and set it as an HTTP-only cookie.
 */
export async function createSession(): Promise<void> {
  const secret = getSecret();
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * Verify the session cookie. Returns true if valid, false otherwise.
 */
export async function verifySession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    const secret = getSecret();
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear the session cookie (lock the app).
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
