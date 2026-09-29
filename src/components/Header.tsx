"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  CreditCard,
  ChevronDown,
  LogOut,
  User,
  BrainCircuit,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import CartButton from "./CartButton";
import Logo from "./Logo";
import { DropdownNavigation, type NavItem } from "@/components/ui/dropdown-navigation";
import LocaleSwitcher from './LocaleSwitcher';
import {useTranslations} from 'next-intl';

export default function Header() {
  const t = useTranslations();
  const navItems: NavItem[] = [
    {id: 1, label: t('nav.services'), subMenus: [{title: t('nav.services'), items: [{label: t('nav.services'), description: t('home.description'), icon: BrainCircuit, link: '/services/ai-automation'}]}]},
    {id: 2, label: t('nav.projects'), link: '/projects'},
    {id: 3, label: t('nav.blog'), link: '/blog'},
  ];
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: session, status } = useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-white transition-all duration-300 ${
          scrolled ? "shadow-corp-nav border-b border-corp-border" : "border-b border-transparent"
        }`}
      >
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/homepage" className="flex items-center gap-2.5 group flex-shrink-0">
            <Logo width={36} height={36} />
            <div className="flex flex-col leading-none">
              <span className="font-display text-[13px] font-bold tracking-wide text-corp-charcoal">
                ÇİÇEKANA
              </span>
              <span className="font-body text-[9px] tracking-widest font-medium text-corp-gray uppercase mt-0.5">
                TEKNOLOJİ & MEDYA
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center">
            <DropdownNavigation navItems={navItems} />
          </div>

          {/* CTA — Auth buttons or user session */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <LocaleSwitcher />
            <CartButton />
            {status === "loading" ? (
              <div className="w-32 h-9 rounded-md bg-corp-border animate-pulse" />
            ) : session ? (
              /* Signed-in state */
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-md font-body text-[13px] font-medium text-corp-charcoal hover:bg-corp-teal-50 transition-all duration-200"
                >
                  <div className="w-7 h-7 rounded-full bg-corp-teal flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                    {userInitials}
                  </div>
                  <span className="max-w-[100px] truncate">
                    {session.user?.name?.split(" ")[0] || session.user?.email}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`text-corp-gray transition-transform duration-200 ${
                      userMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 pt-1.5 min-w-[180px] z-50"
                    >
                      <div className="bg-white rounded-xl border border-corp-border shadow-corp-hover py-1.5 overflow-hidden">
                        <Link
                          href="/profile"
                          className="flex items-center gap-2.5 px-4 py-2.5 font-body text-[13px] text-corp-charcoal hover:text-corp-teal hover:bg-corp-teal-50 transition-all"
                        >
                          <User size={14} />
{t('common.profile')}
                        </Link>
                        <Link
                          href="/profile/subscriptions"
                          className="flex items-center gap-2.5 px-4 py-2.5 font-body text-[13px] text-corp-charcoal hover:text-corp-teal hover:bg-corp-teal-50 transition-all"
                        >
                          <CreditCard size={14} />
                          {t('common.subscriptions')}
                        </Link>
                        <button
                          onClick={() => signOut({ callbackUrl: "/homepage" })}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 font-body text-[13px] text-corp-gray hover:text-error hover:bg-error/5 transition-all"
                        >
                          <LogOut size={14} />
{t('common.signOut')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Guest state */
              <>
                <Link
                  href="/auth?tab=signin"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-body font-semibold text-[13px] text-corp-teal border border-corp-teal hover:bg-corp-teal-50 transition-all duration-200 hover:-translate-y-0.5"
                >
                  {t('common.signIn')}
                </Link>
                <Link
                  href="/auth?tab=signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-body font-semibold text-[13px] text-white bg-corp-teal hover:bg-corp-teal-600 transition-all duration-200 hover:-translate-y-0.5 shadow-[0_4px_16px_rgba(10,77,104,0.22)]"
                >
                  {t('common.signUp')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <LocaleSwitcher />
            <CartButton />
            <button
              className="p-2 rounded-md text-corp-charcoal hover:bg-corp-surface transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label={t('common.openMenu')}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white overflow-y-auto"
          >
            <div className="flex items-center justify-between px-6 h-20 border-b border-corp-border">
              <div className="flex items-center gap-2.5">
                <Logo width={36} height={36} />
                <span className="font-display text-[13px] font-bold text-corp-charcoal tracking-wide">
                  ÇİÇEKANA
                </span>
              </div>
              <button
                className="p-2 rounded-md text-corp-gray hover:text-corp-charcoal hover:bg-corp-surface transition-colors"
                onClick={() => setMobileOpen(false)}
                aria-label={t('common.close')}
              >
                <X size={22} />
              </button>
            </div>

            <nav className="flex flex-col p-6 gap-1" aria-label="Mobil menü">
              {navItems.map((link, i) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {link.link && !link.subMenus ? (
                    <Link
                      href={link.link}
                      onClick={() => setMobileOpen(false)}
                      className="block font-display text-[18px] font-semibold text-corp-charcoal hover:text-corp-teal py-3 border-b border-corp-border transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <div className="py-3 border-b border-corp-border">
                      <span className="block font-display text-[18px] font-semibold text-corp-charcoal mb-2">
                        {link.label}
                      </span>
                      {link.subMenus?.map((sub) =>
                        sub.items.map((item) => (
                          <Link
                            key={item.label}
                            href={item.link || "#"}
                            onClick={() => setMobileOpen(false)}
                            className="block font-body text-[14px] text-corp-gray hover:text-corp-teal py-1.5 pl-3 transition-colors"
                          >
                            {item.label}
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Mobile auth buttons */}
              <div className="mt-8 flex flex-col gap-3">
                {session ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-md font-body font-semibold text-[14px] text-corp-teal border border-corp-teal hover:bg-corp-teal-50 transition-colors"
                    >
                      <User size={16} />
                      {t('common.profile')}
                    </Link>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        signOut({ callbackUrl: "/homepage" });
                      }}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-md font-body font-semibold text-[14px] text-corp-gray border border-corp-border hover:bg-corp-surface transition-colors"
                    >
                      <LogOut size={16} />
                      {t('common.signOut')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth?tab=signin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3.5 rounded-md font-body font-semibold text-[14px] text-corp-teal border border-corp-teal hover:bg-corp-teal-50 transition-colors"
                    >
{t('common.signIn')}
                    </Link>
                    <Link
                      href="/auth?tab=signup"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3.5 rounded-md font-body font-semibold text-[14px] text-white bg-corp-teal hover:bg-corp-teal-600 transition-colors"
                    >
{t('common.signUp')}
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
