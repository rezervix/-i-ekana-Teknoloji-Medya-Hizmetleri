import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  parseCsvRowsToCustomizationOptions,
  extractBasePrice,
} from "@/lib/services/csvVariantParser";
import { detectSubcategory } from "@/lib/services/subcategoryDetector";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim() +
    "-" +
    Math.random().toString(36).substring(2, 6);
}

function normalizeCategory(raw: string): "Baski" | "Medya" | "Teknoloji" {
  const upper = (raw || "").toUpperCase().trim();
  if (upper === "BASKI") return "Baski";
  if (upper === "TEKNOLOJI" || upper === "TEKNOLOJİ") return "Teknoloji";
  return "Medya";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const { data, category } = await req.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı veya boş dosya." },
        { status: 400 }
      );
    }

    const categoryValue = normalizeCategory(category || "Medya");

    // Ürün Adı'na göre grupla
    const groupedRows = new Map<string, any[]>();
    for (const row of data) {
      // Destek: hem yeni CSV formatı (Ürün Adı) hem de eski format (Name/İsim/name)
      const productName = String(
        row["Ürün Adı"] || row.Name || row.İsim || row.name || ""
      ).trim();
      if (!productName) continue;

      if (!groupedRows.has(productName)) {
        groupedRows.set(productName, []);
      }
      groupedRows.get(productName)!.push(row);
    }

    let importedCount = 0;

    for (const [productName, rows] of groupedRows.entries()) {
      const firstRow = rows[0];

      const description = String(
        firstRow["Ürün Açıklaması"] || firstRow.Description || firstRow.Açıklama || firstRow.description || ""
      ).trim();

      const subcategory = String(
        firstRow.AltKategori || firstRow.Subcategory || firstRow.subcategory || ""
      ).trim();

      const imagesStr = String(
        firstRow.Images || firstRow.Görseller || firstRow.images || ""
      ).trim();
      const images = imagesStr
        ? imagesStr.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

      const stockRaw = firstRow.Adet || firstRow.Stock || firstRow.Stok || firstRow.stock;
      const stock =
        stockRaw !== undefined && stockRaw !== ""
          ? parseInt(String(stockRaw), 10)
          : null;

      const finalSubcategory = subcategory || detectSubcategory(productName) || undefined;

      const customizationOptions = parseCsvRowsToCustomizationOptions(rows);
      const basePrice = extractBasePrice(customizationOptions);
      const slug = generateSlug(productName);

      await prisma.product.create({
        data: {
          name: productName,
          slug,
          category: categoryValue,
          subcategory: finalSubcategory,
          price: basePrice,
          description: description || undefined,
          images,
          stock: isNaN(stock as number) ? null : stock,
          customizationOptions: customizationOptions as any,
        },
      });

      importedCount++;
    }

    return NextResponse.json({ success: true, count: importedCount });
  } catch (error: any) {
    console.error("CSV Import Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
