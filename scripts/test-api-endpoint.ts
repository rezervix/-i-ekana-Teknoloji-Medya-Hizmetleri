import "dotenv/config";
import { POST } from "../src/app/api/social-applications/route";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";

async function testApi() {
  console.log("=========================================");
  console.log("🌐 API ROUTE TEST: /api/social-applications");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, msg: string) {
    if (cond) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Test POST with missing budget confirmation
  console.log("--- 1. Bütçe teyidi olmadan Hızlı Başvuru ---");
  const req1 = new NextRequest("http://localhost:3000/api/social-applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: "05321234567",
      budgetConfirmed: false,
      applicationType: "quick",
    }),
  });
  const res1 = await POST(req1);
  const data1 = await res1.json();
  assert(res1.status === 422, `Status 422 döndü (Gerçek: ${res1.status})`);
  assert(
    data1.error?.includes("minimum hizmet bütçesi") === true,
    `Hata mesajı teyit uyarısı veriyor: "${data1.error}"`
  );

  // 2. Test POST with invalid phone format
  console.log("\n--- 2. Geçersiz telefon numarası ile Hızlı Başvuru ---");
  const req2 = new NextRequest("http://localhost:3000/api/social-applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: "12345",
      budgetConfirmed: true,
      applicationType: "quick",
    }),
  });
  const res2 = await POST(req2);
  const data2 = await res2.json();
  assert(res2.status === 422, `Geçersiz telefon reddedildi (Status: ${res2.status})`);

  // 3. Test POST with valid Quick Application
  console.log("\n--- 3. Eksiksiz Hızlı Başvuru Gönderimi ---");
  const testPhone = "0532 999 88 77";
  const req3 = new NextRequest("http://localhost:3000/api/social-applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: testPhone,
      budgetConfirmed: true,
      applicationType: "quick",
    }),
  });
  const res3 = await POST(req3);
  const data3 = await res3.json();
  assert(res3.status === 200, `Başarılı kayıt status 200 döndü (Status: ${res3.status})`);
  assert(data3.success === true, "success: true döndü");
  assert(Boolean(data3.applicationNumber), `Başvuru numarası üretildi: ${data3.applicationNumber}`);
  assert(
    data3.message ===
      "İletişim talebiniz alındı. Başvurunuzu değerlendirdikten sonra sizinle iletişime geçeceğiz.",
    `Onay mesajı gereksinimdeki tam metne sahip: "${data3.message}"`
  );

  // 4. Check DB for created application
  if (data3.applicationNumber) {
    const saved = await prisma.socialMediaApplication.findUnique({
      where: { applicationNumber: data3.applicationNumber },
    });
    assert(Boolean(saved), "API ile gönderilen kayıt veritabanında bulundu");
    assert(saved?.applicationType === "quick", "applicationType 'quick' olarak saklandı");
    assert(saved?.phone === testPhone, `Telefon normalize edilip saklandı: ${saved?.phone}`);
    assert(saved?.budgetConfirmed === true, "Bütçe teyidi true olarak saklandı");
    assert(Boolean(saved?.budgetConfirmedAt), "Bütçe teyit zamanı kaydedildi");

    // Clean up
    await prisma.socialMediaApplication.delete({
      where: { id: saved!.id },
    });
    console.log("🧹 Test kaydı başarıyla temizlendi.");
  }

  console.log("\n=========================================");
  console.log(`SONUÇ: ${passed} BAŞARILI, ${failed} BAŞARISIZ`);
  console.log("=========================================");
}

testApi().catch((e) => {
  console.error(e);
  process.exit(1);
});
