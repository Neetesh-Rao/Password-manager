import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import Password from "@/lib/models/Password";
import { verifySession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const authenticated = await verifySession();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const [categories, passwordCounts] = await Promise.all([
      Category.find().sort({ createdAt: 1 }).lean(),
      Password.aggregate([
        { $group: { _id: "$categoryId", count: { $sum: 1 } } }
      ])
    ]);

    const countMap = passwordCounts.reduce((acc: any, curr: any) => {
      if (curr._id) acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const categoriesWithCounts = categories.map((cat: any) => ({
      id: cat._id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      isDefault: cat.isDefault,
      createdAt: cat.createdAt,
      entryCount: countMap[cat._id.toString()] || 0,
    }));

    return NextResponse.json(categoriesWithCounts);
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authenticated = await verifySession();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, color, icon } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    await connectDB();
    const result = await Category.create({
      name,
      color: color || "#4C8DFF",
      icon: icon || "folder",
      isDefault: false,
    });

    return NextResponse.json({
      id: result._id,
      name: result.name,
      color: result.color,
      icon: result.icon,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
