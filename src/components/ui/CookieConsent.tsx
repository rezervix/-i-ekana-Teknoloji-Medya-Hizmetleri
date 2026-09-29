"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Cookie } from "lucide-react";
import {useTranslations} from 'next-intl';

const STORAGE_KEY = "cicekana-cookie-consent";

export default function CookieConsent() {
  const t = useTranslations();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Small delay so it doesn't flash immediately on load
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem(STORAGE_KEY, "rejected");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-[200] bg-white border-t border-corp-border shadow-corp-nav"
          role="dialog"
          aria-label={t('cookie.title')}
          aria-live="polite"
        >
          <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Message */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Cookie
                size={18}
                className="text-corp-teal flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="font-body text-[13px] text-corp-gray leading-relaxed">
                {t('cookie.description')}{" "}
                <Link
                  href="/privacy"
                  className="text-corp-teal hover:underline font-medium"
                >
                  {t('footer.privacy')}
                </Link>{" "}
                ve{" "}
                <Link
                  href="/kvkk"
                  className="text-corp-teal hover:underline font-medium"
                >
                  {t('common.legalNotice')}
                </Link>
                'ni inceleyebilirsiniz.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={reject}
                className="px-4 py-2 rounded-md font-body text-[13px] font-semibold text-corp-gray border border-corp-border hover:bg-corp-surface transition-all duration-200"
              >
                {t('cookie.reject')}
              </button>
              <button
                onClick={accept}
                className="px-5 py-2 rounded-md font-body text-[13px] font-semibold text-white bg-corp-teal hover:bg-corp-teal-600 transition-all duration-200 shadow-[0_2px_12px_rgba(10,77,104,0.2)]"
              >
                {t('cookie.accept')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
