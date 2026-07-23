import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Password from "@/lib/models/Password";
import { verifySession } from "@/lib/session";
import { encrypt, decrypt } from "@/lib/encryption";
import type { ICipherField } from "@/lib/models/Password";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authenticated = await verifySession();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await connectDB();

    const row: any = await Password.findById(id).populate("categoryId").lean();

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let decryptedPassword = "";
    let decryptedNotes = "";

    try {
      decryptedPassword = decrypt(row.passwordCipher as ICipherField);
    } catch {
      decryptedPassword = "[decryption error]";
    }

    if (row.notesCipher) {
      try {
        decryptedNotes = decrypt(row.notesCipher as ICipherField);
      } catch {
        decryptedNotes = "[decryption error]";
      }
    }

    return NextResponse.json({
      id: row._id,
      title: row.title,
      username: row.username,
      password: decryptedPassword,
      notes: decryptedNotes,
      categoryId: row.categoryId?._id || null,
      categoryName: row.categoryId?.name || null,
      categoryColor: row.categoryId?.color || null,
      categoryIcon: row.categoryId?.icon || null,
      url: row.url,
      isFavorite: row.isFavorite,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  } catch (error) {
    console.error("GET /api/passwords/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const authenticated = await verifySession();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const { title, username, password, notes, categoryId, url, isFavorite } = body;

    await connectDB();

    const updates: any = { updatedAt: new Date() };

    if (title !== undefined) updates.title = title;
    if (username !== undefined) updates.username = username;
    if (password !== undefined) updates.passwordCipher = encrypt(password);
    if (notes !== undefined) updates.notesCipher = notes ? encrypt(notes) : null;
    if (categoryId !== undefined) updates.categoryId = categoryId || null;
    if (url !== undefined) updates.url = url;
    if (isFavorite !== undefined) updates.isFavorite = isFavorite;

    const result = await Password.findByIdAndUpdate(id, updates, { new: true });

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/passwords/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authenticated = await verifySession();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await connectDB();

    const result = await Password.findByIdAndDelete(id);

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/passwords/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
