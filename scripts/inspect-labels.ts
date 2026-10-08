import { config } from "dotenv";
config();
import { prisma } from "../src/lib/prisma";

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, customizationOptions: true },
  });

  console.log(`Toplam Ürün Sayısı: ${products.length}`);
  const secenekList: Array<{
    productId: string;
    productName: string;
    slug: string;
    key: string;
    label: string;
    options: string[];
  }> = [];

  const allDetectedLabels: Array<{
    productName: string;
    key: string;
    label: string;
    options: string[];
  }> = [];

  for (const p of products) {
    const opts = p.customizationOptions as any;
    const dims = opts?.variantDimensions || [];
    for (const d of dims) {
      allDetectedLabels.push({
        productName: p.name,
        key: d.key,
        label: d.label,
        options: d.options,
      });
      if (/Seçenek\s*\d+/i.test(d.label) || d.key === "ozellik_12" || /secenek/i.test(d.label)) {
        secenekList.push({
          productId: p.id,
          productName: p.name,
          slug: p.slug,
          key: d.key,
          label: d.label,
          options: d.options,
        });
      }
    }
  }

  console.log("\n--- 'Seçenek N' ile Başlayan veya ozellik_12 Olan Etiketler ---");
  console.log(JSON.stringify(secenekList, null, 2));

  console.log("\n--- Tüm Ürünlerdeki Tüm Boyut Etiketleri Listesi ---");
  console.log(JSON.stringify(allDetectedLabels, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
