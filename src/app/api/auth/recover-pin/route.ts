import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import User from "@/lib/models/User";
import AdminAuth from "@/lib/models/AdminAuth";
import { createSession } from "@/lib/session";
import { ensureLegacyAdminUser } from "@/lib/migration";

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
    await ensureLegacyAdminUser();

    const users = await User.find();
    let targetUser = null;

    for (const u of users) {
      const recHash = u.recoveryCodeHash || (u as any).recovery_code_hash;
      if (recHash && typeof recHash === "string") {
        const match = await bcrypt.compare(recoveryCode, recHash);
        if (match) {
          targetUser = u;
          break;
        }
      }
    }

    if (!targetUser) {
      const admin = await AdminAuth.findOne();
      if (admin && admin.recoveryCodeHash && typeof admin.recoveryCodeHash === "string") {
        const match = await bcrypt.compare(recoveryCode, admin.recoveryCodeHash);
        if (match) {
          admin.pinHash = await bcrypt.hash(newPin, 12);
          const newRecoveryCode = crypto.randomBytes(8).toString("hex").slice(0, 12).toUpperCase();
          admin.recoveryCodeHash = await bcrypt.hash(newRecoveryCode, 12);
          await admin.save();
          await ensureLegacyAdminUser();
          targetUser = await User.findOne();
        }
      }
    }

    if (!targetUser) {
      return NextResponse.json({ error: "Invalid recovery code" }, { status: 401 });
    }

    const newRecoveryCode = crypto.randomBytes(8).toString("hex").slice(0, 12).toUpperCase();
    targetUser.recoveryCodeHash = await bcrypt.hash(newRecoveryCode, 12);
    targetUser.pinHash = await bcrypt.hash(newPin, 12);
    targetUser.failedAttempts = 0;
    targetUser.lockoutUntil = undefined;
    await targetUser.save();

    await createSession(targetUser._id.toString(), targetUser.email, targetUser.name);

    return NextResponse.json({ success: true, newRecoveryCode });
  } catch (error) {
    console.error("recover-pin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
