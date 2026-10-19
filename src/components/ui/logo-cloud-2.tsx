import React from "react";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Logo = {
  id?: string;
  src?: string;
  logoUrl?: string;
  alt?: string;
  name?: string;
  websiteUrl?: string | null;
  width?: number;
  height?: number;
};

export const DEFAULT_LOGOS: Logo[] = [
  {
    src: "https://cdn.21st.dev/assets/mirror/bd/bdf5f3ae72bcfda892a686c03b7932985c694e9a9828643c980601bbc9e53cb4.svg",
    alt: "Nvidia Logo",
  },
  {
    src: "https://cdn.21st.dev/assets/mirror/31/319eeae853dd1af99d442b6c16b6c38dc52a66a719f8e502c65f85d26255cbd3.svg",
    alt: "Supabase Logo",
  },
  {
    src: "https://cdn.21st.dev/assets/mirror/90/90f01a9537335666282ae5acc80bd4305f86d085a92d60904c3aa3ccc4414570.svg",
    alt: "GitHub Logo",
  },
  {
    src: "https://cdn.21st.dev/assets/mirror/2b/2bcdd4124223e3bf8e66bc08ce0ac32a6cc42ffe3584bbecfd377847176a188d.svg",
    alt: "OpenAI Logo",
  },
  {
    src: "https://cdn.21st.dev/assets/mirror/fc/fc7b090ebcfc468d24a1dc482b2db1fcbfd99ca14568552a30ce553d6dda7fcb.svg",
    alt: "Turso Logo",
  },
  {
    src: "https://cdn.21st.dev/assets/mirror/96/96517bce3574d648280ff639d01d9889f354b488b3f826db5df746d730232a0c.svg",
    alt: "Clerk Logo",
  },
  {
    src: "https://cdn.21st.dev/assets/mirror/e8/e8514b1206f79e1abdafcc1d2632393cc7cfbcbbe25426ac5143b17b184b56b8.svg",
    alt: "Claude AI Logo",
  },
  {
    src: "https://cdn.21st.dev/assets/mirror/56/5624b7c243ac8d60e848fb5ea222ec932c1600df54a2762238b37498372fb0c8.svg",
    alt: "Vercel Logo",
  },
];

export type LogoCloudProps = React.ComponentProps<"div"> & {
  logos?: Logo[];
};

export function LogoCloud({ className, logos, ...props }: LogoCloudProps) {
  // Normalize incoming logos or fallback to default
  const rawList = logos && logos.length > 0 ? logos : DEFAULT_LOGOS;
  const items: Logo[] = rawList.map((item, idx) => ({
    id: item.id || `logo-${idx}`,
    src: item.logoUrl || item.src || "",
    alt: item.name || item.alt || "Marka Logosu",
    websiteUrl: item.websiteUrl || null,
    width: item.width,
    height: item.height,
  }));

  // Ensure grid is balanced to a multiple of 4 (min 8 items if small set)
  const targetLength = items.length < 8 ? 8 : Math.ceil(items.length / 4) * 4;
  const paddedItems: Array<Logo | null> = [...items];
  while (paddedItems.length < targetLength) {
    paddedItems.push(null);
  }

  const total = paddedItems.length;
  const totalRowsDesktop = Math.ceil(total / 4);
  const totalRowsMobile = Math.ceil(total / 2);

  return (
    <div
      className={cn(
        "relative grid grid-cols-2 border-x border-border md:grid-cols-4",
        className
      )}
      {...props}
    >
      {/* Top full-width hairline border */}
      <div className="-translate-x-1/2 -top-px pointer-events-none absolute left-1/2 w-screen border-t border-border" />

      {paddedItems.map((logo, index) => {
        const colDesktop = index % 4;
        const rowDesktop = Math.floor(index / 4);
        const colMobile = index % 2;
        const rowMobile = Math.floor(index / 2);

        // Checkerboard backgrounds
        const isDesktopSecondary = (rowDesktop + colDesktop) % 2 === 0;
        const isMobileSecondary = (rowMobile + colMobile) % 2 === 0;

        // Borders
        const hasBorderRightDesktop = colDesktop < 3;
        const hasBorderBottomDesktop = rowDesktop < totalRowsDesktop - 1;
        const hasBorderRightMobile = colMobile === 0;
        const hasBorderBottomMobile = rowMobile < totalRowsMobile - 1;

        // Plus icon at bottom-right corner intersections
        const isCrossDesktop = hasBorderRightDesktop && hasBorderBottomDesktop;
        const isCrossMobile = hasBorderRightMobile && hasBorderBottomMobile;

        const cellClasses = cn(
          "relative flex items-center justify-center p-6 md:p-8 min-h-[100px] md:min-h-[120px] transition-all duration-300 group",
          // Backgrounds
          isMobileSecondary
            ? "bg-secondary dark:bg-secondary/30"
            : "bg-background dark:bg-background",
          isDesktopSecondary
            ? "md:bg-secondary md:dark:bg-secondary/30"
            : "md:bg-background md:dark:bg-background",
          // Mobile borders
          hasBorderRightMobile && "border-r border-border",
          hasBorderBottomMobile && "border-b border-border",
          // Desktop borders
          hasBorderRightDesktop ? "md:border-r md:border-border" : "md:border-r-0",
          hasBorderBottomDesktop ? "md:border-b md:border-border" : "md:border-b-0"
        );

        return (
          <LogoCardWrapper
            key={logo?.id || `empty-${index}`}
            logo={logo}
            className={cellClasses}
          >
            {isCrossDesktop && isCrossMobile && (
              <PlusIcon
                className="-right-[12.5px] -bottom-[12.5px] absolute z-10 size-6 text-muted-foreground/50 pointer-events-none"
                strokeWidth={1}
              />
            )}
            {isCrossDesktop && !isCrossMobile && (
              <PlusIcon
                className="-right-[12.5px] -bottom-[12.5px] absolute z-10 size-6 text-muted-foreground/50 pointer-events-none hidden md:block"
                strokeWidth={1}
              />
            )}
            {!isCrossDesktop && isCrossMobile && (
              <PlusIcon
                className="-right-[12.5px] -bottom-[12.5px] absolute z-10 size-6 text-muted-foreground/50 pointer-events-none md:hidden"
                strokeWidth={1}
              />
            )}
          </LogoCardWrapper>
        );
      })}

      {/* Bottom full-width hairline border */}
      <div className="-translate-x-1/2 -bottom-px pointer-events-none absolute left-1/2 w-screen border-b border-border" />
    </div>
  );
}

interface LogoCardWrapperProps extends React.ComponentProps<"div"> {
  logo: Logo | null;
}

function LogoCardWrapper({ logo, className, children, ...props }: LogoCardWrapperProps) {
  if (!logo) {
    return (
      <div className={className} {...props}>
        <div className="w-12 h-2 rounded bg-border/20" />
        {children}
      </div>
    );
  }

  const content = (
    <>
      {logo.src ? (
        <img
          alt={logo.alt || "Marka"}
          className={cn(
            "pointer-events-none select-none object-contain transition-all duration-300",
            "max-h-8 md:max-h-10 w-auto max-w-[75%]",
            "mix-blend-multiply dark:mix-blend-normal",
            "opacity-85 group-hover:opacity-100 group-hover:scale-105"
          )}
          height={logo.height || "auto"}
          src={logo.src}
          width={logo.width || "auto"}
          loading="lazy"
        />
      ) : (
        <span className="font-display font-semibold text-xs md:text-sm text-corp-charcoal dark:text-neutral-200 tracking-wide select-none group-hover:text-corp-teal dark:group-hover:text-white transition-colors text-center px-2">
          {logo.alt}
        </span>
      )}
      {children}
    </>
  );

  if (logo.websiteUrl) {
    return (
      <a
        href={logo.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={logo.alt}
        className={cn(className, "cursor-pointer hover:bg-corp-teal-50/30 transition-colors")}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={className} {...props}>
      {content}
    </div>
  );
}
