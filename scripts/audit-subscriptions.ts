/**
 * scripts/audit-subscriptions.ts
 * 
 * Çiçekana Tech Media - Salt Okunur (Read-Only) Abonelik & PayTR Denetim Aracı
 * Veritabanında hiçbir değişiklik YAPMAZ.
 * Mevcut tüm abonelikleri, misafir durumlarını, PayTR referans eşleşmelerini ve
 * ödeme durumlarını analiz eder.
 */

import { prisma } from "../src/lib/prisma";

async function runSubscriptionAudit() {
  console.log("================================================================================");
  console.log(" ÇİÇEKANA TECH MEDIA - ABONELİK VE PAYTR DENETİM RAPORU (SALT OKUNUR)");
  console.log("================================================================================\n");

  try {
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        plan: { select: { id: true, name: true, slug: true } },
        planTier: { select: { id: true, name: true, priceMonthly: true } },
      },
    });

    console.log(`Toplam Kayıtlı Abonelik Sayısı: ${subscriptions.length}\n`);

    const stats = {
      ACTIVE: 0,
      PENDING: 0,
      FAILED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
      OTHER: 0,
      withUser: 0,
      guestWithoutUser: 0,
      withPaytrCode: 0,
      withoutPaytrCode: 0,
    };

    const details: Array<{
      id: string;
      status: string;
      customer: string;
      email: string;
      phone: string;
      isGuest: boolean;
      plan: string;
      tier: string;
      priceTL: number;
      paytrCode: string;
      createdAt: string;
    }> = [];

    for (const sub of subscriptions) {
      if (sub.status in stats) {
        (stats as any)[sub.status]++;
      } else {
        stats.OTHER++;
      }

      if (sub.user) {
        stats.withUser++;
      } else {
        stats.guestWithoutUser++;
      }

      if (sub.paytrCustomerCode) {
        stats.withPaytrCode++;
      } else {
        stats.withoutPaytrCode++;
      }

      const customerName = sub.user?.name || sub.pendingName || (sub.pendingPhone ? `Misafir (${sub.pendingPhone})` : "Eşleşmedi");
      const customerEmail = sub.user?.email || sub.pendingEmail || "—";
      const customerPhone = sub.user?.phone || sub.pendingPhone || "—";
      const isGuest = !sub.user;

      details.push({
        id: sub.id,
        status: sub.status,
        customer: customerName,
        email: customerEmail,
        phone: customerPhone,
        isGuest,
        plan: sub.plan?.name || "Bilinmiyor",
        tier: sub.planTier?.name || "Bilinmiyor",
        priceTL: sub.priceAtPurchase / 100,
        paytrCode: sub.paytrCustomerCode || "Yok (Ödeme sayfasına girilmedi)",
        createdAt: sub.createdAt.toISOString(),
      });
    }

    console.log("── Durum Dağılımı ──");
    console.log(`- ACTIVE (Aktif & Doğrulanmış):  ${stats.ACTIVE}`);
    console.log(`- PENDING (Ödeme Bekleyen):       ${stats.PENDING}`);
    console.log(`- FAILED (Başarısız Ödeme):       ${stats.FAILED}`);
    console.log(`- CANCELLED (İptal Edilmiş):      ${stats.CANCELLED}`);
    console.log(`- EXPIRED (Süresi Dolmuş):        ${stats.EXPIRED}`);
    if (stats.OTHER > 0) console.log(`- DİĞER / BEKLENMEYEN:           ${stats.OTHER}`);
    console.log("");

    console.log("── Kullanıcı Eşleşme Durumu ──");
    console.log(`- Kayıtlı Kullanıcıya Bağlı:     ${stats.withUser}`);
    console.log(`- Misafir (user ilişkisi null):   ${stats.guestWithoutUser}`);
    console.log(`- PayTR merchant_oid Kayıtlı:    ${stats.withPaytrCode}`);
    console.log(`- PayTR Kodu Olmayan (Terk):     ${stats.withoutPaytrCode}`);
    console.log("\n── Detaylı Kayıt Listesi ──\n");

    console.table(
      details.map((d) => ({
        ID: d.id.slice(0, 10) + "...",
        Durum: d.status,
        Müşteri: d.customer,
        İletişim: d.email !== "—" ? d.email : d.phone,
        Hesap: d.isGuest ? "MİSAFİR (user: null)" : "Kayıtlı",
        Paket: `${d.plan} (${d.tier})`,
        Tutar: `${d.priceTL} TL`,
        PayTR_Ref: d.paytrCode.length > 20 ? d.paytrCode.slice(0, 18) + "..." : d.paytrCode,
        Tarih: d.createdAt.split("T")[0],
      }))
    );

    console.log("\n================================================================================");
    console.log(" DENETİM ÖZETİ VE GÜVENLİK NOTLARI");
    console.log("================================================================================");
    console.log("1. 'PENDING' durumundaki kayıtlar kullanıcı ödemeyi tamamlamadığı veya ödeme");
    console.log("   sayfasını terk ettiği için bu durumdadır.");
    console.log("2. PayTR paneli ile doğrulanmamış hiçbir PENDING kayıt 'ACTIVE' yapılmamalıdır.");
    console.log("3. Misafir kayıtları (user: null), ödeme PayTR tarafından başarıyla onaylandığında");
    console.log("   otomatik olarak User kaydı açılarak bağlanır. Ödeme yapılmayan misafir kayıtları");
    console.log("   yönetim panelinde 'Misafir Hesabı (Eşleşmedi)' etiketiyle güvenle listelenir.");
    console.log("================================================================================\n");
  } catch (err) {
    console.error("Denetim sırasında hata oluştu:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runSubscriptionAudit();
