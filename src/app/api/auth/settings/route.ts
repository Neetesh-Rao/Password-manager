import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AdminAuth from "@/lib/models/AdminAuth";
import { verifySession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const authenticated = await verifySession();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const admin = await AdminAuth.findOne().lean();
    if (!admin) {
      return NextResponse.json({ error: "Not configured" }, { status: 404 });
    }

    return NextResponse.json({
      autoLockSeconds: admin.autoLockSeconds,
      lastUnlockAt: admin.lastUnlockAt,
      createdAt: admin.createdAt,
    });
  } catch (error) {
    console.error("GET settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authenticated = await verifySession();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { autoLockSeconds } = await request.json();

    if (typeof autoLockSeconds !== "number" || autoLockSeconds < 15) {
      return NextResponse.json({ error: "Invalid auto-lock setting" }, { status: 400 });
    }

    await connectDB();
    const admin = await AdminAuth.findOne();
    if (!admin) {
      return NextResponse.json({ error: "Not configured" }, { status: 404 });
    }

    admin.autoLockSeconds = autoLockSeconds;
    await admin.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
