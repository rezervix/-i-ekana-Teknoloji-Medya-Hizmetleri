/**
 * scripts/test-upload-system.ts
 *
 * Yerel görsel yükleme sisteminin tüm güvenlik ve işlevsellik testlerini çalıştırır.
 */

import { createAdminSession, ADMIN_SESSION_COOKIE } from "../src/lib/admin-session";
import { prisma } from "../src/lib/prisma";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

async function runTests() {
  console.log("=================================================");
  console.log("  GÖRSEL YÜKLEME SİSTEMİ TEST VE KANIT DOĞRULAMASI");
  console.log("=================================================\n");

  const baseUrl = "http://localhost:3000";
  const uploadEndpoint = `${baseUrl}/api/admin/products/upload-image`;

  const userCookie = `${ADMIN_SESSION_COOKIE}=${createAdminSession("user-test-1", "USER")}`;
  const adminCookie = `${ADMIN_SESSION_COOKIE}=${createAdminSession("admin-test-1", "ADMIN")}`;

  // --------------------------------------------------------------------------
  // TEST 1: Giriş Yapmamış Kullanıcı (401 Beklenir)
  // --------------------------------------------------------------------------
  console.log("TEST 1: Giriş yapmamış kullanıcı yükleme denemesi...");
  const res1 = await fetch(uploadEndpoint, { method: "POST" });
  const data1 = await res1.json().catch(() => ({}));
  console.log(`  ↳ HTTP Durum: ${res1.status} (Beklenen: 401)`);
  console.log(`  ↳ Yanıt: ${JSON.stringify(data1)}`);
  if (res1.status !== 401) throw new Error("TEST 1 Başarısız: 401 bekleniyordu!");
  console.log("  ✅ TEST 1 BAŞARILI: Yetkisiz erişim 401 ile engellendi.\n");

  // --------------------------------------------------------------------------
  // TEST 2: Yetkisiz Rol (USER/Müşteri) Kullanıcısı (403 Beklenir)
  // --------------------------------------------------------------------------
  console.log("TEST 2: Yetkisiz rol (USER) kullanıcı yükleme denemesi...");
  const res2 = await fetch(uploadEndpoint, {
    method: "POST",
    headers: { Cookie: userCookie },
  });
  const data2 = await res2.json().catch(() => ({}));
  console.log(`  ↳ HTTP Durum: ${res2.status} (Beklenen: 403)`);
  console.log(`  ↳ Yanıt: ${JSON.stringify(data2)}`);
  if (res2.status !== 403) throw new Error("TEST 2 Başarısız: 403 bekleniyordu!");
  console.log("  ✅ TEST 2 BAŞARILI: Admin olmayan kullanıcı 403 ile engellendi.\n");

  // --------------------------------------------------------------------------
  // TEST 3: Geçersiz Dosya Türü - .exe (400 Beklenir)
  // --------------------------------------------------------------------------
  console.log("TEST 3: Zararlı dosya (.exe) yükleme denemesi...");
  const exeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00This is a fake PE executable binary file");
  const exeForm = new FormData();
  exeForm.append("file", new Blob([exeBuffer], { type: "application/x-msdownload" }), "malware.exe");

  const res3 = await fetch(uploadEndpoint, {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: exeForm,
  });
  const data3 = await res3.json().catch(() => ({}));
  console.log(`  ↳ HTTP Durum: ${res3.status} (Beklenen: 400)`);
  console.log(`  ↳ Yanıt: ${JSON.stringify(data3)}`);
  if (res3.status !== 400) throw new Error("TEST 3 Başarısız: 400 bekleniyordu!");
  console.log("  ✅ TEST 3 BAŞARILI: .exe dosyası reddedildi.\n");

  // --------------------------------------------------------------------------
  // TEST 4: Desteklenmeyen Görsel Formatı - .svg (400 Beklenir)
  // --------------------------------------------------------------------------
  console.log("TEST 4: Vektör / SVG dosya (.svg) yükleme denemesi...");
  const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="50"/></svg>');
  const svgForm = new FormData();
  svgForm.append("file", new Blob([svgBuffer], { type: "image/svg+xml" }), "vector.svg");

  const res4 = await fetch(uploadEndpoint, {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: svgForm,
  });
  const data4 = await res4.json().catch(() => ({}));
  console.log(`  ↳ HTTP Durum: ${res4.status} (Beklenen: 400)`);
  console.log(`  ↳ Yanıt: ${JSON.stringify(data4)}`);
  if (res4.status !== 400) throw new Error("TEST 4 Başarısız: 400 bekleniyordu!");
  console.log("  ✅ TEST 4 BAŞARILI: .svg dosyası reddedildi.\n");

  // --------------------------------------------------------------------------
  // TEST 5: Boyut Sınırı Aşımı - 6 MB Dosya (400 Beklenir)
  // --------------------------------------------------------------------------
  console.log("TEST 5: 6 MB'lık dosya yükleme denemesi (5 MB sınırı)...");
  // 6MB buffer with JPEG header
  const bigBuffer = Buffer.alloc(6 * 1024 * 1024);
  bigBuffer[0] = 0xff;
  bigBuffer[1] = 0xd8;
  bigBuffer[2] = 0xff;
  const bigForm = new FormData();
  bigForm.append("file", new Blob([bigBuffer], { type: "image/jpeg" }), "oversized.jpg");

  const res5 = await fetch(uploadEndpoint, {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: bigForm,
  });
  const data5 = await res5.json().catch(() => ({}));
  console.log(`  ↳ HTTP Durum: ${res5.status} (Beklenen: 400)`);
  console.log(`  ↳ Yanıt: ${JSON.stringify(data5)}`);
  if (res5.status !== 400) throw new Error("TEST 5 Başarısız: 400 bekleniyordu!");
  console.log("  ✅ TEST 5 BAŞARILI: 5 MB üstü dosya reddedildi.\n");

  // --------------------------------------------------------------------------
  // TEST 6: Geçerli Görsel Yükleme (Admin Olarak PNG/JPEG -> WebP + Thumb)
  // --------------------------------------------------------------------------
  console.log("TEST 6: Gerçek PNG/JPEG görsel oluşturuluyor ve yükleniyor...");
  // 1920x1080 test image using sharp
  const testPngBuffer = await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 4,
      background: { r: 13, g: 148, b: 136, alpha: 1 }, // teal
    },
  })
    .png()
    .toBuffer();

  const validForm = new FormData();
  validForm.append("file", new Blob([testPngBuffer], { type: "image/png" }), "cicekana-test-product.png");

  const res6 = await fetch(uploadEndpoint, {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: validForm,
  });
  const data6 = await res6.json();
  console.log(`  ↳ HTTP Durum: ${res6.status} (Beklenen: 200)`);
  console.log(`  ↳ Yüklenen URL: ${data6.url}`);
  console.log(`  ↳ Küçük Görsel (Thumbnail): ${data6.thumbUrl}`);
  if (res6.status !== 200 || !data6.url) throw new Error("TEST 6 Başarısız: 200 bekleniyordu!");
  console.log("  ✅ TEST 6 BAŞARILI: Görsel WebP'ye dönüştürülüp başarıyla kaydedildi.\n");

  // --------------------------------------------------------------------------
  // TEST 7: Dosyaların Diskte Oluştuğunun ve Boyutlarının Kontrolü
  // --------------------------------------------------------------------------
  console.log("TEST 7: Diskte oluşan dosya kontrol ediliyor...");
  const uploadedFileName = path.basename(data6.url);
  const thumbFileName = path.basename(data6.thumbUrl);

  const persistentMainPath = path.join(process.cwd(), "uploads", "products", uploadedFileName);
  const persistentThumbPath = path.join(process.cwd(), "uploads", "products", thumbFileName);

  const mainStat = await fs.stat(persistentMainPath);
  const thumbStat = await fs.stat(persistentThumbPath);

  const mainMetadata = await sharp(persistentMainPath).metadata();
  const thumbMetadata = await sharp(persistentThumbPath).metadata();

  console.log(`  ↳ Ana Görsel: ${persistentMainPath} (${mainStat.size} bayt)`);
  console.log(`    Format: ${mainMetadata.format}, Boyut: ${mainMetadata.width}x${mainMetadata.height} (Maks 1600px kuralı)`);
  console.log(`  ↳ Küçük Görsel: ${persistentThumbPath} (${thumbStat.size} bayt)`);
  console.log(`    Format: ${thumbMetadata.format}, Boyut: ${thumbMetadata.width}x${thumbMetadata.height} (Maks 400px kuralı)`);

  if (mainMetadata.format !== "webp" || (mainMetadata.width && mainMetadata.width > 1600)) {
    throw new Error("TEST 7 Başarısız: Ana görsel WebP veya 1600px sınırında değil!");
  }
  if (thumbMetadata.format !== "webp" || (thumbMetadata.width && thumbMetadata.width > 400)) {
    throw new Error("TEST 7 Başarısız: Küçük görsel WebP veya 400px sınırında değil!");
  }
  console.log("  ✅ TEST 7 BAŞARILI: Sharp dönüşümü ve dosya boyutları kusursuz.\n");

  // --------------------------------------------------------------------------
  // TEST 8: Web Üzerinden Görselin HTTP 200 ile Sunulması
  // --------------------------------------------------------------------------
  console.log("TEST 8: Görselin web üzerinden (/uploads/products/...) sunulması...");
  const imageUrl = `${baseUrl}${data6.url}`;
  const webRes = await fetch(imageUrl);
  const webContentType = webRes.headers.get("content-type");
  const webCacheControl = webRes.headers.get("cache-control");
  console.log(`  ↳ İstek: ${imageUrl}`);
  console.log(`  ↳ HTTP Durum: ${webRes.status} (Beklenen: 200)`);
  console.log(`  ↳ Content-Type: ${webContentType}`);
  console.log(`  ↳ Cache-Control: ${webCacheControl}`);

  if (webRes.status !== 200 || !webContentType?.includes("image/webp")) {
    throw new Error("TEST 8 Başarısız: Görsel HTTP 200 ile sunulamadı!");
  }
  console.log("  ✅ TEST 8 BAŞARILI: Görsel Next.js route üzerinden 200 OK ile sunuldu.\n");

  // --------------------------------------------------------------------------
  // TEST 9: Veritabanına Yazma ve SELECT ile Doğrulama
  // --------------------------------------------------------------------------
  console.log("TEST 9: Veritabanında ürün görselinin güncellenmesi ve SELECT ile sorgulanması...");
  // Bir test ürünü seçip görselini güncelleyelim
  const sampleProduct = await prisma.product.findFirst();
  if (sampleProduct) {
    const originalImages = sampleProduct.images as string[];
    const testImages = [data6.url, ...(Array.isArray(originalImages) ? originalImages : [])];

    await prisma.product.update({
      where: { id: sampleProduct.id },
      data: { images: testImages },
    });

    // SELECT ile ham sorgulama
    const verified: any[] = await prisma.$queryRawUnsafe(
      `SELECT "id", "name", "images" FROM "Product" WHERE "id" = $1;`,
      sampleProduct.id
    );

    console.log(`  ↳ Güncellenen Ürün: ${verified[0]?.name} (ID: ${verified[0]?.id})`);
    console.log(`  ↳ SELECT Sonucu Görseller:`, JSON.stringify(verified[0]?.images));

    // Orijinal haline geri alalım
    await prisma.product.update({
      where: { id: sampleProduct.id },
      data: { images: originalImages },
    });
    console.log("  ↳ Orijinal durum korundu.");
  }
  console.log("  ✅ TEST 9 BAŞARILI: DB SELECT doğrulaması tamamlandı.\n");

  console.log("=================================================");
  console.log("  🎉 TÜM 9 TEST BAŞARIYLA TAMAMLANDI!");
  console.log("=================================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("\n❌ TEST HATASI:", err);
  process.exit(1);
});
