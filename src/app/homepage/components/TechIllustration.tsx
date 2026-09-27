import React from "react";

export default function TechIllustration() {
  return (
    <svg
      viewBox="0 0 560 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id="tg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0A4D68" />
          <stop offset="100%" stopColor="#0D6585" />
        </linearGradient>
        <linearGradient id="tg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0D6585" />
          <stop offset="100%" stopColor="#1A92B5" />
        </linearGradient>
        <linearGradient id="tg3" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#083D52" />
          <stop offset="100%" stopColor="#0A5D7A" />
        </linearGradient>
        <filter id="cardShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#0A4D68" floodOpacity="0.10" />
        </filter>
        <filter id="pillShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#0A4D68" floodOpacity="0.14" />
        </filter>
      </defs>

      {/* ── Background accent blobs ── */}
      <ellipse cx="310" cy="255" rx="205" ry="185" fill="#EEF6FB" />
      <ellipse cx="90" cy="400" rx="65" ry="55" fill="#FEF0EA" opacity="0.6" />
      <ellipse cx="490" cy="90" rx="80" ry="70" fill="#EEF6FB" opacity="0.55" />

      {/* ── Dot grid (top-right) ── */}
      {[0, 1, 2, 3, 4, 5].map((r) =>
        [0, 1, 2, 3, 4, 5].map((c) => (
          <circle
            key={`dot-${r}-${c}`}
            cx={390 + c * 18}
            cy={130 + r * 18}
            r="2"
            fill="#0A4D68"
            opacity="0.11"
          />
        ))
      )}

      {/* ── Main isometric platform ── */}
      {/* Top face */}
      <path d="M270 275 L380 218 L490 275 L380 332 Z" fill="url(#tg1)" />
      {/* Left face */}
      <path d="M270 275 L380 332 L380 392 L270 335 Z" fill="#073648" />
      {/* Right face */}
      <path d="M490 275 L380 332 L380 392 L490 335 Z" fill="url(#tg3)" />

      {/* ── Upper cube on platform ── */}
      {/* Top face */}
      <path d="M312 205 L380 170 L448 205 L380 240 Z" fill="url(#tg2)" />
      {/* Left face */}
      <path d="M312 205 L380 240 L380 280 L312 245 Z" fill="#0A4D68" />
      {/* Right face */}
      <path d="M448 205 L380 240 L380 280 L448 245 Z" fill="#1080A0" />

      {/* ── Data node on top ── */}
      <circle cx="380" cy="170" r="12" fill="white" stroke="#E8E8EE" strokeWidth="1.5" />
      <circle cx="380" cy="170" r="6" fill="#E8622A" />
      <circle cx="380" cy="170" r="18" fill="#E8622A" opacity="0.12" />

      {/* ── Floating card: top-left dashboard ── */}
      <rect x="30" y="75" width="172" height="118" rx="14" fill="white" stroke="#E8E8EE" strokeWidth="1.5" filter="url(#cardShadow)" />
      {/* Card header bar */}
      <rect x="30" y="75" width="172" height="34" rx="14" fill="#0A4D68" />
      <rect x="30" y="92" width="172" height="17" fill="#0A4D68" />
      {/* Window controls */}
      <circle cx="52" cy="92" r="5" fill="#EF4444" />
      <circle cx="66" cy="92" r="5" fill="#F59E0B" />
      <circle cx="80" cy="92" r="5" fill="#10B981" />
      {/* Title placeholder */}
      <rect x="96" y="87" width="84" height="9" rx="4.5" fill="white" opacity="0.2" />
      {/* Card metrics */}
      <rect x="46" y="124" width="50" height="8" rx="4" fill="#CBD5E1" />
      <rect x="46" y="138" width="96" height="16" rx="5" fill="#0A4D68" opacity="0.85" />
      {/* Two stat pills inside card */}
      <rect x="46" y="162" width="64" height="22" rx="8" fill="#EEF6FB" />
      <rect x="52" y="170" width="28" height="6" rx="3" fill="#0A4D68" opacity="0.6" />
      <rect x="118" y="162" width="64" height="22" rx="8" fill="#FEF0EA" />
      <rect x="124" y="170" width="28" height="6" rx="3" fill="#E8622A" opacity="0.6" />

      {/* ── Floating card: right bar chart ── */}
      <rect x="448" y="168" width="102" height="100" rx="12" fill="white" stroke="#E8E8EE" strokeWidth="1.5" filter="url(#cardShadow)" />
      <rect x="462" y="184" width="46" height="8" rx="4" fill="#CBD5E1" />
      <rect x="462" y="198" width="74" height="14" rx="5" fill="#0A4D68" opacity="0.9" />
      {/* Bar chart */}
      {[22, 34, 26, 42, 30, 46].map((h, i) => (
        <rect
          key={`bar-${i}`}
          x={462 + i * 13}
          y={262 - h}
          width="9"
          height={h}
          rx="2"
          fill={i === 5 ? "#E8622A" : "#0A4D68"}
          opacity={i === 5 ? 1 : 0.28 + i * 0.13}
        />
      ))}

      {/* ── Metric pill 1: teal (bottom-left of cube) ── */}
      <rect x="50" y="238" width="148" height="48" rx="24" fill="#0A4D68" filter="url(#pillShadow)" />
      <circle cx="76" cy="262" r="11" fill="#E8622A" />
      <rect x="96" y="256" width="36" height="12" rx="5" fill="white" opacity="0.9" />
      <rect x="140" y="258" width="44" height="8" rx="4" fill="white" opacity="0.4" />

      {/* ── Metric pill 2: white (bottom-right) ── */}
      <rect x="400" y="388" width="148" height="48" rx="24" fill="white" stroke="#E8E8EE" strokeWidth="1.5" filter="url(#pillShadow)" />
      <circle cx="426" cy="412" r="11" fill="#EEF6FB" />
      <circle cx="426" cy="412" r="6" fill="#0A4D68" />
      <rect x="446" y="406" width="36" height="12" rx="5" fill="#0A4D68" opacity="0.85" />
      <rect x="490" y="408" width="44" height="8" rx="4" fill="#CBD5E1" />

      {/* ── Connection lines ── */}
      <line x1="202" y1="152" x2="268" y2="248" stroke="#0A4D68" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.22" />
      <line x1="448" y1="215" x2="450" y2="270" stroke="#0A4D68" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.22" />
      <line x1="198" y1="262" x2="268" y2="296" stroke="#E8622A" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.28" />
      <line x1="400" y1="390" x2="448" y2="345" stroke="#0A4D68" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.2" />

      {/* ── Accent nodes ── */}
      <circle cx="268" cy="248" r="6" fill="#0A4D68" />
      <circle cx="268" cy="248" r="14" fill="#0A4D68" opacity="0.1" />

      <circle cx="450" cy="270" r="6" fill="#E8622A" />
      <circle cx="450" cy="270" r="14" fill="#E8622A" opacity="0.1" />

      <circle cx="192" cy="350" r="5" fill="#0A4D68" opacity="0.35" />
      <circle cx="192" cy="350" r="11" fill="#0A4D68" opacity="0.07" />

      {/* ── Mini satellite cube (top-right) ── */}
      <path d="M462 148 L490 132 L518 148 L490 164 Z" fill="#0A4D68" opacity="0.55" />
      <path d="M462 148 L490 164 L490 192 L462 176 Z" fill="#073648" opacity="0.55" />
      <path d="M518 148 L490 164 L490 192 L518 176 Z" fill="#0A5D7A" opacity="0.55" />

      {/* ── Floating label badge ── */}
      <rect x="30" y="406" width="130" height="34" rx="10" fill="white" stroke="#E8E8EE" strokeWidth="1.5" />
      <circle cx="52" cy="423" r="8" fill="#E8622A" opacity="0.12" />
      <circle cx="52" cy="423" r="4" fill="#E8622A" />
      <rect x="68" y="417" width="52" height="7" rx="3.5" fill="#CBD5E1" />
      <rect x="68" y="428" width="72" height="6" rx="3" fill="#0A4D68" opacity="0.5" />
    </svg>
  );
}
