import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Password from "@/lib/models/Password";
import Category from "@/lib/models/Category";
import { verifySession } from "@/lib/session";
import { encrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

export async function GET() {
  const authenticated = await verifySession();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const allPasswords = await Password.find().lean();
    const allCategories = await Category.find().lean();

    const payload = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: allCategories,
      passwords: allPasswords,
    });

    const encrypted = encrypt(payload);

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
