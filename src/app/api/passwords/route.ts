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
        { title: { $regex: search, $options: "i" } }
      ];
    }

    const [rows, categories] = await Promise.all([
      Password.find(query).sort({ updatedAt: -1 }).lean(),
      Category.find().lean()
    ]);

    const categoryMap = new Map();
    categories.forEach((cat: any) => {
      categoryMap.set(cat._id.toString(), cat);
    });

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

      const decryptedCustomFields = Array.isArray(row.customFields)
        ? row.customFields.map((field: any) => {
            let decryptedValue = "";
            try {
              decryptedValue = decrypt(field.valueCipher as ICipherField);
            } catch {
              decryptedValue = "[decryption error]";
            }
            return { id: field._id?.toString() || Math.random().toString(), label: field.label, value: decryptedValue };
          })
        : [];

        const catId = row.categoryId?.toString();
        const category = catId ? categoryMap.get(catId) : null;

        return {
          id: row._id,
          title: row.title,
          password: decryptedPassword,
          notes: decryptedNotes,
          categoryId: catId || null,
          categoryName: category?.name || null,
          categoryColor: category?.color || null,
          categoryIcon: category?.icon || null,
        url: row.url,
        customFields: decryptedCustomFields,
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
    const { title, password, notes, categoryId, url, isFavorite, customFields } = body;

    if (!title || !password) {
      return NextResponse.json({ error: "Title and password are required" }, { status: 400 });
    }

    await connectDB();

    const passwordCipher = encrypt(password);
    const notesCipher = notes ? encrypt(notes) : null;

    const encryptedCustomFields = Array.isArray(customFields)
      ? customFields.map((field: any) => ({
          label: field.label,
          valueCipher: encrypt(field.value)
        }))
      : [];

    const result = await Password.create({
      title,
      passwordCipher,
      notesCipher,
      categoryId: categoryId || null,
      url: url || "",
      isFavorite: isFavorite || false,
      customFields: encryptedCustomFields,
    });

    return NextResponse.json({ id: result._id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/passwords error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
