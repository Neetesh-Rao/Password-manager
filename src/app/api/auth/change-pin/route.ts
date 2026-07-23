import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import AdminAuth from "@/lib/models/AdminAuth";
import { verifySession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const authenticated = await verifySession();
    if (!authenticated) {
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
    const admin = await AdminAuth.findOne();
    if (!admin) {
      return NextResponse.json({ error: "No admin configured" }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPin, admin.pinHash);
    if (!valid) {
      return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 401 });
    }

    admin.pinHash = await bcrypt.hash(newPin, 12);
    await admin.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("change-pin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
