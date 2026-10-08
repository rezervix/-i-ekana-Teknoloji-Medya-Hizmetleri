import { config } from "dotenv";
config();
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== ADIM 1: SELECT - Güncellenecek Kaydın Tespiti ===");
  const targetProduct = await prisma.product.findUnique({
    where: { id: "cmuwgwy6b000104l2f8t8jxhv" },
    select: { id: true, name: true, slug: true, customizationOptions: true },
  });

  if (!targetProduct) {
    console.error("Hedef ürün bulunamadı!");
    process.exit(1);
  }

  console.log("Ürün:", targetProduct.name, `(${targetProduct.slug})`);
  const opts = targetProduct.customizationOptions as any;
  const dims = opts?.variantDimensions || [];
  const targetDim = dims.find((d: any) => d.key === "ozellik_12");

  console.log("Mevcut Durum:", JSON.stringify(targetDim, null, 2));

  if (!targetDim) {
    console.log("ozellik_12 bulunamadı veya zaten güncellenmiş.");
    process.exit(0);
  }

  // Update only the label property of ozellik_12, keep key, autoDetected, and options unchanged
  const updatedDims = dims.map((d: any) => {
    if (d.key === "ozellik_12") {
      return {
        ...d,
        label: "Kırım Türü",
      };
    }
    return d;
  });

  const updatedOptions = {
    ...opts,
    variantDimensions: updatedDims,
  };

  console.log("\n=== ADIM 2: UPDATE İşlemi Gerçekleştiriliyor ===");
  const result = await prisma.product.update({
    where: { id: targetProduct.id },
    data: {
      customizationOptions: updatedOptions,
    },
    select: { id: true, name: true, customizationOptions: true },
  });

  const verifiedDim = (result.customizationOptions as any)?.variantDimensions?.find(
    (d: any) => d.key === "ozellik_12"
  );
  console.log("Yeni Durum:", JSON.stringify(verifiedDim, null, 2));
  console.log("\n✅ 'ozellik_12' etiketi 'Kırım Türü' olarak başarıyla güncellendi!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Hata:", err);
  process.exit(1);
});
