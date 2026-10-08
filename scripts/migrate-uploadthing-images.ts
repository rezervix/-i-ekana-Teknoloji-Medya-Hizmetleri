/**
 * scripts/migrate-uploadthing-images.ts
 *
 * Veritabanındaki eski UploadThing URL'lerini (utfs.io, ufs.sh, vb.)
 * yerel sunucu klasörüne (./uploads/products) indiren ve DB kayıtlarını güncelleyen betik.
 *
 * Kullanım:
 *   npx tsx scripts/migrate-uploadthing-images.ts --dry-run
 *   npx tsx scripts/migrate-uploadthing-images.ts --execute
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "../src/lib/prisma";
import sharp from "sharp";

async function main() {
  const isExecute = process.argv.includes("--execute");
  const isDryRun = !isExecute || process.argv.includes("--dry-run");

  console.log("=================================================");
  console.log("  UploadThing -> Yerel Depolama Görsel Taşıma");
  console.log(`  Mod: ${isDryRun ? "DRY RUN (Yalnızca Önizleme)" : "GERÇEK ÇALIŞTIRMA (--execute)"}`);
  console.log("=================================================\n");

  const products = await prisma.product.findMany();
  console.log(`Toplam taranan ürün sayısı: ${products.length}`);

  const targetProducts: Array<{
    id: string;
    name: string;
    images: string[];
    utImages: string[];
  }> = [];

  for (const product of products) {
    const images: string[] = Array.isArray(product.images)
      ? (product.images as string[])
      : typeof product.images === "string"
        ? JSON.parse(product.images || "[]")
        : [];

    const utImages = images.filter(
      (img) =>
        typeof img === "string" &&
        (img.includes("utfs.io") ||
          img.includes("ufs.sh") ||
          img.includes("uploadthing"))
    );

    if (utImages.length > 0) {
      targetProducts.push({
        id: product.id,
        name: product.name,
        images,
        utImages,
      });
    }
  }

  console.log(`\nUploadThing URL'si içeren ürün sayısı: ${targetProducts.length}`);

  if (targetProducts.length === 0) {
    console.log("✅ Veritabanında taşınması gereken UploadThing görseli bulunmamaktadır.");
    console.log("Tüm ürün görselleri yerel yollar veya boş durumdadır.\n");
    process.exit(0);
  }

  let totalUtUrls = 0;
  targetProducts.forEach((p) => {
    totalUtUrls += p.utImages.length;
    console.log(`- Ürün [${p.id}] "${p.name}": ${p.utImages.length} adet görsel`);
    p.utImages.forEach((url) => console.log(`    ↳ ${url}`));
  });

  console.log(`\nToplam taşınacak görsel adedi: ${totalUtUrls}`);

  if (isDryRun) {
    console.log("\n[DRY RUN BİLGİLENDİRMESİ]");
    console.log("Hiçbir dosya indirilmedi ve veritabanı değiştirilmedi.");
    console.log("Gerçek taşıma işlemi için kullanıcı onayı sonrası şu komutu çalıştırın:");
    console.log("  npx tsx scripts/migrate-uploadthing-images.ts --execute\n");
    process.exit(0);
  }

  // GERÇEK ÇALIŞTIRMA (--execute)
  console.log("\n📦 1. Adım: Veritabanı Yedeği Alınıyor...");
  const backupDir = path.join(process.cwd(), "tmp", "db-backups");
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(
    backupDir,
    `product-backup-before-migration-${Date.now()}.json`
  );
  await fs.writeFile(backupPath, JSON.stringify(products, null, 2), "utf8");
  console.log(`✅ Yedek başarıyla kaydedildi: ${backupPath}\n`);

  console.log("⬇️ 2. Adım: Görseller İndiriliyor ve WebP Formatında Kaydediliyor...");
  const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  const persistentDir = path.join(UPLOAD_BASE_DIR, "products");
  const publicDir = path.join(process.cwd(), "public", "uploads", "products");

  await Promise.all([
    fs.mkdir(persistentDir, { recursive: true }),
    fs.mkdir(publicDir, { recursive: true }),
  ]);

  let migratedCount = 0;

  for (const target of targetProducts) {
    const updatedImages = [...target.images];

    for (let i = 0; i < updatedImages.length; i++) {
      const imgUrl = updatedImages[i];
      if (
        !imgUrl.includes("utfs.io") &&
        !imgUrl.includes("ufs.sh") &&
        !imgUrl.includes("uploadthing")
      ) {
        continue;
      }

      try {
        console.log(`İndiriliyor: ${imgUrl}`);
        const res = await fetch(imgUrl);
        if (!res.ok) {
          console.warn(`⚠️ İndirme başarısız (HTTP ${res.status}): ${imgUrl}`);
          continue;
        }

        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);

        const fileId = crypto.randomUUID();
        const mainFileName = `${fileId}.webp`;
        const thumbFileName = `${fileId}-thumb.webp`;

        const mainWebp = await sharp(buffer)
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();

        const thumbWebp = await sharp(buffer)
          .resize({ width: 400, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        await Promise.all([
          fs.writeFile(path.join(persistentDir, mainFileName), mainWebp),
          fs.writeFile(path.join(persistentDir, thumbFileName), thumbWebp),
          fs.writeFile(path.join(publicDir, mainFileName), mainWebp),
          fs.writeFile(path.join(publicDir, thumbFileName), thumbWebp),
        ]);

        const localUrl = `/uploads/products/${mainFileName}`;
        updatedImages[i] = localUrl;
        migratedCount++;
        console.log(`  ✓ Yerel konuma aktarıldı: ${localUrl}`);
      } catch (dlErr) {
        console.error(`❌ Hata (${imgUrl}):`, dlErr);
      }
    }

    // DB güncelleme
    await prisma.product.update({
      where: { id: target.id },
      data: { images: updatedImages },
    });
    console.log(`✅ Ürün [${target.id}] güncellendi.`);
  }

  console.log(`\n🎉 Taşıma tamamlandı! Toplam güncellenen görsel sayısı: ${migratedCount}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Kritik Hata:", err);
  process.exit(1);
});
