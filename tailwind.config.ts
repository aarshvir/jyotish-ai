import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        space:   '#080C18',
        cosmos:  '#0D1426',
        nebula:  '#141C35',
        horizon: '#1E2A4A',
        amber: {
          DEFAULT: '#F59E0B',
          glow:    '#FCD34D',
        },
        star:    '#E8EAF0',
        dust:    '#8892A4',
        emerald: '#10B981',
        crimson: '#EF4444',
        // Keep existing shorthands working
        background: 'var(--space)',
        foreground: 'var(--star)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'spin-slow':    'spin-slow 20s linear infinite',
        'spin-medium':  'spin-slow 8s linear infinite',
        'twinkle':      'twinkle 4s ease-in-out infinite',
        'float-up':     'float-up 0.6s ease-out forwards',
        'bar-reveal':   'bar-reveal 0.5s ease-out forwards',
        'pulse-amber':  'pulse-amber 2s ease-in-out infinite',
        'fade-in':      'fade-in 0.4s ease-out forwards',
      },
      keyframes: {
        'spin-slow':   { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
        'twinkle':     { '0%,100%': { opacity: '0.1' }, '50%': { opacity: '0.85' } },
        'float-up':    { from: { opacity: '0', transform: 'translateY(28px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'bar-reveal':  { from: { transform: 'scaleY(0)', opacity: '0' }, to: { transform: 'scaleY(1)', opacity: '1' } },
        'pulse-amber': { '0%,100%': { boxShadow: '0 0 0 0 rgba(245,158,11,0)' }, '50%': { boxShadow: '0 0 20px 4px rgba(245,158,11,0.25)' } },
        'fade-in':     { from: { opacity: '0' }, to: { opacity: '1' } },
      },
    },
  },
  plugins: [],
};

export default config;
