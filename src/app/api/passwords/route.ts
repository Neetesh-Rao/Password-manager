import { NextResponse, NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Password from "@/lib/models/Password";
import Category from "@/lib/models/Category";
import { verifySession } from "@/lib/session";
import { encrypt, decrypt } from "@/lib/encryption";
import type { ICipherField } from "@/lib/models/Password";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authenticated = await verifySession();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get("category");
    const search = searchParams.get("search");

    await connectDB();

    let query: any = {};

    if (categoryId && categoryId !== "all") {
      query.categoryId = categoryId;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const rows = await Password.find(query)
      .populate("categoryId")
      .sort({ updatedAt: -1 })
      .lean();

    const entries = rows.map((row: any) => {
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

      return {
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
      };
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("GET /api/passwords error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authenticated = await verifySession();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, username, password, notes, categoryId, url, isFavorite } = body;

    if (!title || !password) {
      return NextResponse.json({ error: "Title and password are required" }, { status: 400 });
    }

    await connectDB();

    const passwordCipher = encrypt(password);
    const notesCipher = notes ? encrypt(notes) : null;

    const result = await Password.create({
      title,
      username: username || "",
      passwordCipher,
      notesCipher,
      categoryId: categoryId || null,
      url: url || "",
      isFavorite: isFavorite || false,
    });

    return NextResponse.json({ id: result._id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/passwords error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
