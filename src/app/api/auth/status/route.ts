import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AdminAuth from "@/lib/models/AdminAuth";
import { verifySession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const admin = await AdminAuth.findOne().lean();
    const isSetup = !!admin;
    const isUnlocked = await verifySession();
    const autoLockSeconds = admin?.autoLockSeconds ?? 60;

    return NextResponse.json({ isSetup, isUnlocked, autoLockSeconds });
  } catch (error) {
    console.error("auth status error:", error);
    return NextResponse.json({ isSetup: false, isUnlocked: false, autoLockSeconds: 60 });
  }
}
