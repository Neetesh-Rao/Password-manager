import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import AdminAuth from "@/lib/models/AdminAuth";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== "string") {
      return NextResponse.json({ error: "PIN is required" }, { status: 400 });
    }

    await connectDB();
    const admin = await AdminAuth.findOne();
    if (!admin) {
      return NextResponse.json({ error: "No PIN configured" }, { status: 404 });
    }

    if (admin.lockoutUntil && new Date() < admin.lockoutUntil) {
      const remaining = Math.ceil((admin.lockoutUntil.getTime() - Date.now()) / 1000);
      return NextResponse.json({
        error: "Too many attempts. Try again later.",
        lockoutSeconds: remaining,
      }, { status: 429 });
    }

    const valid = await bcrypt.compare(pin, admin.pinHash);

    if (!valid) {
      admin.failedAttempts += 1;
      if (admin.failedAttempts >= 5) {
        admin.lockoutUntil = new Date(Date.now() + 30000);
      }
      await admin.save();

      return NextResponse.json({
        error: "Incorrect PIN",
        attemptsRemaining: Math.max(0, 5 - admin.failedAttempts),
      }, { status: 401 });
    }

    admin.failedAttempts = 0;
    admin.lockoutUntil = null;
    admin.lastUnlockAt = new Date();
    await admin.save();

    await createSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("verify-pin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
