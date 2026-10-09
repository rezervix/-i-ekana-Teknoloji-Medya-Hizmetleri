import { del, list } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export function sanitizeFileName(fileName: string): string {
  const trMap: Record<string, string> = {
    ç: "c", Ç: "c",
    ğ: "g", Ğ: "g",
    ı: "i", İ: "i",
    ö: "o", Ö: "o",
    ş: "s", Ş: "s",
    ü: "u", Ü: "u",
  };

  const withoutTr = fileName.replace(/[çğışüöÇĞİŞÜÖ]/g, (char) => trMap[char] || char);
  const baseName = withoutTr.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return baseName.replace(/^[-.]+/, "").toLowerCase();
}

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export const BLOB_NOT_CONFIGURED_MESSAGE =
  "Vercel Blob depolama belirteci (BLOB_READ_WRITE_TOKEN) tanımlanmamış. " +
  "Lütfen Vercel panelinizden Storage > Blob sekmesine giderek bir Blob Store oluşturun ve BLOB_READ_WRITE_TOKEN ortam değişkenini ekleyin.";

/**
 * Safely delete a blob from Vercel Blob storage.
 * Silme başarısız olsa dahi çağıran sürecin çökmesini engeller, loglar.
 */
export async function deleteBlob(urlOrPathname: string): Promise<boolean> {
  if (!urlOrPathname || !isBlobConfigured()) return false;
  // Sadece Vercel Blob URL'lerini sil
  if (!urlOrPathname.includes("vercel-storage.com") && !urlOrPathname.startsWith("products/")) {
    return false;
  }

  try {
    await del(urlOrPathname);
    return true;
  } catch (err: any) {
    console.error("[deleteBlob] Blob silinirken hata:", {
      target: urlOrPathname,
      message: err?.message,
    });
    return false;
  }
}

/**
 * Öksüz (Orphan) Vercel Blob dosyalarını temizleme yardımcı fonksiyonu.
 * DB'de product_images tablosunda veya Product.images dizisinde yer almayan
 * 'products/' altındaki blob dosyalarını tespit eder ve isteğe bağlı siler.
 */
export async function cleanOrphanProductBlobs(dryRun: boolean = true): Promise<{
  totalBlobsScanned: number;
  orphanCount: number;
  orphanUrls: string[];
  deletedCount: number;
}> {
  if (!isBlobConfigured()) {
    throw new Error(BLOB_NOT_CONFIGURED_MESSAGE);
  }

  const { blobs } = await list({ prefix: "products/" });
  const activeProducts = await prisma.product.findMany({
    select: { images: true },
  });
  const activeProductImages = await prisma.productImage.findMany({
    select: { url: true, blobPathname: true },
  });

  const activeUrlsSet = new Set<string>();

  for (const p of activeProducts) {
    for (const u of p.images) {
      if (typeof u === "string") activeUrlsSet.add(u);
    }
  }

  for (const pi of activeProductImages) {
    if (pi.url) activeUrlsSet.add(pi.url);
    if (pi.blobPathname) activeUrlsSet.add(pi.blobPathname);
  }

  const orphanUrls: string[] = [];

  for (const b of blobs) {
    if (!activeUrlsSet.has(b.url) && !activeUrlsSet.has(b.pathname)) {
      orphanUrls.push(b.url);
    }
  }

  let deletedCount = 0;
  if (!dryRun && orphanUrls.length > 0) {
    for (const url of orphanUrls) {
      try {
        await del(url);
        deletedCount++;
      } catch (err) {
        console.warn("[cleanOrphanProductBlobs] Silinemedi:", url, err);
      }
    }
  }

  return {
    totalBlobsScanned: blobs.length,
    orphanCount: orphanUrls.length,
    orphanUrls,
    deletedCount,
  };
}
