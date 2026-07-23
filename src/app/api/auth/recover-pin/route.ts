import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import AdminAuth from "@/lib/models/AdminAuth";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { recoveryCode, newPin } = await request.json();

    if (!recoveryCode || !newPin) {
      return NextResponse.json({ error: "Recovery code and new PIN are required" }, { status: 400 });
    }

    if (typeof newPin !== "string" || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      return NextResponse.json({ error: "New PIN must be 4-6 digits" }, { status: 400 });
    }

    await connectDB();
    const admin = await AdminAuth.findOne();
    if (!admin) {
      return NextResponse.json({ error: "No admin configured" }, { status: 404 });
    }

    const valid = await bcrypt.compare(recoveryCode, admin.recoveryCodeHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid recovery code" }, { status: 401 });
    }

    const newRecoveryCode = crypto.randomBytes(8).toString("hex").slice(0, 12).toUpperCase();
    admin.recoveryCodeHash = await bcrypt.hash(newRecoveryCode, 12);
    admin.pinHash = await bcrypt.hash(newPin, 12);
    admin.failedAttempts = 0;
    admin.lockoutUntil = null;
    await admin.save();

    await createSession();

    return NextResponse.json({ success: true, newRecoveryCode });
  } catch (error) {
    console.error("recover-pin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
