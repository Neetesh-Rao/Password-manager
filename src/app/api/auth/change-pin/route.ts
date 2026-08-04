import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/lib/models/User";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPin, newPin } = await request.json();

    if (!currentPin || !newPin) {
      return NextResponse.json({ error: "Both current and new PIN are required" }, { status: 400 });
    }

    if (typeof newPin !== "string" || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      return NextResponse.json({ error: "New PIN must be 4-6 digits" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    const hash = user.pinHash || (user as any).pin_hash;
    if (!hash || typeof hash !== "string") {
      return NextResponse.json({ error: "PIN is not configured for this account" }, { status: 400 });
    }

    const valid = await bcrypt.compare(currentPin, hash);
    if (!valid) {
      return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 401 });
    }

    user.pinHash = await bcrypt.hash(newPin, 12);
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("change-pin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
