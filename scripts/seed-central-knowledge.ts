import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { parseKnowledgeFile } from "../src/lib/ai/doc-parser";

async function seedCentralKnowledge() {
  console.log("Seeding central Çiçekana Tech Media knowledge document...");

  const fileName = "cicekana-merkezi-bilgi-rehberi.md";

  // Check if exists, update or create
  const existing = await prisma.knowledgeDocument.findFirst({
    where: { fileName },
  });

  const content = `# Çiçekana Tech Media — Kurumsal Bilgi Bankası, Hizmetler ve Çözüm Rehberi

## 1. Çiçekana Tech Media Hakkında Genel Bilgi
Çiçekana Teknoloji ve Medya Hizmetleri; kurumsal teknoloji altyapısı, yapay zekâ ve otomasyon sistemleri, web tasarım & yazılım geliştirme, e-ticaret altyapıları, sosyal medya ve dijital reklam danışmanlığı, genç girişimci destekleri ve kurumsal matbaa/baskı çözümleri sunan entegre bir teknoloji ve medya kuruluşudur.

Web sitemiz genelinde hizmet veren merkezi müşteri hizmetleri asistanımız; ziyaretçilerin tüm ürünlerimiz, paketlerimiz, fiyatlandırmalarımız, teknik entegrasyonlarımız ve iş birliklerimiz hakkındaki sorularını yanıtlamakla görevlidir.

---

## 2. Web Sitesi Tasarımı ve Yazılım Geliştirme Hizmetleri
- **Kapsam:** Çiçekana Tech Media; kurumsal şirket web siteleri, SaaS platformları, özel web yazılımları ve yüksek performanslı e-ticaret siteleri tasarlar ve geliştirir.
- **Teknoloji Standartları:** Next.js, React, modern TailwindCSS/Vanilla CSS mimarisi, yüksek Core Web Vitals skorları, mobil %100 duyarlılık ve gelişmiş SEO altyapısı standart olarak sunulur.
- **Fiyatlandırma Yaklaşımı:** Web tasarım ve özel yazılım projeleri; sayfa sayısı, tasarım özgünlüğü, çok dilli altyapı, özel CRM/ERP entegrasyonları ve veritabanı gereksinimlerine göre projeye özel olarak tekliflendirilir.
- **Önemli Kural:** Web tasarım projeleri için sabit veya standart bir fiyat uydurulamaz. Kesin kapsam ve bütçe planlaması için müşteri temsilcimizle görüşülerek ücretsiz proje analizi ve teklif formu oluşturulması sağlanır.

---

## 3. E-Ticaret Çözümleri ve Entegrasyonları
- **Altyapılar:** ikas resmi partnerliği ile hızlı, güvenli ve bulut tabanlı e-ticaret altyapısı; ayrıca Shopify ve WooCommerce mağaza kurulumları gerçekleştirilir.
- **Yetkinlikler:** Ödeme altyapısı entegrasyonu (PayTR, iyzico), kargo takip entegrasyonları, terk edilmiş sepet kurtarma kurguları, akıllı çapraz satış (cross-sell) modülleri ve pazaryeri bağlantıları.
- **E-Ticaret Danışmanlığı:** Mağazanın ürün kataloğunun yüklenmesinden reklam piksellerinin (Meta Pixel, Google Tag) kurulumuna kadar uçtan uca destek sağlanır.

---

## 4. Sosyal Medya ve Reklam Danışmanlığı
- **Kanallar:** Meta Ads (Instagram, Facebook), Google Ads (Arama, Alışveriş, YouTube, Performance Max).
- **Hizmet İçeriği:** İçerik stratejisi belirleme, haftalık/aylık içerik takvimi, profesyonel grafik tasarım ve video prodüksiyonu, hedef kitle analizleri, ROAS (reklam harcaması getirisi) optimizasyonu ve detaylı aylık performans raporlaması.
- **Bütçe Yönetimi:** Reklam danışmanlığı paketleri ve yönetim komisyonları işletmenin aylık reklam bütçesine göre şekillenir.

---

## 5. Yapay Zekâ ve Otomasyon Çözümlerimiz

### 5.1. Midvem — Çok Kanallı Müşteri Destek ve İletişim Sistemi
- **Genel Tanım:** WhatsApp Business API, Instagram DM, Web Canlı Sohbet, E-posta, Telegram ve SMS kanallarını tek bir gelen kutusunda (Shared Inbox) toplayan, 7/24 yapay zekâ asistanı ile müşteri sorularını yanıtlayan kurumsal iletişim platformudur.
- **Doğrulanmış Paketler ve Fiyatlar:**
  * **Midvem Başlangıç:** Aylık 7.500 TL (Yıllık alımlarda avantajlıdır). 2 temsilci kullanıcı hakkı, canlı destek web widget'ı, Instagram DM entegrasyonu, temel hızlı yanıt makroları içerir. Küçük esnaf ve yeni başlayan işletmeler için en uygun pakettir.
  * **Midvem Pro:** Aylık 15.000 TL. 5 temsilci kullanıcı, Resmi WhatsApp Business bağlantısı, Instagram & Facebook Messenger, sınırsız Midvem AI yanıt asistanı, canlı sepet takibi ve e-ticaret (Shopify, ikas) entegrasyonu içerir.
  * **Midvem Kurumsal:** Aylık 25.000 TL. Sınırsız temsilci kullanıcı, tüm kanallar, özel telefon/SMS entegrasyonu, kurumsal eğitilmiş özel AI modeli, 7/24 öncelikli müşteri yöneticisi ve %99.9 SLA garantisi.
- **Ücretsiz / Bedava Durumu:** Midvem sistemi bedava veya ücretsiz bir platform değildir; kurumsal altyapı maliyeti ve yapay zekâ sunucu gücü gerektirdiğinden doğrulanmış aylık paketlerle lisanslanır. Küçük esnaf için en uygun paket 7.500 TL/ay olan Başlangıç paketidir.
- **Shopify Entegrasyonu Kapsamı ve Kurulum Ayrımı:**
  * **Dokümante Edilmiş Özellik:** Midvem'in hazır Shopify entegrasyonu bulunmaktadır. Müşteri destek görüşmesi sırasında sohbet ederken, temsilci ekranı kapatmadan veya başka bir sekmeye geçmeden sağ panelde müşterinin sipariş geçmişini, sipariş tutarını, kargo takip numarasını ve teslimat durumunu canlı olarak görebilir.
  * **Gerçek Kurulum Şartı:** Bu özellik sihirli bir şekilde her mağazada otomatik aktif gelmez. İşletmenin aktif bir Shopify mağazası bulunmalı ve Midvem paneli üzerinden Shopify API bağlantısı yapılandırılmalıdır. Kurulum tamamlandıktan sonra tüm sipariş detayları sağ panelde görüntülenmeye başlar.

### 5.2. Microsoft Call Center AI
- **Genel Tanım:** Microsoft Azure AI altyapısı üzerine inşa edilmiş; kurumsal çağrı merkezleri ve yoğun telefon trafiği olan şirketler için sesli müşteri aramalarını 7/24 karşılayan, konuşmayı anlık metne döken, müşteri niyetini ve duygu durumunu (sentiment) analiz eden sesli yapay zekâ asistanıdır.
- **Öne Çıkan Yetenekler:**
  * Gelen sesli çağrıları insan doğallığında karşılama ve sık sorulan soruları sesli yanıtlama.
  * Sipariş durumu, randevu teyidi ve bilet sorgulama gibi işlemleri sesli olarak tamamlama.
  * Müşteri temsilcisine aktarılması gereken durumlarda görüşme özetini çıkararak temsilcinin ekranına hazır iletme.
  * CRM ve ERP sistemleriyle gerçek zamanlı çift yönlü veri senkronizasyonu.
- **Fiyatlandırma:** Kurumun eşzamanlı hat kapasitesine, aylık çağrı dakikasına ve entegre edilecek santral altyapısına göre kurumsal proje bazlı tekliflendirilir.

### 5.3. Faktura — Akıllı Teklif ve Fatura Otomasyonu
- **Genel Tanım:** Teklif, proforma ve faturalama süreçlerini otomatikleştirir.
- **Fiyatlar:** Solo Core: 7.500 TL/ay | Enterprise Prime: 14.999,98 TL/ay.
- **Özellikler:** Sınırsız fatura ve teklif hazırlama, PDF tasarım motoru, tekrarlayan faturalandırma (cron), müşteri self-servis portalı, çoklu şirket ve ekip yetkilendirmesi (RBAC).

### 5.4. ScoreForm — Müşteri Deneyimi ve İtibar Yönetimi
- **Genel Tanım:** QR kod, SMS ve WhatsApp üzerinden müşteri geri bildirimlerini toplayan akıllı memnuniyet platformu.
- **Fiyatlar:** Temel Paket: 5.000 TL/ay | Pro Büyüme Paketi: 7.500 TL/ay.
- **Çalışma Prensibi:** Memnun kalan (yüksek puanlı) müşterileri tek tıkla Google Haritalar'a 5 yıldızlı yorum bırakmaya yönlendirir; düşük puan ve şikayetleri ise kamuya açık platformlara gitmeden önce özel uyarı olarak yöneticiye bildirir.

### 5.5. Kuşçu — Finansal Analiz ve Piyasa Zekası Platformu
- **Genel Tanım:** BIST, döviz kurları, şirket bilançoları ve küresel piyasa haberlerini yapay zekâ duygu analiziyle tarayan platform.
- **Fiyatlar:** Kuşçu Başlangıç: 15.000 TL/ay | Kuşçu Pro: 25.000 TL/ay | Kuşçu Kurumsal: 35.000 TL/ay.

---

## 6. Genç Girişimci Desteği
- **Kapsam:** Yeni iş kuran ve e-ticarete atılan genç girişimcilere anahtar teslim ikas e-ticaret sitesi, nişe özel ürün tedariki, depolama, sipariş paketleme ve kargoya teslimat (fulfillment) operasyonu tek çatı altında sağlanır.
- **Başvuru:** Web sitemizdeki Genç Girişimci Desteği sayfası üzerinden ön başvuru formu doldurularak ekibimizle iletişime geçilebilir.

---

## 7. Matbaa ve Kurumsal Baskı Ürünleri
- **Katalog:** Tutkallı bloknot, kartvizit çeşitleri, broşür/el ilanı, cepli dosya, antetli kağıt, etiket/sticker ve promosyon ürünleri.
- **Sipariş:** Web sitemizin Mağaza (/magaza) bölümünden ölçü, adet ve kağıt gramajı seçilerek doğrudan online sipariş verilebilir.
- **Ödeme:** PayTR altyapısıyla kredi kartı ve banka kartı ile güvenli ödeme imkânı.

---

## 8. Genel Fiyatlandırma, Faturalandırma ve Müşteri Destek Politikası
1. **Fiyat Doğruluğu:** Müşteri hizmetleri asistanı yalnızca sistemde doğrulanmış fiyatları paylaşır. Sistemde yer almayan özel indirimler, bedava hizmetler veya uydurma kampanyalar taahhüt etmez.
2. **Bilgi Bulunamadığında:** Bilgi tabanında kesinleşmemiş teknik gereksinimler veya fiyatlar söz konusu olduğunda asistan durumu dürüstçe belirtir ve müşteriden telefon numarası talep ederek yetkili temsilcimize yönlendirme sağlar.
3. **Müşteri Temsilcisine Aktarım:** Ziyaretçi "biriyle görüşmek istiyorum", "özel teklif almak istiyorum", "beni arayın" gibi taleplerde bulunduğunda veya bilgi yetersiz kaldığında güvenli iletişim formu açılarak telefon numarası alınır ve CRM destek havuzuna kaydedilir.
4. **WhatsApp Destek Kanalı:** Web sitemizde genel ziyaretçilere yönelik harici bir WhatsApp canlı destek hattı bulunmamaktadır; tüm destek ve sorular web sitemizdeki bu merkezi Müşteri Hizmetleri penceresi üzerinden karşılanmaktadır. Ancak ürünlerimizin (Midvem gibi) müşterilerin kendi kurumsal WhatsApp Business hesaplarını sisteme bağlayabilme özelliği eksiksiz olarak mevcuttur.`;

  const parsed = await parseKnowledgeFile(fileName, Buffer.from(content, "utf8"));

  if (existing) {
    console.log(`Updating existing document (ID: ${existing.id})...`);
    // Delete old chunks
    await prisma.knowledgeChunk.deleteMany({
      where: { documentId: existing.id },
    });

    await prisma.knowledgeDocument.update({
      where: { id: existing.id },
      data: {
        title: "Çiçekana Tech Media — Kurumsal Bilgi Bankası, Hizmetler ve Çözüm Rehberi",
        description: "Web sitesi genelindeki tüm hizmetler, e-ticaret, web yazılım, AI otomasyonları ve kurumsal fiyatlandırma rehberi.",
        rawContent: parsed.rawContent,
        cleanContent: parsed.cleanContent,
        fileSize: Buffer.from(content).length,
        status: "ACTIVE",
        statusMessage: "Web sitesi geneli merkezi bilgi tabanı olarak güncellendi.",
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
    console.log(`Updated document with ${parsed.chunks.length} chunks.`);
  } else {
    const doc = await prisma.knowledgeDocument.create({
      data: {
        title: "Çiçekana Tech Media — Kurumsal Bilgi Bankası, Hizmetler ve Çözüm Rehberi",
        description: "Web sitesi genelindeki tüm hizmetler, e-ticaret, web yazılım, AI otomasyonları ve kurumsal fiyatlandırma rehberi.",
        fileName,
        fileType: "md",
        fileSize: Buffer.from(content).length,
        rawContent: parsed.rawContent,
        cleanContent: parsed.cleanContent,
        category: "Genel",
        status: "ACTIVE",
        statusMessage: "Web sitesi geneli merkezi bilgi tabanı olarak aktif edildi.",
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
    console.log(`Created new document (ID: ${doc.id}) with ${parsed.chunks.length} chunks.`);
  }
}

seedCentralKnowledge()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
