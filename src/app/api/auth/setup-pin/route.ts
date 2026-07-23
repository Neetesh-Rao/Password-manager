import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import AdminAuth from "@/lib/models/AdminAuth";
import { seedDefaultCategories } from "@/lib/seed-categories";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== "string" || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be 4-6 digits" }, { status: 400 });
    }

    await connectDB();
    const existing = await AdminAuth.findOne();
    if (existing) {
      return NextResponse.json({ error: "PIN already configured" }, { status: 400 });
    }

    const pinHash = await bcrypt.hash(pin, 12);
    const recoveryCode = crypto.randomBytes(8).toString("hex").slice(0, 12).toUpperCase();
    const recoveryCodeHash = await bcrypt.hash(recoveryCode, 12);

    await AdminAuth.create({
      pinHash,
      recoveryCodeHash,
      autoLockSeconds: 60,
    });

    await seedDefaultCategories();
    await createSession();

    return NextResponse.json({ recoveryCode });
  } catch (error) {
    console.error("setup-pin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
