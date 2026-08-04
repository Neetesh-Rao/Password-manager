import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import Password from "@/lib/models/Password";
import { getSession } from "@/lib/session";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const [categories, passwordCounts] = await Promise.all([
      Category.find({
        $or: [{ isDefault: true }, { userId: session.userId }],
      }).sort({ createdAt: 1 }).lean(),
      Password.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: "$categoryId", count: { $sum: 1 } } }
      ])
    ]);

    const countMap = passwordCounts.reduce((acc: any, curr: any) => {
      if (curr._id) acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const categoriesWithCounts = categories.map((cat: any) => ({
      id: cat._id.toString(),
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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, color, icon } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    await connectDB();
    const result = await Category.create({
      userId: session.userId,
      name,
      color: color || "#4C8DFF",
      icon: icon || "folder",
      isDefault: false,
    });

    return NextResponse.json({
      id: result._id.toString(),
      name: result.name,
      color: result.color,
      icon: result.icon,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
