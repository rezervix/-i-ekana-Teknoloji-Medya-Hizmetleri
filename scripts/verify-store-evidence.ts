import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('==================================================');
  console.log('🔍 E-TİCARET DÖNÜŞÜM OPTİMİZASYONU - KANIT VE DOĞRULAMA');
  console.log('==================================================\n');

  // 1. Veritabanı Ürün Sayımları (SELECT)
  const productCount = await prisma.product.count();
  const activeProductCount = await prisma.product.count({ where: { isActive: true } });
  const baskiCount = await prisma.product.count({ where: { category: 'Baski', isActive: true } });
  const medyaCount = await prisma.product.count({ where: { category: 'Medya', isActive: true } });
  const teknolojiCount = await prisma.product.count({ where: { category: 'Teknoloji', isActive: true } });

  console.log(`📊 [VERİTABANI SELECT SAYIMLARI]`);
  console.log(`   Toplam Ürün: ${productCount}`);
  console.log(`   Aktif Ürün: ${activeProductCount}`);
  console.log(`   Baskı Kategorisi: ${baskiCount} ürün`);
  console.log(`   Medya Kategorisi: ${medyaCount} ürün`);
  console.log(`   Teknoloji Kategorisi: ${teknolojiCount} ürün\n`);

  // 2. /magaza sayfasından HTML testi (curl/fetch)
  const storeRes = await fetch('http://localhost:3000/magaza');
  const storeHtml = await storeRes.text();
  console.log(`🌐 [/magaza HTTP STATUS]: ${storeRes.status}`);

  const matches = [...storeHtml.matchAll(/href="(\/magaza\/urun\/[^"]+)"/g)].map(m => m[1]);
  const uniqueHrefs = [...new Set(matches)];
  console.log(`🔗 [/magaza İÇİNDEKİ ÜRÜN KARTLARI LİNKLERİ] (Toplam benzersiz ürün linki: ${uniqueHrefs.length})`);
  uniqueHrefs.slice(0, 5).forEach((href, idx) => {
    console.log(`   ${idx + 1}. <a href="${href}">`);
  });
  console.log('');

  // 3. 3 Farklı Ürünün Detay Sayfası (<title>, status, JSON-LD)
  const sampleProducts = await prisma.product.findMany({
    where: { isActive: true },
    take: 3,
    select: { slug: true, name: true, category: true, price: true }
  });

  console.log(`📑 [3 FARKLI ÜRÜN DETAY KANITI]`);
  for (const prod of sampleProducts) {
    const url = `http://localhost:3000/magaza/urun/${prod.slug}`;
    const res = await fetch(url);
    const html = await res.text();
    
    // Title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1] : 'Bulunamadı';
    
    // JSON-LD
    const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    let productSchema: any = null;
    let breadcrumbSchema: any = null;
    for (const jm of jsonLdMatches) {
      try {
        const parsed = JSON.parse(jm[1]);
        if (parsed['@type'] === 'Product') productSchema = parsed;
        if (parsed['@type'] === 'BreadcrumbList') breadcrumbSchema = parsed;
      } catch (e) {}
    }

    console.log(`\n   🔹 Ürün: ${prod.name} (${prod.slug})`);
    console.log(`      Kategori: ${prod.category}`);
    console.log(`      URL: ${url}`);
    console.log(`      HTTP Status: ${res.status}`);
    console.log(`      <title>: "${title}"`);
    console.log(`      Product JSON-LD Offers: ${productSchema ? JSON.stringify(productSchema.offers) : 'Eksik'}`);
    console.log(`      Breadcrumb Items: ${breadcrumbSchema ? breadcrumbSchema.itemListElement.length : 0} adet`);
  }

  // 4. URL Parametresi ile Filtreli Mağaza Sayfası Testi (?kategori=Baski&sirala=fiyat_artan)
  console.log(`\n🔎 [URL İLE FİLTRELİ SAYFA TESTİ (?kategori=Baski&sirala=fiyat_artan)]`);
  const filteredRes = await fetch('http://localhost:3000/magaza?kategori=Baski&sirala=fiyat_artan');
  console.log(`      URL: http://localhost:3000/magaza?kategori=Baski&sirala=fiyat_artan`);
  console.log(`      HTTP Status: ${filteredRes.status}`);

  // 5. Bulunamayan Ürün 404 Testi
  console.log(`\n🚫 [BULUNAMAYAN ÜRÜN 404 KANITI]`);
  const notFoundRes = await fetch('http://localhost:3000/magaza/urun/gecersiz-urun-slug-xyz123');
  const notFoundHtml = await notFoundRes.text();
  console.log(`      URL: http://localhost:3000/magaza/urun/gecersiz-urun-slug-xyz123`);
  console.log(`      HTTP Status: ${notFoundRes.status}`);
  console.log(`      "Mağazaya Dön" Linki Var mı: ${notFoundHtml.includes('/magaza') ? 'EVET (/magaza mevcut)' : 'HAYIR'}`);

  console.log('\n==================================================');
  console.log('✅ KANIT DOĞRULAMA TAMAMLANDI');
  console.log('==================================================');
}

main().catch(console.error).finally(() => prisma.$disconnect());
