import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Password from "@/lib/models/Password";
import Category from "@/lib/models/Category";
import { getSession } from "@/lib/session";
import { encrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const userPasswords = await Password.find({ userId: session.userId }).lean();
    const userCategories = await Category.find({
      $or: [{ isDefault: true }, { userId: session.userId }],
    }).lean();

    const payload = JSON.stringify({
      version: 1,
      user: session.email,
      exportedAt: new Date().toISOString(),
      categories: userCategories,
      passwords: userPasswords,
    });

    const encrypted = encrypt(payload, session.userId);

    const response = new NextResponse(JSON.stringify(encrypted), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="vault-backup-${Date.now()}.json"`,
      },
    });

    return response;
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
