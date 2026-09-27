/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Corporate B2B palette (NEW) ──
        'corp-teal':        '#263d4a',
        'corp-teal-600':    '#1a2a33',
        'corp-teal-50':     '#f0f4f6',
        'corp-teal-100':    '#e1e9ed',
        'corp-coral':       '#E8622A',
        'corp-coral-light': '#FEF0EA',
        'corp-charcoal':    '#0b161d',
        'corp-surface':     '#efefef',
        'corp-border':      '#E8E8EE',
        'corp-gray':        '#7e858d',
        'corp-gray-light':  '#bdbfc3',

        // ── Existing brand tokens (preserved for admin) ──
        primary:    '#263d4a',
        secondary:  '#bdbfc3',
        auxiliary:  '#7e858d',
        'bg-soft':  '#f8f8f8',
        'bg-dark':  '#0b161d',
        'border-light': 'rgba(38, 61, 74, 0.1)',

        // ── Electric accent palette (admin / dark sections) ──
        electric: '#0EA5E9',
        violet:   '#7C3AED',
        cyan:     '#06B6D4',

        // ── Dark surface tokens (admin) ──
        'bg-void':  '#0A0A0F',
        'bg-navy':  '#0F172A',
        'bg-card':  '#1E293B',
        'bg-glass': 'rgba(255,255,255,0.03)',

        // ── Text scale (admin) ──
        'text-primary':  '#F8FAFC',
        'text-muted':    '#94A3B8',
        'text-faint':    '#475569',

        // ── Borders (admin) ──
        'border-glass': 'rgba(255,255,255,0.08)',

        // ── Semantic ──
        success: '#10B981',
        warning: '#F59E0B',
        error:   '#EF4444',

        border:     'var(--border)',
        ring:       'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Plus Jakarta Sans', 'sans-serif'],
        body:    ['var(--font-inter)', 'Inter', 'sans-serif'],
        sans:    ['var(--font-inter)', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '10': '10px',
        '11': '11px',
      },
      letterSpacing: {
        ultra:    '0.25em',
        'wide-xl':'0.2em',
      },
      backgroundImage: {
        'gradient-primary':    'linear-gradient(135deg, #1c1f22 0%, #525558 50%, #a5aaad 100%)',
        'gradient-hero':       'linear-gradient(to bottom, rgba(13,15,16,0.75) 0%, rgba(13,15,16,0.4) 50%, rgba(248,247,245,1) 100%)',
        'gradient-electric':   'linear-gradient(135deg, #0EA5E9, #7C3AED)',
        'gradient-electric-r': 'linear-gradient(135deg, #7C3AED, #06B6D4)',
        'gradient-corp':       'linear-gradient(135deg, #0A4D68, #1A8FB5)',
      },
      animation: {
        'fade-in':      'animateIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'marquee':      'marquee 35s linear infinite',
        'marquee-slow': 'marquee 55s linear infinite',
        'pulse-glow':   'pulseGlow 3s ease-in-out infinite',
        'float':        'float 6s ease-in-out infinite',
        'spin-slow':    'spin 20s linear infinite',
      },
      keyframes: {
        animateIn: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%':      { opacity: '0.8', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
      },
      boxShadow: {
        luxury:       '0 30px 80px -20px rgba(28, 31, 34, 0.2)',
        card:         '0 4px 24px rgba(28, 31, 34, 0.08)',
        'card-hover': '0 20px 60px -15px rgba(28, 31, 34, 0.18)',
        'glow-blue':  '0 0 30px rgba(14, 165, 233, 0.35)',
        'glow-violet':'0 0 30px rgba(124, 58, 237, 0.35)',
        glass:        'inset 0 1px 0 rgba(255,255,255,0.06)',
        'corp-card':  '0 4px 24px rgba(10, 77, 104, 0.06)',
        'corp-hover': '0 12px 40px rgba(10, 77, 104, 0.12)',
        'corp-nav':   '0 2px 20px rgba(10, 77, 104, 0.08)',
      },
      maxWidth: {
        '8xl': '88rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
