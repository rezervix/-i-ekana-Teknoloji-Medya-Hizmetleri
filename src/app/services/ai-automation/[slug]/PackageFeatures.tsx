"use client";

import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type PackageFeaturesProps = { features: string[] };

function splitFeature(feature: string) {
  const separator = feature.indexOf(": ");
  if (separator === -1) return { title: null, description: feature };
  return { title: feature.slice(0, separator), description: feature.slice(separator + 2) };
}

export default function PackageFeatures({ features }: PackageFeaturesProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleFeatures = expanded ? features : features.slice(0, 6);
  const remaining = Math.max(features.length - 6, 0);

  if (!features.length) return null;

  return (
    <div className="mt-6 border-t border-border-light pt-5">
      <ul className="space-y-3" aria-label="Paket özellikleri">
        {visibleFeatures.map((feature, index) => {
          const { title, description } = splitFeature(feature);
          return (
            <li key={`${feature}-${index}`} className="flex gap-3 text-sm leading-6 text-corp-charcoal">
              <Check aria-hidden="true" className="mt-1 shrink-0 text-corp-coral" size={17} />
              <span>{title ? <><strong>{title}</strong>{`: ${description}`}</> : description}</span>
            </li>
          );
        })}
      </ul>
      {remaining > 0 ? (
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-corp-teal underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corp-coral focus-visible:ring-offset-2">
          {expanded ? "Daha az göster" : `Tüm özellikleri göster (+${remaining})`}
          {expanded ? <ChevronUp aria-hidden="true" size={16} /> : <ChevronDown aria-hidden="true" size={16} />}
        </button>
      ) : null}
    </div>
  );
}
