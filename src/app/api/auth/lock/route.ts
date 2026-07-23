/**
 * POST /api/auth/lock
 * Clears the session cookie, locking the app.
 */
import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}
