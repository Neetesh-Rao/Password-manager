import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/lib/models/User";
import AdminAuth from "@/lib/models/AdminAuth";
import { createSession, getSession } from "@/lib/session";
import { migrateOrphanData, ensureLegacyAdminUser } from "@/lib/migration";

export async function POST(request: Request) {
  try {
    const { email, pin } = await request.json();

    if (!pin || typeof pin !== "string") {
      return NextResponse.json({ error: "PIN is required" }, { status: 400 });
    }

    await connectDB();
    await ensureLegacyAdminUser();

    let targetUser = null;
    const session = await getSession();

    let targetEmail = (email && typeof email === "string" && email.trim()) ? email.trim().toLowerCase() : session?.email;

    if (targetEmail) {
      targetUser = await User.findOne({ email: targetEmail });
    } else {
      const users = await User.find().sort({ createdAt: 1 });
      if (users.length === 1) {
        targetUser = users[0];
      } else {
        return NextResponse.json({ error: "Please enter your email to log in." }, { status: 400 });
      }
    }

    if (!targetUser) {
      return NextResponse.json({ error: "User account not found. Please register first." }, { status: 404 });
    }

    if (!targetUser.name || !targetUser.name.trim()) {
      targetUser.name = targetUser.email ? targetUser.email.split("@")[0] : "User";
    }
    if (!targetUser.email || !targetUser.email.trim()) {
      targetUser.email = "user@vault.local";
    }

    if (!targetUser.pinHash && (targetUser as any).pin_hash) {
      targetUser.pinHash = (targetUser as any).pin_hash;
      await targetUser.save();
    }

    if (!targetUser.pinHash || typeof targetUser.pinHash !== "string") {
      const admin = await AdminAuth.findOne();
      if (admin && admin.pinHash && typeof admin.pinHash === "string") {
        targetUser.pinHash = admin.pinHash;
        if (!targetUser.recoveryCodeHash && admin.recoveryCodeHash) {
          targetUser.recoveryCodeHash = admin.recoveryCodeHash;
        }
        await targetUser.save();
      } else {
        return NextResponse.json({ error: "Account error: PIN is not configured." }, { status: 400 });
      }
    }

    if (targetUser.lockoutUntil && new Date() < targetUser.lockoutUntil) {
      const remaining = Math.ceil((targetUser.lockoutUntil.getTime() - Date.now()) / 1000);
      return NextResponse.json({
        error: "Too many failed attempts. Try again later.",
        lockoutSeconds: remaining,
      }, { status: 429 });
    }

    const valid = await bcrypt.compare(pin, targetUser.pinHash);

    if (!valid) {
      targetUser.failedAttempts = (targetUser.failedAttempts || 0) + 1;
      if (targetUser.failedAttempts >= 5) {
        targetUser.lockoutUntil = new Date(Date.now() + 30000);
      }
      await targetUser.save();

      return NextResponse.json({
        error: "Incorrect PIN",
        attemptsRemaining: Math.max(0, 5 - targetUser.failedAttempts),
      }, { status: 401 });
    }

    targetUser.failedAttempts = 0;
    targetUser.lockoutUntil = undefined;
    targetUser.lastUnlockAt = new Date();
    await targetUser.save();

    // Migrate any unassigned passwords to this logged in user
    await migrateOrphanData(targetUser._id.toString());

    await createSession(targetUser._id.toString(), targetUser.email, targetUser.name, false);

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
      },
    });
  } catch (error) {
    console.error("verify-pin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
