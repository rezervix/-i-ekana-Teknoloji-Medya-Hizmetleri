import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { socialApplicationSchema } from "../src/types/social-application";

async function runTests() {
  console.log("=================================================");
  console.log("🧪 SOSYAL MEDYA & REKLAM DANIŞMANLIĞI ENTEGRASYON TESTİ");
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

  // ── TEST 1: Zod Şema Doğrulaması - Zorunlu Bütçe Teyidi Eksikse Reddedilmeli
  console.log("--- Test 1: Zorunlu Bütçe Teyidi Doğrulaması ---");
  const invalidDataNoBudgetConfirm = {
    fullName: "Mehmet Demir",
    companyName: "Demir Lojistik",
    email: "mehmet@demirlojistik.com",
    phone: "05321112233",
    sector: "B2B / Kurumsal Hizmetler",
    services: ["Meta Ads danışmanlığı ve yönetimi"],
    platforms: ["Instagram", "Facebook"],
    goals: ["Nitelikli müşteri adayları kazanmak"],
    monthlyServiceBudget: "15.000–25.000 TL",
    monthlyAdSpendBudget: "10.000–30.000 TL",
    budgetConfirmed: false, // ONAYLANMAMIŞ
    kvkkConsent: true,
  };

  const parseResult1 = socialApplicationSchema.safeParse(invalidDataNoBudgetConfirm);
  assert(
    !parseResult1.success,
    "Bütçe teyidi olmadan form şemadan geçememeli (422 reddedildi)"
  );
  if (!parseResult1.success) {
    const errorMsg = parseResult1.error.flatten().fieldErrors.budgetConfirmed?.[0];
    assert(
      errorMsg?.includes("minimum hizmet bütçesi") === true,
      `Hata mesajı doğru metni içeriyor: "${errorMsg}"`
    );
  }

  // ── TEST 2: Zod Şema Doğrulaması - Geçersiz Bütçe Değeri
  console.log("\n--- Test 2: 15.000 TL Altı Bütçe Seçimi Reddi ---");
  const invalidDataLowBudget = {
    ...invalidDataNoBudgetConfirm,
    monthlyServiceBudget: "5.000–10.000 TL", // Geçersiz bütçe aralığı
    budgetConfirmed: true,
  };

  const parseResult2 = socialApplicationSchema.safeParse(invalidDataLowBudget);
  assert(
    !parseResult2.success,
    "15.000 TL altı / tanımsız bütçe değeri şemadan geçememeli"
  );

  // ── TEST 3: Geçerli Başvuru Doğrulaması
  console.log("\n--- Test 3: Eksiksiz & Geçerli Başvuru Şema Doğrulaması ---");
  const validData = {
    fullName: "Test Yetkili",
    companyName: "Test Otomotiv A.Ş.",
    title: "Genel Müdür",
    email: "test.otomotiv@example.com",
    phone: "05551234567",
    website: "https://www.testotomotiv.com",
    socialMediaUrl: "@testotomotiv",
    sector: "B2B / Kurumsal Hizmetler",
    city: "İstanbul",
    services: [
      "Sosyal medya hesap yönetimi",
      "Meta Ads danışmanlığı ve yönetimi",
      "Sosyal medya ve reklam yönetiminin birlikte yürütülmesi",
    ],
    platforms: ["Instagram", "Facebook", "LinkedIn"],
    goals: ["Marka bilinirliğini artırmak", "Satışları artırmak"],
    monthlyServiceBudget: "25.000–50.000 TL",
    monthlyAdSpendBudget: "30.000–75.000 TL",
    preferredPeriod: "Önümüzdeki 2 hafta içinde",
    currentAccountStatus: "Aktif hesap var fakat reklam yapılmıyor",
    currentAdExperience: "Kendi bünyemizde temel düzeyde denedik",
    notes: "Nitelikli B2B müşteri adayları toplamak istiyoruz.",
    preferredContactMethod: "WhatsApp",
    budgetConfirmed: true,
    kvkkConsent: true,
    marketingConsent: true,
  };

  const parseResult3 = socialApplicationSchema.safeParse(validData);
  assert(parseResult3.success, "Eksiksiz ve bütçe teyitli veri başarıyla doğrulandı");

  // ── TEST 4: Veritabanına Kalıcı Kayıt ve applicationNumber
  console.log("\n--- Test 4: Veritabanı Kayıt & Benzersiz Başvuru No ---");
  const testAppNumber = `SMA-TEST-${Date.now().toString().slice(-6)}`;
  let createdApp: any = null;

  try {
    createdApp = await prisma.socialMediaApplication.create({
      data: {
        applicationNumber: testAppNumber,
        fullName: validData.fullName,
        companyName: validData.companyName,
        title: validData.title,
        email: validData.email,
        phone: validData.phone,
        website: validData.website,
        socialMediaUrl: validData.socialMediaUrl,
        sector: validData.sector,
        city: validData.city,
        services: validData.services,
        platforms: validData.platforms,
        goals: validData.goals,
        monthlyServiceBudget: validData.monthlyServiceBudget,
        monthlyAdSpendBudget: validData.monthlyAdSpendBudget,
        preferredPeriod: validData.preferredPeriod,
        currentAccountStatus: validData.currentAccountStatus,
        currentAdExperience: validData.currentAdExperience,
        notes: validData.notes,
        preferredContactMethod: validData.preferredContactMethod,
        budgetConfirmed: true,
        budgetConfirmedAt: new Date(),
        kvkkConsent: true,
        marketingConsent: true,
        status: "NEW",
        landingPage: "/services/sosyal-medya-reklam-danismanligi",
      },
    });

    assert(Boolean(createdApp?.id), `Başvuru DB'ye kaydedildi (ID: ${createdApp?.id})`);
    assert(
      createdApp.applicationNumber === testAppNumber,
      `Başvuru no eşleşiyor: ${createdApp.applicationNumber}`
    );
    assert(createdApp.status === "NEW", "Varsayılan statü NEW olarak atandı");
    assert(
      createdApp.budgetConfirmed === true,
      "budgetConfirmed bayrağı veritabanında true olarak saklandı"
    );
  } catch (err: any) {
    console.error("DB create error:", err);
    assert(false, "DB create işlemi başarılı olmalı");
  }

  // ── TEST 5: Dahili Not Ekleme İlişkisi
  console.log("\n--- Test 5: Dahili Not (Internal Note) Ekleme ---");
  if (createdApp) {
    try {
      const note = await prisma.socialMediaApplicationNote.create({
        data: {
          applicationId: createdApp.id,
          authorName: "Danışman Ayşe",
          content: "Müşteri ile ilk temas planlandı. Bütçe aralığı teyit edildi.",
        },
      });

      assert(Boolean(note.id), `Dahili not başarıyla kaydedildi (ID: ${note.id})`);
      assert(
        note.applicationId === createdApp.id,
        "Dahili not başvuruyla doğru ilişkilendirildi"
      );
    } catch (err: any) {
      assert(false, "Dahili not ekleme hatası: " + err.message);
    }
  }

  // ── TEST 6: Durum & Takip Tarihi Güncelleme (Admin PATCH)
  console.log("\n--- Test 6: Durum ve Takip Tarihi Güncelleme ---");
  if (createdApp) {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const updated = await prisma.socialMediaApplication.update({
        where: { id: createdApp.id },
        data: {
          status: "CONTACTED",
          followUpDate: tomorrow,
        },
        include: {
          adminNotes: true,
        },
      });

      assert(updated.status === "CONTACTED", "Statü CONTACTED olarak güncellendi");
      assert(Boolean(updated.followUpDate), "Takip tarihi başarıyla kaydedildi");
      assert(updated.adminNotes.length === 1, "İlişkili dahili not başarıyla getirildi");
    } catch (err: any) {
      assert(false, "Güncelleme hatası: " + err.message);
    }
  }

  // ── TEST 7: Temizlik (Test verisinin DB'den silinmesi)
  console.log("\n--- Test 7: Test Verisi Temizliği ---");
  if (createdApp) {
    try {
      await prisma.socialMediaApplication.delete({
        where: { id: createdApp.id },
      });
      console.log(`🧹 Test kaydı (${testAppNumber}) başarıyla temizlendi.`);
      assert(true, "Veritabanı temizliği tamamlandı");
    } catch (err: any) {
      assert(false, "Temizlik hatası: " + err.message);
    }
  }

  console.log("\n=================================================");
  console.log(
    `SONUÇ: ${testsPassed} BAŞARILI, ${testsFailed} BAŞARISIZ`
  );
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
