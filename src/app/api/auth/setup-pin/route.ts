import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import User from "@/lib/models/User";
import { seedDefaultCategories } from "@/lib/seed-categories";
import { createSession } from "@/lib/session";
import { migrateOrphanData } from "@/lib/migration";

export async function POST(request: Request) {
  try {
    const { pin, name, email } = await request.json();

    if (!pin || typeof pin !== "string" || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be 4-6 digits" }, { status: 400 });
    }

    await connectDB();
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return NextResponse.json({ error: "Accounts already set up. Please register or login." }, { status: 400 });
    }

    const pinHash = await bcrypt.hash(pin, 12);
    const recoveryCode = crypto.randomBytes(8).toString("hex").slice(0, 12).toUpperCase();
    const recoveryCodeHash = await bcrypt.hash(recoveryCode, 12);

    const accountName = (name && typeof name === "string" && name.trim()) ? name.trim() : "Abhishek Raj";
    const accountEmail = (email && typeof email === "string" && email.trim()) ? email.trim().toLowerCase() : "abhishek@vault.local";

    const user = await User.create({
      name: accountName,
      email: accountEmail,
      pinHash,
      recoveryCodeHash,
      autoLockSeconds: 60,
    });

    await migrateOrphanData(user._id.toString());
    await seedDefaultCategories();
    await createSession(user._id.toString(), user.email, user.name);

    return NextResponse.json({ recoveryCode, user: { id: user._id.toString(), name: user.name, email: user.email } });
  } catch (error) {
    console.error("setup-pin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
