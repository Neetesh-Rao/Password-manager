import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/lib/models/User";
import { createSession } from "@/lib/session";
import { migrateOrphanData } from "@/lib/migration";

export async function POST(request: Request) {
  try {
    const { name, email, pin, recoveryCode } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid Email is required" }, { status: 400 });
    }

    if (!pin || typeof pin !== "string" || pin.length < 4) {
      return NextResponse.json({ error: "PIN must be at least 4 digits" }, { status: 400 });
    }

    await connectDB();

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    const pinHash = await bcrypt.hash(pin, 12);
    let recoveryCodeHash = "";
    if (recoveryCode) {
      recoveryCodeHash = await bcrypt.hash(recoveryCode, 12);
    }

    const totalUsers = await User.countDocuments();

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      pinHash,
      recoveryCodeHash,
    });

    // If this is the very first user created, migrate any existing orphan passwords to this user!
    if (totalUsers === 0) {
      await migrateOrphanData(newUser._id.toString());
    }

    await createSession(newUser._id.toString(), newUser.email, newUser.name);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
