/**
 * Session management using signed JWT stored in an HTTP-only cookie.
 * Supports multi-user payload (userId, email).
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "vault_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface UserSessionPayload {
  userId: string;
  email: string;
  name?: string;
  isLocked?: boolean;
}

function getSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET || "default-dev-session-secret-change-me";
  return new TextEncoder().encode(raw);
}

/**
 * Create a session JWT containing user payload and set it as an HTTP-only cookie.
 */
export async function createSession(
  userId: string,
  email: string,
  name?: string,
  isLocked: boolean = false
): Promise<void> {
  const secret = getSecret();
  const token = await new SignJWT({
    userId,
    email,
    name: name || email,
    isLocked,
  })
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
 * Get active user session payload if valid.
 */
export async function getSession(): Promise<UserSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);

    if (typeof payload.userId === "string" && typeof payload.email === "string") {
      return {
        userId: payload.userId,
        email: payload.email,
        name: typeof payload.name === "string" ? payload.name : payload.email,
        isLocked: Boolean(payload.isLocked),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Lock session while retaining active user's identity.
 */
export async function lockSession(): Promise<void> {
  const active = await getSession();
  if (active) {
    await createSession(active.userId, active.email, active.name, true);
  }
}

/**
 * Verify the session cookie. Returns true if valid and unlocked.
 */
export async function verifySession(): Promise<boolean> {
  const session = await getSession();
  return session !== null && !session.isLocked;
}

/**
 * Clear the session cookie (full logout).
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
