import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  socialApplicationSchema,
  quickApplicationSchema,
  normalizeTurkishPhone,
} from "../src/types/social-application";

async function runTests() {
  console.log("=================================================");
  console.log("🧪 SOSYAL MEDYA & REKLAM DANIŞMANLIĞI ENTEGRASYON TESTİ");
  console.log("   (Detaylı Form + Hero Section Hızlı Başvuru)");
  console.log("=================================================\n");

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      testsFailed++;
    }
  }

  // ── TEST 1: Telefon Numarası Normalizasyonu
  console.log("--- Test 1: Türkiye Telefon Numarası Normalizasyonu ---");
  const testPhone1 = normalizeTurkishPhone("0532 123 45 67");
  assert(testPhone1.isValid, "0532 123 45 67 geçerli olarak algılandı");
  assert(
    testPhone1.formatted === "0532 123 45 67",
    `Biçim doğru: ${testPhone1.formatted}`
  );

  const testPhone2 = normalizeTurkishPhone("+90 544 987 65 43");
  assert(testPhone2.isValid, "+90 ile başlayan telefon geçerli olarak algılandı");
  assert(
    testPhone2.formatted === "0544 987 65 43",
    `+90 temizlenip 05xx formatına dönüştü: ${testPhone2.formatted}`
  );

  const testPhone3 = normalizeTurkishPhone("5551234567");
  assert(testPhone3.isValid, "Başında 0 olmayan 10 haneli 5xx geçerli algılandı");
  assert(
    testPhone3.formatted === "0555 123 45 67",
    `Başında 0 eklenip normalize edildi: ${testPhone3.formatted}`
  );

  const testPhoneInvalid = normalizeTurkishPhone("0212 123 45 67");
  assert(!testPhoneInvalid.isValid, "05 dışındaki sabit hat cep telefonu olarak reddedildi");

  const testPhoneShort = normalizeTurkishPhone("0532 12");
  assert(!testPhoneShort.isValid, "Eksik basamaklı numara reddedildi");

  // ── TEST 2: Hızlı Başvuru Şema Doğrulaması - Zorunlu Bütçe Teyidi Eksikse Reddedilmeli
  console.log("\n--- Test 2: Hızlı Başvuru - Bütçe Teyidi Eksikse Red ---");
  const quickWithoutBudgetConfirm = {
    phone: "05321234567",
    budgetConfirmed: false,
    applicationType: "quick",
  };
  const quickResult1 = quickApplicationSchema.safeParse(quickWithoutBudgetConfirm);
  assert(!quickResult1.success, "Bütçe teyidi olmadan hızlı başvuru geçememeli");
  if (!quickResult1.success) {
    const msg = quickResult1.error.flatten().fieldErrors.budgetConfirmed?.[0];
    assert(
      msg?.includes("minimum hizmet bütçesi") === true,
      `Hata mesajı doğru metni içeriyor: "${msg}"`
    );
  }

  // ── TEST 3: Hızlı Başvuru Şema Doğrulaması - Geçerli Veri
  console.log("\n--- Test 3: Hızlı Başvuru - Geçerli Form Doğrulaması ---");
  const validQuickData = {
    phone: "0532 555 44 33",
    budgetConfirmed: true,
    applicationType: "quick",
  };
  const quickResult2 = quickApplicationSchema.safeParse(validQuickData);
  assert(quickResult2.success, "Yalnızca telefon ve bütçe teyidi içeren hızlı başvuru doğrulandı");

  // ── TEST 4: Detaylı Başvuru Şeması - Geriye Uyumluluk
  console.log("\n--- Test 4: Detaylı Başvuru (Mevcut Form) Geriye Uyumluluk ---");
  const validDetailedData = {
    fullName: "Ali Veli",
    companyName: "Veli Ticaret Ltd.",
    email: "ali@veliticaret.com",
    phone: "05321112233",
    sector: "E-Ticaret / Perakende",
    services: ["Meta Ads danışmanlığı ve yönetimi"],
    platforms: ["Instagram", "Facebook"],
    goals: ["Satışları artırmak"],
    monthlyServiceBudget: "15.000–25.000 TL",
    monthlyAdSpendBudget: "10.000–30.000 TL",
    budgetConfirmed: true,
    kvkkConsent: true,
  };
  const detailedResult = socialApplicationSchema.safeParse(validDetailedData);
  assert(detailedResult.success, "Detaylı form şeması eskisi gibi başarıyla doğrulandı");

  // ── TEST 5: Veritabanına Hızlı Başvuru Kaydı (applicationType = 'quick')
  console.log("\n--- Test 5: Veritabanına Hızlı Başvuru Kaydı Oluşturma ---");
  const quickAppNumber = `SMA-QUICK-${Date.now().toString().slice(-6)}`;
  let createdQuickApp: any = null;

  try {
    const phoneNorm = normalizeTurkishPhone(validQuickData.phone);
    createdQuickApp = await prisma.socialMediaApplication.create({
      data: {
        applicationNumber: quickAppNumber,
        applicationType: "quick",
        phone: phoneNorm.formatted,
        fullName: null,
        companyName: null,
        email: null,
        services: ["Hızlı Başvuru - Ön Görüşme Talebi"],
        platforms: [],
        goals: [],
        monthlyServiceBudget: "15.000 TL ve üzeri (Hızlı Başvuru Teyitli)",
        monthlyAdSpendBudget: "Görüşmede Belirlenecek",
        sector: null,
        budgetConfirmed: true,
        budgetConfirmedAt: new Date(),
        kvkkConsent: true,
        marketingConsent: false,
        status: "NEW",
        landingPage: "/services/sosyal-medya-reklam-danismanligi#hizli-basvuru",
      },
    });

    assert(Boolean(createdQuickApp?.id), `Hızlı başvuru DB'ye kaydedildi (ID: ${createdQuickApp?.id})`);
    assert(createdQuickApp.applicationType === "quick", "applicationType alanı 'quick' olarak kaydedildi");
    assert(createdQuickApp.phone === phoneNorm.formatted, `Telefon formatı korundu: ${createdQuickApp.phone}`);
    assert(createdQuickApp.fullName === null, "fullName alanı null olarak sorunsuz kabul edildi");
    assert(createdQuickApp.companyName === null, "companyName alanı null olarak sorunsuz kabul edildi");
    assert(createdQuickApp.budgetConfirmed === true, "15.000 TL bütçe teyidi veritabanında true olarak saklandı");
  } catch (err: any) {
    console.error("DB create error (quick):", err);
    assert(false, "DB create işlemi başarılı olmalı");
  }

  // ── TEST 6: Admin Listeleme & Filtreleme (applicationType = 'quick')
  console.log("\n--- Test 6: Admin Paneli Filtreleme (type = 'quick') ---");
  if (createdQuickApp) {
    try {
      const quickAppsInDb = await prisma.socialMediaApplication.findMany({
        where: { applicationType: "quick" },
        orderBy: { createdAt: "desc" },
      });

      assert(quickAppsInDb.length > 0, "applicationType: 'quick' filtresiyle kayıtlar başarıyla listelendi");
      const found = quickAppsInDb.some((a) => a.id === createdQuickApp.id);
      assert(found, "Yeni oluşturulan hızlı başvuru listede bulundu");
    } catch (err: any) {
      assert(false, "Admin filtreleme hatası: " + err.message);
    }
  }

  // ── TEST 7: Hızlı Başvuruya Admin Dahili Notu ve Durum Güncelleme
  console.log("\n--- Test 7: Hızlı Başvuru Durum Güncelleme & Not Ekleme ---");
  if (createdQuickApp) {
    try {
      const updatedApp = await prisma.socialMediaApplication.update({
        where: { id: createdQuickApp.id },
        data: {
          status: "CONTACTED",
        },
      });
      assert(updatedApp.status === "CONTACTED", "Hızlı başvuru statüsü CONTACTED olarak güncellendi");

      const note = await prisma.socialMediaApplicationNote.create({
        data: {
          applicationId: createdQuickApp.id,
          authorName: "Admin Test",
          content: "Müşteri arandı, 15.000 TL bütçe ve hedefler konuşuldu.",
        },
      });
      assert(Boolean(note.id), "Hızlı başvuruya dahili not başarıyla eklendi");
    } catch (err: any) {
      assert(false, "Hızlı başvuru güncelleme hatası: " + err.message);
    }
  }

  // ── TEST 8: Temizlik
  console.log("\n--- Test 8: Test Verisi Temizliği ---");
  if (createdQuickApp) {
    try {
      await prisma.socialMediaApplication.delete({
        where: { id: createdQuickApp.id },
      });
      console.log(`🧹 Test hızlı başvuru kaydı (${quickAppNumber}) başarıyla temizlendi.`);
      assert(true, "Veritabanı temizliği tamamlandı");
    } catch (err: any) {
      assert(false, "Temizlik hatası: " + err.message);
    }
  }

  console.log("\n=================================================");
  console.log(`SONUÇ: ${testsPassed} BAŞARILI, ${testsFailed} BAŞARISIZ`);
  console.log("=================================================");

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
