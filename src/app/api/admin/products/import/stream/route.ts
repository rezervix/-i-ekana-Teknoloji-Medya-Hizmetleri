import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  parseCsvRowsToCustomizationOptions,
  extractBasePrice,
  parseTurkishNumber,
} from "@/lib/services/csvVariantParser";
import { detectSubcategory } from "@/lib/services/subcategoryDetector";

// ─── Slug Yardımcısı ──────────────────────────────────────────────────────────

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

// ─── Kategori Normalize ───────────────────────────────────────────────────────

function normalizeCategory(raw: string): "Baski" | "Medya" | "Teknoloji" {
  const upper = (raw || "").toUpperCase().trim();
  if (upper === "BASKI") return "Baski";
  if (upper === "TEKNOLOJI" || upper === "TEKNOLOJİ") return "Teknoloji";
  return "Medya";
}

// ─── SSE Handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return new Response("Yetkisiz erişim", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const { data, category } = await req.json();

        if (!Array.isArray(data) || data.length === 0) {
          send({ type: "error", message: "Geçersiz veri formatı veya boş dosya." });
          controller.close();
          return;
        }

        const categoryValue = normalizeCategory(category || "Medya");

        // ── Ürün Adı'na göre satırları grupla ──────────────────────────────
        // Gruplama anahtarı: "Ürün Adı" sütunu (trim'li)
        const groupedRows = new Map<string, any[]>();

        for (const row of data) {
          const productName = String(row["Ürün Adı"] || "").trim();
          if (!productName) continue;

          if (!groupedRows.has(productName)) {
            groupedRows.set(productName, []);
          }
          groupedRows.get(productName)!.push(row);
        }

        if (groupedRows.size === 0) {
          send({ type: "error", message: "\"Ürün Adı\" sütunu bulunamadı veya tüm satırlar boş." });
          controller.close();
          return;
        }

        send({ type: "start", totalRows: groupedRows.size });

        let importedCount = 0;
        let errorCount = 0;
        const errors: Array<{ row: number; message: string }> = [];

        for (const [productName, rows] of groupedRows.entries()) {
          try {
            const firstRow = rows[0];

            // ── Temel ürün bilgileri (ilk satırdan) ─────────────────────
            const description = String(firstRow["Ürün Açıklaması"] || "").trim();
            const subcategory = String(
              firstRow.AltKategori || firstRow.subcategory || ""
            ).trim();

            const imagesStr = String(
              firstRow.Images || firstRow.Görseller || firstRow.images || ""
            ).trim();
            const images = imagesStr
              ? imagesStr.split(",").map((s: string) => s.trim()).filter(Boolean)
              : [];

            // stock: ilk satırdaki değer (CSV'den string olarak gelir → parseInt)
            const stockRaw = firstRow.Adet;
            const stock =
              stockRaw !== undefined && stockRaw !== ""
                ? parseInt(String(stockRaw), 10)
                : null;

            const finalSubcategory = subcategory || detectSubcategory(productName) || undefined;

            // ── Varyant ve fiyat matrisi oluştur ────────────────────────
            const customizationOptions =
              parseCsvRowsToCustomizationOptions(rows);

            // Product.price → priceMatrix'in ilk/1000-adetlik tier'ı
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
            send({
              type: "progress",
              currentRow: importedCount,
              totalRows: groupedRows.size,
              importedCount,
              errorCount,
            });
          } catch (error: any) {
            errorCount++;
            errors.push({
              row: importedCount + errorCount,
              message: `"${productName}": ${error.message}`,
            });
          }
        }

        send({
          type: "complete",
          totalRows: groupedRows.size,
          importedCount,
          errorCount,
          errors,
        });
      } catch (error: any) {
        send({ type: "error", message: error.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
