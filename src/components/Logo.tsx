import Image from "next/image";

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Global Logo component — tek kaynak, tüm yerlerde kullanılır.
 * Varsayılan boyut: 36x36px
 */
export default function Logo({ width = 36, height = 36, className }: LogoProps) {
  return (
    <Image
      src="/assets/images/logo.png"
      alt="Çiçekana Logo"
      width={width}
      height={height}
      className={className ?? "object-contain"}
      priority
    />
  );
}
