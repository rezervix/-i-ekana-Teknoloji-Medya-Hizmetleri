"use client";

import React, { useEffect, useState } from "react";
import Icon from "./AppIcon";

export default function MeetingScheduler() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#schedule") {
        setIsOpen(true);
        // Remove hash to allow re-triggering from links
        window.history.pushState("", document.title, window.location.pathname + window.location.search);
      }
    };
    
    // Check initial hash
    if (window.location.hash === "#schedule") handleHashChange();

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-primary/95 backdrop-blur-md transition-opacity duration-500" 
        onClick={() => setIsOpen(false)}
      />
      
      {/* Modal */}
      <div className="relative bg-white border border-primary/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-none shadow-2xl z-10 flex flex-col intro-animation">
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 text-secondary hover:text-primary transition-colors"
        >
          <Icon name="XMarkIcon" size={24} />
        </button>

        <div className="p-8 md:p-12">
           <h3 className="font-display text-3xl text-primary mb-2">Stratejik Görüşme Planla</h3>
           <p className="font-body text-secondary text-[14px] mb-8">Takvimimizden size uygun olan zaman dilimini seçin. Proje yöneticilerimiz altyapınız için size geri dönüş sağlayacaktır.</p>
           
           <div className="border border-primary/10 p-12 flex flex-col items-center justify-center bg-bg-soft mb-6">
              <Icon name="CalendarIcon" size={48} className="text-auxiliary mb-4" />
              <p className="font-display text-primary text-xl mb-4">Takvim Yükleniyor...</p>
              <p className="font-body text-[12px] text-secondary text-center max-w-xs">Bu alana iframe tabanlı Calendly veya benzeri bir kurumsal takvim widget'ı entegre edilecektir.</p>
           </div>
           
           <div className="flex items-center gap-3 bg-bg-soft p-4 border border-primary/5">
              <Icon name="ShieldCheckIcon" size={24} className="text-primary/40 flex-shrink-0" />
              <p className="font-body text-[11px] text-secondary leading-relaxed">
                Görüşmelerimiz Gizlilik Sözleşmesi (NDA) kapsamında yürütülmektedir. Proje detaylarınız dışarıya aktarılmaz.
              </p>
           </div>
        </div>
      </div>
      
      <style jsx>{`
        .intro-animation {
          animation: fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
