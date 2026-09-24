import React from "react";
import Icon from "@/components/ui/AppIcon";

export default function InfrastructureSection() {
  return (
    <section className="py-24 bg-primary text-white border-y border-white/10 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-white/5 via-primary to-primary opacity-50" />
      
      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="flex flex-col">
            <span className="font-body text-[10px] text-auxiliary/70 tracking-ultra uppercase font-bold mb-4">
              Kurumsal Güvenlik ve Kontrol
            </span>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-6">
              Tam Veri Egemenliği ve On-Premise Güvenlik
            </h2>
            <p className="font-body text-[15px] text-white/60 leading-relaxed mb-8">
              Şirketinizin stratejik verilerini ve CRM gibi çekirdek operasyon sistemlerini dışarıya veri sızdırmayacak şekilde tamamen kurum içi fiziksel Ubuntu sunucularınızda ayağa kaldırıyoruz.
            </p>
            
            <div className="flex flex-col gap-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                   <Icon name="ServerStackIcon" size={24} className="text-auxiliary" />
                </div>
                <div>
                   <h4 className="font-body font-bold text-white text-[15px] mb-1">Fiziksel Sunucu Barındırma (On-Premise)</h4>
                   <p className="font-body text-[13px] text-white/50 leading-relaxed">Projeler kapalı devre ağlarda (İntranet, VPN vb.) çalışır. Kurumsal güvenliğiniz risk edilmeden %100 kontrol sizde olur.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1">
                   <Icon name="CloudIcon" size={24} className="text-white/40" />
                </div>
                <div>
                   <h4 className="font-body font-bold text-white text-[15px] mb-1">Ölçeklenebilir Bulut Mimarisi (Cloud)</h4>
                   <p className="font-body text-[13px] text-white/50 leading-relaxed">Alternatif olarak global operasyonlarınız için yüksek erişilebilirlikli, yedekli bulut (Cloud) sunucular kurgularız.</p>
                </div>
              </div>
            </div>
            
            <a href="#schedule" className="inline-flex items-center gap-3 self-start text-white border border-white/20 hover:bg-white/10 px-6 py-4 font-body text-[13px] uppercase tracking-wide font-bold transition-all duration-300 rounded-none bg-white/[0.03]">
              Altyapınızı Değerlendirelim
              <Icon name="ArrowRightIcon" size={16} />
            </a>
          </div>

          {/* Architecture mockup */}
          <div className="relative border border-white/10 bg-white/5 p-6 md:p-10 backdrop-blur-sm">
             <div className="absolute -top-3 left-6 px-3 bg-primary text-[10px] uppercase font-bold text-auxiliary tracking-widest border border-white/10">Architecture Schema</div>
             <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-center justify-between border border-white/10 bg-primary/80 p-4 relative overflow-hidden group hover:bg-primary transition-colors">
                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500/50" />
                   <div className="flex items-center gap-3">
                      <Icon name="ShieldCheckIcon" size={20} className="text-green-500/80" />
                      <span className="font-body text-[13px] font-bold tracking-wide">Özel Güvenlik Duvarı (Firewall)</span>
                   </div>
                   <span className="font-body text-[10px] text-white/30 uppercase tracking-widest block">Aktif Yönlendirme</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="border border-white/10 bg-primary/50 p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors">
                      <Icon name="ServerStackIcon" size={32} className="text-auxiliary" />
                      <span className="font-body text-[12px] font-bold">Veritabanı Düğümü</span>
                      <span className="font-body text-[9px] text-white/40 uppercase tracking-widest">Kapalı Port (DB)</span>
                   </div>
                   <div className="border border-white/10 bg-primary/50 p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors">
                      <Icon name="CpuChipIcon" size={32} className="text-white" />
                      <span className="font-body text-[12px] font-bold">Uygulama Düğümü</span>
                      <span className="font-body text-[9px] text-white/40 uppercase tracking-widest">Next.js Çekirdeği</span>
                   </div>
                </div>
                
                <div className="mt-4 flex flex-col items-center border border-white/10 bg-black/40 p-5 hover:bg-black/60 transition-colors">
                   <p className="font-body text-[11px] text-white/60 mb-3 font-semibold uppercase tracking-wider">Kurum İçi İntranet Ağı / İsteğe Bağlı SSL</p>
                   <div className="flex gap-3">
                       <span className="w-2 h-2 rounded-full bg-green-500/50 block animate-ping" />
                       <span className="w-2 h-2 rounded-full bg-green-500/50 block animate-ping delay-100" />
                       <span className="w-2 h-2 rounded-full bg-green-500/50 block animate-ping delay-200" />
                   </div>
                </div>
             </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
