import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/lib/models/User";
import AdminAuth from "@/lib/models/AdminAuth";
import { getSession } from "@/lib/session";
import { ensureLegacyAdminUser } from "@/lib/migration";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    await ensureLegacyAdminUser();

    const userCount = await User.countDocuments();
    const legacyAdmin = await AdminAuth.findOne().lean();

    const isSetup = userCount > 0 || !!legacyAdmin;
    const session = await getSession();
    const isUnlocked = session !== null && !session.isLocked;

    let activeUser = null;
    let autoLockSeconds = 60;

    if (session) {
      const u = await User.findById(session.userId, "name email autoLockSeconds").lean();
      if (u) {
        activeUser = { id: (u as any)._id.toString(), name: (u as any).name, email: (u as any).email };
        autoLockSeconds = (u as any).autoLockSeconds ?? 60;
      } else {
        activeUser = { id: session.userId, name: session.name || session.email, email: session.email };
      }
    }

    return NextResponse.json({
      isSetup,
      isUnlocked,
      autoLockSeconds,
      user: activeUser,
    });
  } catch (error) {
    console.error("auth status error:", error);
    return NextResponse.json({
      isSetup: false,
      isUnlocked: false,
      autoLockSeconds: 60,
      user: null,
    });
  }
}
