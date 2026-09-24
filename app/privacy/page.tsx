import React from "react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Gizlilik Politikası — Çiçekana",
  description: "Çiçekana Teknoloji ve Medya gizlilik politikası.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <section className="pt-40 pb-28">
        <div className="max-w-4xl mx-auto px-6 md:px-10 lg:px-16">
          <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">
            Yasal
          </span>
          <h1 className="font-display text-4xl md:text-5xl text-corp-charcoal tracking-tight mb-10">
            Gizlilik Politikası
          </h1>
          <div className="prose prose-lg max-w-none
            prose-headings:font-display prose-headings:text-corp-charcoal prose-headings:tracking-tight
            prose-p:text-corp-gray prose-p:font-body prose-p:leading-relaxed
            prose-strong:text-corp-charcoal
            prose-a:text-corp-teal prose-a:no-underline hover:prose-a:underline
            prose-ul:text-corp-gray prose-li:text-corp-gray
            prose-hr:border-corp-border">
            <p><strong>Son güncelleme:</strong> 9 Nisan 2026</p>
            <h2>1. Giriş</h2>
            <p>Çiçekana Teknoloji ve Medya Hizmetleri olarak, kullanıcılarımızın gizliliğini ciddiye alıyoruz. Bu politika, web sitemizi ziyaret ettiğinizde veya hizmetlerimizi kullandığınızda hangi verileri topladığımızı ve bunları nasıl kullandığımızı açıklar.</p>
            <h2>2. Topladığımız Veriler</h2>
            <ul>
              <li><strong>İletişim verileri:</strong> Form gönderimi sırasında sağlanan e-posta, isim ve şirket bilgileri</li>
              <li><strong>Teknik veriler:</strong> IP adresi, tarayıcı türü, ziyaret edilen sayfalar (anonimleştirilmiş)</li>
              <li><strong>Çerezler:</strong> Oturum çerezleri ve analiz amaçlı çerezler</li>
            </ul>
            <h2>3. Verileri Nasıl Kullanıyoruz</h2>
            <p>Toplanan veriler yalnızca hizmet sunumu, müşteri desteği ve site iyileştirmesi amacıyla kullanılmaktadır. Üçüncü taraflarla satılmaz, kiralanmaz.</p>
            <h2>4. Çerez Politikası</h2>
            <p>Sitemiz oturum yönetimi için zorunlu çerezler kullanmaktadır. Analitik çerezler için ayrı onay alınmaktadır. Çerezleri tarayıcı ayarlarınızdan devre dışı bırakabilirsiniz.</p>
            <h2>5. Veri Güvenliği</h2>
            <p>Verileriniz SSL/TLS şifreleme ile iletilmekte, PostgreSQL üzerinde güvenli biçimde saklanmakta ve düzenli yedeklenmektedir.</p>
            <h2>6. Veri Saklama Süresi</h2>
            <p>İletişim form verileri 3 yıl, analitik veriler 14 ay süreyle saklanmaktadır.</p>
            <h2>7. Haklarınız (GDPR)</h2>
            <p>AB/AEA vatandaşları erişim, düzeltme, silme, taşıma ve işlemeye itiraz haklarına sahiptir. Talepler için: <a href="mailto:privacy@cicekanatechmedia.com">privacy@cicekanatechmedia.com</a></p>
            <h2>8. İletişim</h2>
            <p>Gizlilik ile ilgili sorularınız için: <a href="mailto:privacy@cicekanatechmedia.com">privacy@cicekanatechmedia.com</a></p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
