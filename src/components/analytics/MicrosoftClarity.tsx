"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const STORAGE_KEY = "cicekana-cookie-consent";
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "cicekana_clarity";

/**
 * Microsoft Clarity Oturum Kaydı & Heatmap Entegrasyonu
 * Faz 4 Çerez onayına saygılı çalışır: Yalnızca onay verildikten sonra (accepted) yüklenir.
 */
export default function MicrosoftClarity() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // 1. Mevcut onay kontrolü
    const checkConsent = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "accepted") {
        setHasConsent(true);
      }
    };

    checkConsent();

    // 2. Kullanıcı onay verdiğinde anında yüklenmesi için dinleyici
    const handleConsentUpdate = () => {
      checkConsent();
    };

    window.addEventListener("cookie-consent-updated", handleConsentUpdate);
    window.addEventListener("storage", handleConsentUpdate);

    return () => {
      window.removeEventListener("cookie-consent-updated", handleConsentUpdate);
      window.removeEventListener("storage", handleConsentUpdate);
    };
  }, []);

  if (!hasConsent) {
    return null;
  }

  return (
    <Script
      id="microsoft-clarity-init"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `,
      }}
    />
  );
}
