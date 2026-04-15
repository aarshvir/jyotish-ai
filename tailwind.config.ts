import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      /* ── Color System ──────────────────────────────────────────────── */
      colors: {
        // Core surfaces (dark mode)
        space:   '#080C18',
        cosmos:  '#0D1426',
        nebula:  '#141C35',
        horizon: '#1E2A4A',

        // Core surfaces (light / reading mode)
        parchment:     '#FAF8F5',
        'parchment-2': '#F2EDE6',
        'parchment-3': '#E8E0D6',
        ink:           '#1A1A2E',
        'ink-muted':   '#4A4A5E',

        // Primary accent
        amber: {
          DEFAULT: '#D4A853',
          light:   '#E8C97A',
          dark:    '#B8923E',
          glow:    '#FCD34D',
          muted:   'rgba(212, 168, 83, 0.12)',
        },

        // Semantic: guidance / primary action
        guidance: {
          DEFAULT: '#D4A853',
          light:   '#E8C97A',
          bg:      'rgba(212, 168, 83, 0.08)',
        },

        // Semantic: success / favorable
        success: {
          DEFAULT: '#3B9B6E',
          light:   '#5CB88A',
          bg:      'rgba(59, 155, 110, 0.10)',
        },

        // Semantic: caution / avoid
        caution: {
          DEFAULT: '#C75B3A',
          light:   '#E07A5C',
          bg:      'rgba(199, 91, 58, 0.10)',
        },

        // Text layers
        star:    '#E8EAF0',
        dust:    '#8892A4',
        'dust-light': '#A0A8B8',

        // Legacy compat
        emerald: '#3B9B6E',
        crimson: '#C75B3A',

        // Dynamic CSS variable refs
        background: 'var(--color-bg)',
        foreground: 'var(--color-text)',
        surface:    'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        border:     'var(--color-border)',
        muted:      'var(--color-muted)',
      },

      /* ── Typography System ─────────────────────────────────────────── */
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        // Display: hero headlines, section openers (marketing only)
        'display-xl': ['clamp(3rem, 7vw, 5.5rem)', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-lg': ['clamp(2.25rem, 5vw, 3.75rem)', { lineHeight: '1.1', letterSpacing: '-0.015em', fontWeight: '600' }],
        'display-md': ['clamp(1.75rem, 3.5vw, 2.5rem)', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '600' }],

        // Headline: section titles in product surfaces
        'headline-lg': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['1.25rem', { lineHeight: '1.35', letterSpacing: '-0.005em', fontWeight: '600' }],
        'headline-sm': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],

        // Title: card titles, subsections
        'title-lg': ['1rem', { lineHeight: '1.4', fontWeight: '500' }],
        'title-md': ['0.875rem', { lineHeight: '1.45', fontWeight: '500' }],

        // Body: default reading text
        'body-lg':  ['1rem', { lineHeight: '1.65', fontWeight: '400' }],
        'body-md':  ['0.875rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm':  ['0.8125rem', { lineHeight: '1.55', fontWeight: '400' }],

        // Label: UI labels, meta, tags
        'label-lg': ['0.8125rem', { lineHeight: '1.3', letterSpacing: '0.02em', fontWeight: '500' }],
        'label-md': ['0.75rem', { lineHeight: '1.3', letterSpacing: '0.03em', fontWeight: '500' }],
        'label-sm': ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.04em', fontWeight: '500' }],

        // Mono: data, scores, timestamps
        'mono-lg': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }],
        'mono-md': ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],
        'mono-sm': ['0.6875rem', { lineHeight: '1.3', fontWeight: '400' }],
      },

      /* ── Spacing ───────────────────────────────────────────────────── */
      spacing: {
        'nav': 'var(--nav-height)',
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
      },

      /* ── Border Radius ─────────────────────────────────────────────── */
      borderRadius: {
        'card': '0.5rem',
        'button': '0.375rem',
        'badge': '0.25rem',
        'pill': '9999px',
      },

      /* ── Elevation / Shadows ───────────────────────────────────────── */
      boxShadow: {
        'card':     '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.12)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15)',
        'elevated': '0 8px 24px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)',
        'glow-amber': '0 0 24px rgba(212, 168, 83, 0.15)',
        'glow-success': '0 0 16px rgba(59, 155, 110, 0.12)',
        'glow-caution': '0 0 16px rgba(199, 91, 58, 0.12)',
        'inner-light': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },

      /* ── Max Widths for reading ────────────────────────────────────── */
      maxWidth: {
        'reading': '65ch',
        'reading-wide': '75ch',
      },

      /* ── Animations ────────────────────────────────────────────────── */
      animation: {
        'spin-slow':    'spin-slow 20s linear infinite',
        'spin-medium':  'spin-slow 8s linear infinite',
        'twinkle':      'twinkle 4s ease-in-out infinite',
        'float-up':     'float-up 0.6s ease-out forwards',
        'bar-reveal':   'bar-reveal 0.5s ease-out forwards',
        'pulse-amber':  'pulse-amber 2s ease-in-out infinite',
        'fade-in':      'fade-in 0.4s ease-out forwards',
        'slide-up':     'slide-up 0.5s ease-out forwards',
        'scale-in':     'scale-in 0.3s ease-out forwards',
      },
      keyframes: {
        'spin-slow':    { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
        'twinkle':      { '0%,100%': { opacity: '0.1' }, '50%': { opacity: '0.85' } },
        'float-up':     { from: { opacity: '0', transform: 'translateY(28px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'bar-reveal':   { from: { transform: 'scaleY(0)', opacity: '0' }, to: { transform: 'scaleY(1)', opacity: '1' } },
        'pulse-amber':  { '0%,100%': { boxShadow: '0 0 0 0 rgba(212,168,83,0)' }, '50%': { boxShadow: '0 0 20px 4px rgba(212,168,83,0.2)' } },
        'fade-in':      { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up':     { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in':     { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },

      /* ── Transitions ───────────────────────────────────────────────── */
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
