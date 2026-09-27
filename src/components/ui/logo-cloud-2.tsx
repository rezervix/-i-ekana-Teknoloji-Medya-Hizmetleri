import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Logo = { src: string; alt: string; width?: number; height?: number };

type LogoCloudProps = React.ComponentProps<"div"> & { logos: Logo[] };

export function LogoCloud({ className, logos, ...props }: LogoCloudProps) {
  const gridCols = logos.length >= 4 ? 4 : logos.length >= 2 ? 2 : 1;
  
  return (
    <div className={cn("grid gap-4", className)} {...props}>
      {logos.map((logo, index) => {
        const isEvenRow = Math.floor(index / gridCols) % 2 === 0;
        const isEvenCol = index % gridCols % 2 === 0;
        const bgColor = isEvenRow === isEvenCol ? "bg-white" : "bg-corp-surface";
        const borderColor = isEvenRow === isEvenCol ? "border-corp-border" : "border-corp-border/50";
        
        return (
          <div
            key={index}
            className={cn(
              "relative aspect-square rounded-sm border p-6 flex items-center justify-center overflow-hidden transition-all hover:shadow-corp-card",
              bgColor,
              borderColor
            )}
          >
            {/* Corner plus signs */}
            <div className="absolute top-2 left-2 w-3 h-3 flex items-center justify-center">
              <PlusIcon size={8} className="text-corp-gray/30" />
            </div>
            <div className="absolute top-2 right-2 w-3 h-3 flex items-center justify-center">
              <PlusIcon size={8} className="text-corp-gray/30" />
            </div>
            <div className="absolute bottom-2 left-2 w-3 h-3 flex items-center justify-center">
              <PlusIcon size={8} className="text-corp-gray/30" />
            </div>
            <div className="absolute bottom-2 right-2 w-3 h-3 flex items-center justify-center">
              <PlusIcon size={8} className="text-corp-gray/30" />
            </div>
            
            {/* Logo */}
            {logo.src ? (
              <img
                src={logo.src}
                alt={logo.alt}
                className="max-w-[80%] max-h-[60%] object-contain grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100"
                style={{ width: logo.width, height: logo.height }}
              />
            ) : (
              <span className="text-corp-gray font-display font-semibold text-sm">
                {logo.alt}
              </span>
            )}
          </div>
        );
      })}
      
      {/* Fill empty cells for grid alignment */}
      {logos.length % gridCols !== 0 && 
        Array.from({ length: gridCols - (logos.length % gridCols) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square rounded-sm border border-transparent"
          />
        ))
      }
    </div>
  );
}
