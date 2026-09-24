"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

export type SubMenuItem = {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  link?: string;
};

export type SubMenu = {
  title: string;
  items: SubMenuItem[];
};

export type NavItem = {
  id: number;
  label: string;
  subMenus?: SubMenu[];
  link?: string;
};

type Props = {
  navItems: NavItem[];
};

export function DropdownNavigation({ navItems }: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isHover, setIsHover] = useState<number | null>(null);

  const handleHover = (menuLabel: string | null) => {
    setOpenMenu(menuLabel);
  };

  return (
    <nav className="relative flex items-center justify-center">
      <ul className="relative flex items-center space-x-1">
        {navItems.map((navItem) => (
          <li
            key={navItem.label}
            className="relative"
            onMouseEnter={() => handleHover(navItem.label)}
            onMouseLeave={() => handleHover(null)}
          >
            {navItem.link && !navItem.subMenus ? (
              <Link
                href={navItem.link}
                className="text-[14px] font-medium py-2 px-4 flex cursor-pointer group transition-colors duration-300 items-center justify-center gap-1 text-corp-charcoal hover:text-corp-teal relative rounded-full"
                onMouseEnter={() => setIsHover(navItem.id)}
                onMouseLeave={() => setIsHover(null)}
              >
                <span className="relative z-10">{navItem.label}</span>
                {isHover === navItem.id && (
                  <motion.div
                    layoutId="hover-bg"
                    className="absolute inset-0 size-full bg-corp-teal-50"
                    style={{ borderRadius: 99 }}
                  />
                )}
              </Link>
            ) : (
              <button
                className="text-[14px] font-medium py-2 px-4 flex cursor-pointer group transition-colors duration-300 items-center justify-center gap-1 text-corp-charcoal hover:text-corp-teal relative rounded-full"
                onMouseEnter={() => setIsHover(navItem.id)}
                onMouseLeave={() => setIsHover(null)}
              >
                <span className="relative z-10">{navItem.label}</span>
                {navItem.subMenus && (
                  <ChevronDown
                    className={`h-4 w-4 relative z-10 duration-300 transition-transform ${
                      openMenu === navItem.label ? "rotate-180 text-corp-teal" : "text-corp-gray group-hover:rotate-180"
                    }`}
                  />
                )}
                {(isHover === navItem.id || openMenu === navItem.label) && (
                  <motion.div
                    layoutId="hover-bg"
                    className="absolute inset-0 size-full bg-corp-teal-50"
                    style={{ borderRadius: 99 }}
                  />
                )}
              </button>
            )}

            <AnimatePresence>
              {openMenu === navItem.label && navItem.subMenus && (
                <div className="w-auto absolute left-0 top-full pt-2 z-50">
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="bg-white border border-corp-border p-5 w-max shadow-corp-hover"
                    style={{ borderRadius: 16 }}
                    layoutId="menu"
                  >
                    <div className="w-fit shrink-0 flex space-x-8 overflow-hidden">
                      {navItem.subMenus.map((sub) => (
                        <motion.div layout={true} className="w-full" key={sub.title}>
                          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-corp-gray">
                            {sub.title}
                          </h3>
                          <ul className="space-y-4">
                            {sub.items.map((item) => {
                              const Icon = item.icon;
                              return (
                                <li key={item.label}>
                                  <Link
                                    href={item.link || "#"}
                                    onClick={() => setOpenMenu(null)}
                                    className="flex items-start space-x-3 group p-1.5 -m-1.5 rounded-lg hover:bg-corp-surface transition-colors"
                                  >
                                    <div className="border border-corp-border text-corp-charcoal rounded-md flex items-center justify-center size-9 shrink-0 group-hover:bg-corp-teal group-hover:text-white group-hover:border-corp-teal transition-colors duration-300">
                                      <Icon className="h-5 w-5 flex-none" />
                                    </div>
                                    <div className="leading-5 w-max max-w-[220px]">
                                      <p className="text-sm font-semibold text-corp-charcoal shrink-0 group-hover:text-corp-teal transition-colors duration-300">
                                        {item.label}
                                      </p>
                                      <p className="text-xs text-corp-gray shrink-0 group-hover:text-corp-charcoal transition-colors duration-300 line-clamp-1 mt-0.5">
                                        {item.description}
                                      </p>
                                    </div>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
    </nav>
  );
}
