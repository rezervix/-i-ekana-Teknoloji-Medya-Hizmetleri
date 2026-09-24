"use client";
import Image from "next/image";
import { useState, useEffect } from "react";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
}

/**
 * SafeImage — a robust image component that falls back to a placeholder
 * when the image fails to load. Supports both next/image (if width/height/fill are provided)
 * and standard <img> tags for maximum layout compatibility.
 */
export function SafeImage({
  src,
  alt,
  fallback = "/placeholder.webp",
  width,
  height,
  fill,
  priority,
  className,
  ...props
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src || fallback);

  useEffect(() => {
    setImgSrc(src || fallback);
  }, [src, fallback]);

  // Use next/image if Next.js specific layout properties are provided
  const useNextImage = fill || (width !== undefined && height !== undefined);

  if (useNextImage) {
    return (
      <Image
        {...(props as any)}
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        priority={priority}
        className={className}
        onError={() => {
          if (imgSrc !== fallback) {
            setImgSrc(fallback);
          }
        }}
      />
    );
  }

  // Fallback to standard <img> with fallback capabilities
  return (
    <img
      {...props}
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (imgSrc !== fallback) {
          setImgSrc(fallback);
        }
      }}
    />
  );
}
