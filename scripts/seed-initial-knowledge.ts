import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { parseKnowledgeFile } from "../src/lib/ai/doc-parser";

async function seedInitialDocs() {
  console.log("Seeding initial approved baseline knowledge documents...");

  const existing = await prisma.knowledgeDocument.findFirst({
    where: { fileName: "midvem-resmi-urun-rehberi.md" },
  });

  if (existing) {
    console.log("Midvem baseline document already exists (ID:", existing.id, ")");
    return;
  }

  // Find Midvem plan in DB to associate with if exists
  const midvemPlan = await prisma.plan.findFirst({
    where: { slug: "midvem" },
  });

  const content = `# Midvem — Yapay Zekâ Destekli Müşteri İletişim ve Satış Asistanı

## Ürün Genel Tanımı
Midvem, e-ticaret ve kurumsal işletmeler için WhatsApp Business API, web sitesi canlı sohbet ve sosyal medya kanallarından gelen müşteri taleplerini 7/24 karşılayan, soruları yanıtlayan ve satış sürecini kolaylaştıran yapay zekâ asistanıdır.

## Temel Özellikler
1. **WhatsApp Business Desteği:** Müşterilerin WhatsApp üzerinden sorduğu ürün, sipariş ve kargo durumlarına anında yanıt verir.
2. **Kişiselleştirilmiş Yanıtlar:** İşletmenizin onayladığı ürün dokümanları, fiyat listeleri ve kurumsal SSS verileri dışına çıkmadan güvenli yanıt üretir.
3. **İnsan Temsilciye Yönlendirme:** Cevaplayamadığı veya özel teklif gerektiren durumlarda müşterinin telefon numarasını alarak talebi satış ekibine iletir.
4. **Çoklu Dil Desteği:** Türkçe ve İngilizce başta olmak üzere çok dilli müşteri iletişimi sağlar.
5. **Randevu ve Toplantı Takvimi:** Müşterilerle doğrudan demo veya satış görüşmesi takvimi oluşturabilir.

## Paketler ve Fiyatlandırma
- **Başlangıç Paketi:** Küçük ölçekli işletmeler için temel WhatsApp ve web sohbet desteği.
- **Büyüme (Pro) Paketi:** Yüksek mesaj hacmi, gelişmiş entegrasyonlar ve öncelikli destek.
- **Kurumsal (Enterprise):** Özel yapay zekâ model eğitimi, ERP/CRM entegrasyonları ve özel SLA.

## Destek Kapsamı ve Kısıtlamalar
- Midvem yalnızca işletmenin onayladığı bilgi kaynakları üzerinden bilgi verir; uydurma fiyat veya vaat üretmez.
- Fiziksel depolama veya nakliye taşımacılığı hizmeti sunmaz.`;

  const parsed = await parseKnowledgeFile("midvem-resmi-urun-rehberi.md", Buffer.from(content, "utf8"));

  const doc = await prisma.knowledgeDocument.create({
    data: {
      title: "Midvem — Müşteri İletişim ve Satış Asistanı Resmi Rehberi",
      description: "Midvem AI resmi ürün özellikleri, WhatsApp entegrasyonu ve paket kapsamı rehberi.",
      fileName: "midvem-resmi-urun-rehberi.md",
      fileType: "md",
      fileSize: Buffer.from(content).length,
      rawContent: parsed.rawContent,
      cleanContent: parsed.cleanContent,
      productId: midvemPlan?.id || null,
      productType: "plan",
      category: "Midvem",
      status: "ACTIVE", // Active out of the box
      statusMessage: "Resmi temel bilgi bankası olarak aktif edildi.",
      version: 1,
      uploadedBy: "Çiçekana Sistem",
      chunkCount: parsed.chunks.length,
      chunks: {
        create: parsed.chunks.map((c) => ({
          chunkIndex: c.chunkIndex,
          content: c.content,
          keywords: c.keywords,
        })),
      },
    },
  });

  console.log("Successfully seeded Midvem document with", parsed.chunks.length, "chunks. Document ID:", doc.id);
}

seedInitialDocs()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  });
