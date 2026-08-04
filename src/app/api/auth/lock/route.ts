/**
 * POST /api/auth/lock
 * Clears the session cookie, locking the app.
 */
import { NextResponse } from "next/server";
import { lockSession } from "@/lib/session";

export async function POST() {
  await lockSession();
  return NextResponse.json({ success: true });
}
