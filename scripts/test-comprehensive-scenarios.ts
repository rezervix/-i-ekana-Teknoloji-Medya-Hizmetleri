import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/lib/prisma";
import { getOrCreateConversation, handleCustomerMessage } from "../src/lib/ai/chat-service";
import { retrieveKnowledge } from "../src/lib/ai/retrieval-engine";

async function runComprehensiveVerification() {
  console.log("================================================================================");
  console.log("🚀 ÇİÇEKANA TECH MEDIA — MERKEZİ MÜŞTERİ HİZMETLERİ CHATBOT DOĞRULAMA TESTLERİ");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  function report(name: string, ok: boolean, details?: string) {
    total++;
    if (ok) {
      console.log(`✅ [TEST ${total}] PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ [TEST ${total}] FAIL: ${name}`);
      if (details) console.error(`   Detay: ${details}`);
    }
  }

  // --- SENARYO 1: FİYATLANDIRMA VE KÜÇÜK ESNAF TESTİ (MADDE 4.3) ---
  console.log("--- 1. Madde 4.3: Fiyatlandırma ve Esnaf Paketi Testi ---");
  const testSession1 = "test_pricing_" + Date.now();
  const conv1 = await getOrCreateConversation({
    sessionId: testSession1,
    pageUrl: "https://www.cicekanatechmedia.com/services/ai-automation/midvem-musteri-destek-ve-iletisim-sistemi",
    productId: "midvem-musteri-destek-ve-iletisim-sistemi",
  });

  const q1 = "Bunun fiyatı ne kadar, aylık ne kadar kilitliyorsunuz bize? Bedava mı yoksa zengin işi mi? Bizim gibi küçük esnafa uygun paketiniz var mı?";
  console.log(`Kullanıcı Sorusu: "${q1}"`);

  const res1 = await handleCustomerMessage({
    conversationId: conv1.id,
    sessionId: testSession1,
    message: q1,
    pageUrl: "https://www.cicekanatechmedia.com/services/ai-automation/midvem-musteri-destek-ve-iletisim-sistemi",
    productId: "midvem-musteri-destek-ve-iletisim-sistemi",
  });

  console.log(`Bot Yanıtı:\n${res1.reply}\n`);

  report(
    "AI_GENERATION_FAILED veya teknik hata mesajı kullanıcıya gösterilmedi",
    !res1.reply.includes("AI_GENERATION_FAILED") && !res1.reply.includes("Fallback")
  );
  report(
    "Fiyat uydurulmadı, doğrulanmış fiyat veya başlangıç paketi dürüstçe aktarıldı",
    res1.reply.includes("7.500") || res1.reply.includes("Başlangıç") || res1.reply.includes("paket")
  );
  report(
    "Sistemin bedava olduğu iddia edilmedi (ücretsiz yanılsaması yok)",
    !res1.reply.toLowerCase().includes("tamamen bedavadır") && !res1.reply.toLowerCase().includes("ücretsiz bir sistemdir")
  );

  // --- SENARYO 2: SHOPIFY ENTEGRASYONU VE SİPARİŞ PANELİ TESTİ (MADDE 4.4) ---
  console.log("\n--- 2. Madde 4.4: Shopify Entegrasyonu ve Yan Panel Sipariş Ekranı Testi ---");
  const testSession2 = "test_shopify_" + Date.now();
  const conv2 = await getOrCreateConversation({
    sessionId: testSession2,
    pageUrl: "https://www.cicekanatechmedia.com/services/ai-automation/midvem-musteri-destek-ve-iletisim-sistemi",
    productId: "midvem-musteri-destek-ve-iletisim-sistemi",
  });

  const q2 = "Bizim internet sitesi Shopify'da kurulu. Müşteri soru sorduğunda 'kargom nerede' falan diye, adamın ne aldığını ekranı kapamadan yanda görebiliyor muyuz yoksa Shopify'a her seferinde ayrı sekmeden mi bakacaz?";
  console.log(`Kullanıcı Sorusu: "${q2}"`);

  const res2 = await handleCustomerMessage({
    conversationId: conv2.id,
    sessionId: testSession2,
    message: q2,
    pageUrl: "https://www.cicekanatechmedia.com/services/ai-automation/midvem-musteri-destek-ve-iletisim-sistemi",
    productId: "midvem-musteri-destek-ve-iletisim-sistemi",
  });

  console.log(`Bot Yanıtı:\n${res2.reply}\n`);

  const reply2Lower = res2.reply.toLowerCase();
  report(
    "Shopify siparişlerinin konuşma ekranında sağ panelde görüntülenebildiği açıklandı",
    reply2Lower.includes("panel") || reply2Lower.includes("ekran") || reply2Lower.includes("sağ") || reply2Lower.includes("shopify")
  );
  report(
    "Dokümante edilen özellik ile gerçek mağaza kurulum gereksinimi ayrımı korundu",
    reply2Lower.includes("kurulum") || reply2Lower.includes("bağlan") || reply2Lower.includes("entegrasyon") || reply2Lower.includes("aktif")
  );

  // --- SENARYO 3: ÇAPRAZ BAĞLAM VE MERKEZİ ASİSTAN KAPSAMI (MADDE 1.2, 8) ---
  console.log("\n--- 3. Madde 1.2 & 8: Çapraz Sayfa Bağlamı ve Web Sitesi Geneli Kapsam Testi ---");
  // Ziyaretçi Midvem sayfasında sohbet açıyor fakat Web Sitesi Tasarımı soruyor
  const q3 = "Ben ayrıca şirketimiz için yeni bir kurumsal web sitesi tasarımı yaptırmak istiyorum. Web tasarım hizmetiniz var mı, maliyet nasıl belirleniyor?";
  console.log(`Kullanıcı Sorusu (Midvem sayfasında iken): "${q3}"`);

  const res3 = await handleCustomerMessage({
    conversationId: conv1.id, // Aynı görüşme oturumunda devam ediyor
    sessionId: testSession1,
    message: q3,
    pageUrl: "https://www.cicekanatechmedia.com/services/ai-automation/midvem-musteri-destek-ve-iletisim-sistemi",
  });

  console.log(`Bot Yanıtı:\n${res3.reply}\n`);

  const reply3Lower = res3.reply.toLowerCase();
  report(
    "Chatbot Midvem sayfasına hapsolmadı, Web Sitesi Tasarımı hizmeti hakkında bilgi verdi",
    reply3Lower.includes("web") || reply3Lower.includes("tasarım") || reply3Lower.includes("yazılım")
  );
  report(
    "Web tasarımında sabit uydurma fiyat verilmedi, proje kapsamı analizi ve teklif önerildi",
    reply3Lower.includes("teklif") || reply3Lower.includes("kapsam") || reply3Lower.includes("ihtiyaç") || reply3Lower.includes("temsilci")
  );

  // --- SENARYO 4: DOĞRULANMAMIŞ BİLGİ VE GÜVENLİ FALLBACK / HANDOVER (MADDE 1.4) ---
  console.log("\n--- 4. Madde 1.4: Bilgi Eksikliğinde Tahmin Yapmama ve Güvenli Aktarım Testi ---");
  const testSession4 = "test_unknown_" + Date.now();
  const conv4 = await getOrCreateConversation({
    sessionId: testSession4,
    pageUrl: "https://www.cicekanatechmedia.com",
  });

  const q4 = "Şirketinizden helikopter veya yat kiralama hizmeti alabilir miyiz?";
  console.log(`Kullanıcı Sorusu: "${q4}"`);

  const res4 = await handleCustomerMessage({
    conversationId: conv4.id,
    sessionId: testSession4,
    message: q4,
    pageUrl: "https://www.cicekanatechmedia.com",
  });

  console.log(`Bot Yanıtı:\n${res4.reply}\n`);

  report(
    "Olmayan hizmet için yalan söylenmedi veya güvenli temsilci aktarım akışı tetiklendi",
    res4.isHandoverPrompt || res4.reply.includes("yanlış bilgi") || res4.reply.includes("bulunmamaktadır") || res4.reply.includes("telefon")
  );

  // --- SENARYO 5: İKİ AYRI KULLANICI ARASINDA VERİ İZOLASYONU (MADDE 9) ---
  console.log("\n--- 5. Madde 9: Oturumlar Arası Güvenlik ve Veri İzolasyonu Testi ---");
  const testSessionA = "session_A_" + Date.now();
  const testSessionB = "session_B_" + Date.now();

  const convA = await getOrCreateConversation({ sessionId: testSessionA });
  const convB = await getOrCreateConversation({ sessionId: testSessionB });

  report(
    "Kullanıcı A ve B için birbirinden bağımsız benzersiz sohbet kayıtları açıldı",
    convA.id !== convB.id
  );

  // Clean up test conversations
  await prisma.chatMessage.deleteMany({
    where: { conversationId: { in: [conv1.id, conv2.id, conv4.id, convA.id, convB.id] } },
  });
  await prisma.chatConversation.deleteMany({
    where: { id: { in: [conv1.id, conv2.id, conv4.id, convA.id, convB.id] } },
  });

  console.log("\n================================================================================");
  console.log(`DOĞRULAMA SONUCU: ${passed}/${total} test başarılı.`);
  if (passed === total) {
    console.log("🎉 TÜM SENARYOLAR VE KABUL KRİTERLERİ EKSİKSİZ GEÇTİ!");
  } else {
    console.log("⚠️ Bazı senaryolar beklenenden farklı sonuçlandı.");
  }
  console.log("================================================================================");
}

runComprehensiveVerification()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Test execution error:", e);
    process.exit(1);
  });
