import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import Password from "@/lib/models/Password";
import { verifySession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const authenticated = await verifySession();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await connectDB();

    const cat = await Category.findById(id);
    if (!cat) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (cat.isDefault) {
      return NextResponse.json({ error: "Cannot delete default categories" }, { status: 400 });
    }

    const others = await Category.findOne({ name: "Others", isDefault: true });
    const othersId = others?._id || null;

    if (othersId) {
      await Password.updateMany({ categoryId: id }, { categoryId: othersId });
    }

    await Category.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
