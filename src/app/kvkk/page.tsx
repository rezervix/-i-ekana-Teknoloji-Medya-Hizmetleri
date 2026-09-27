import React from "react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni — Çiçekana",
  description: "KVKK kapsamında kişisel verilerin işlenmesi hakkında aydınlatma metni.",
};

export default function KVKKPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <section className="pt-40 pb-28">
        <div className="max-w-4xl mx-auto px-6 md:px-10 lg:px-16">
          <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">
            Yasal
          </span>
          <h1 className="font-display text-4xl md:text-5xl text-corp-charcoal tracking-tight mb-10">
            KVKK Aydınlatma Metni
          </h1>
          <div className="prose prose-lg max-w-none
            prose-headings:font-display prose-headings:text-corp-charcoal prose-headings:tracking-tight
            prose-p:text-corp-gray prose-p:font-body prose-p:leading-relaxed
            prose-strong:text-corp-charcoal
            prose-a:text-corp-teal prose-a:no-underline hover:prose-a:underline
            prose-ul:text-corp-gray prose-li:text-corp-gray
            prose-hr:border-corp-border">
            <p><strong>Son güncelleme:</strong> 9 Nisan 2026</p>
            <h2>1. Veri Sorumlusunun Kimliği</h2>
            <p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca kişisel verileriniz, veri sorumlusu sıfatıyla <strong>Çiçekana Teknoloji ve Medya Hizmetleri</strong> ("Şirket") tarafından aşağıda açıklanan amaçlar kapsamında işlenecektir.</p>
            <h2>2. İşlenen Kişisel Veriler</h2>
            <p>İletişim formu aracılığıyla toplanan kişisel veriler: <strong>ad, unvan, şirket adı, e-posta adresi, sektör ve proje bilgileri.</strong></p>
            <h2>3. Kişisel Verilerin İşlenme Amaçları</h2>
            <ul>
              <li>Hizmet teklifi ve danışmanlık süreçlerinin yürütülmesi</li>
              <li>Müşteri ilişkileri yönetimi</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
              <li>Ticari elektronik ileti gönderilmesi (açık rıza ile)</li>
            </ul>
            <h2>4. Kişisel Verilerin Aktarılması</h2>
            <p>Kişisel verileriniz, yasal zorunluluklar ve meşru menfaat kapsamı dışında üçüncü kişi ve kuruluşlarla paylaşılmamaktadır. Kullanılan bulut altyapıları GDPR uyumlu hizmet sağlayıcılarından oluşmaktadır.</p>
            <h2>5. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi</h2>
            <p>Kişisel verileriniz, web sitesi iletişim formu aracılığıyla elektronik ortamda, <strong>sözleşmenin kurulması veya ifası</strong> ve <strong>meşru menfaat</strong> hukuki sebeplerine dayanılarak işlenmektedir.</p>
            <h2>6. Kişisel Veri Sahibinin Hakları</h2>
            <p>KVKK'nın 11. maddesi kapsamında; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme ve KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme, itiraz etme ile zararın giderilmesini talep etme haklarına sahipsiniz.</p>
            <h2>7. İletişim</h2>
            <p>Haklarınızı kullanmak için <a href="mailto:kvkk@cicekanatechmedia.com">kvkk@cicekanatechmedia.com</a> adresine yazılı başvuruda bulunabilirsiniz.</p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
