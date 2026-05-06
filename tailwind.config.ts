import type { Config } from 'tailwindcss';

// Tokens do Design System, replicados fielmente a partir dos mocks:
//   - Design system/Dashboard/code.html
//   - Design system/Cadastro/code.html
// As chaves em colors, borderRadius, spacing, fontFamily e fontSize
// correspondem 1:1 às presentes no <script id="tailwind-config"> dos mocks.
// Ajustes em qualquer destes valores devem ser refletidos também nos mocks
// para preservar a fidelidade visual do Design System (Req 9.1, 9.2, 9.4, 9.5).

const colors = {
  'on-background': '#e0e3e5',
  'primary-container': '#10b981',
  'on-secondary': '#233144',
  'primary-fixed-dim': '#4edea3',
  outline: '#86948a',
  'surface-container': '#1d2022',
  'on-error': '#690005',
  'on-surface': '#e0e3e5',
  'inverse-on-surface': '#2d3133',
  'on-secondary-container': '#abb9d2',
  'on-tertiary': '#002e6a',
  'on-secondary-fixed-variant': '#3a485c',
  'tertiary-fixed-dim': '#adc6ff',
  'surface-container-low': '#191c1e',
  'primary-fixed': '#6ffbbe',
  'on-primary-container': '#00422b',
  'on-primary-fixed': '#002113',
  'surface-container-lowest': '#0b0f10',
  'surface-variant': '#323537',
  'surface-container-high': '#272a2c',
  'on-primary': '#003824',
  'surface-dim': '#101415',
  'secondary-fixed': '#d5e3fd',
  'on-primary-fixed-variant': '#005236',
  'on-secondary-fixed': '#0d1c2f',
  'surface-container-highest': '#323537',
  surface: '#101415',
  'error-container': '#93000a',
  'on-tertiary-fixed': '#001a42',
  error: '#ffb4ab',
  'inverse-primary': '#006c49',
  primary: '#4edea3',
  secondary: '#b9c7e0',
  tertiary: '#adc6ff',
  'on-tertiary-fixed-variant': '#004395',
  'on-surface-variant': '#bbcabf',
  'secondary-fixed-dim': '#b9c7e0',
  'inverse-surface': '#e0e3e5',
  'surface-bright': '#363a3b',
  'tertiary-fixed': '#d8e2ff',
  background: '#101415',
  'secondary-container': '#3c4a5e',
  'on-tertiary-container': '#00367a',
  'tertiary-container': '#71a1ff',
  'on-error-container': '#ffdad6',
  'surface-tint': '#4edea3',
  'outline-variant': '#3c4a42'
};

const borderRadius = {
  DEFAULT: '0.25rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px'
};

const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '48px',
  unit: '4px',
  gutter: '16px',
  'margin-mobile': '16px',
  'margin-desktop': '32px'
};

const interStack: string[] = ['Inter', 'system-ui', 'sans-serif'];

const fontFamily = {
  'body-base': [...interStack],
  'display-lg': [...interStack],
  'data-mono': [...interStack],
  'label-caps': [...interStack],
  'headline-md': [...interStack]
};

const fontSize: Record<
  string,
  [string, { lineHeight: string; letterSpacing: string; fontWeight: string }]
> = {
  'display-lg': [
    '48px',
    { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }
  ],
  'headline-md': [
    '24px',
    { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }
  ],
  'body-base': [
    '16px',
    { lineHeight: '1.6', letterSpacing: '0.01em', fontWeight: '400' }
  ],
  'data-mono': [
    '14px',
    { lineHeight: '1.4', letterSpacing: '0em', fontWeight: '500' }
  ],
  'label-caps': [
    '12px',
    { lineHeight: '1', letterSpacing: '0.08em', fontWeight: '600' }
  ]
};

// Animações customizadas — usadas para microinterações do redesign:
//  - fade-in/slide-up: entrada de cards e views
//  - scale-in: aparecimento do FAB e chips
//  - pulse-glow: aura ao redor do FAB
//  - shimmer: brilho sutil no card de Lucro Total
//  - float: blob decorativo no TotalProfitCard
const keyframes = {
  'fade-in': {
    from: { opacity: '0' },
    to: { opacity: '1' }
  },
  'slide-up': {
    from: { opacity: '0', transform: 'translateY(16px)' },
    to: { opacity: '1', transform: 'translateY(0)' }
  },
  'slide-down': {
    from: { opacity: '0', transform: 'translateY(-8px)' },
    to: { opacity: '1', transform: 'translateY(0)' }
  },
  'scale-in': {
    from: { opacity: '0', transform: 'scale(0.9)' },
    to: { opacity: '1', transform: 'scale(1)' }
  },
  'pulse-glow': {
    '0%, 100%': {
      boxShadow:
        '0 8px 24px rgba(78,222,163,0.35), 0 0 0 0 rgba(78,222,163,0.5)'
    },
    '50%': {
      boxShadow:
        '0 12px 32px rgba(78,222,163,0.45), 0 0 0 12px rgba(78,222,163,0)'
    }
  },
  shimmer: {
    '0%': { backgroundPosition: '-400px 0' },
    '100%': { backgroundPosition: '400px 0' }
  },
  float: {
    '0%, 100%': { transform: 'translate(25%, -25%) scale(1)' },
    '50%': { transform: 'translate(20%, -30%) scale(1.1)' }
  },
  'spin-slow': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' }
  }
};

const animation = {
  'fade-in': 'fade-in 240ms ease-out both',
  'slide-up': 'slide-up 360ms cubic-bezier(0.22, 1, 0.36, 1) both',
  'slide-down': 'slide-down 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
  'scale-in': 'scale-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
  'pulse-glow': 'pulse-glow 2.6s ease-in-out infinite',
  shimmer: 'shimmer 2.4s linear infinite',
  float: 'float 8s ease-in-out infinite',
  'spin-slow': 'spin-slow 12s linear infinite'
};

export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,html}'],
  theme: {
    extend: {
      colors,
      borderRadius,
      spacing,
      fontFamily,
      fontSize,
      keyframes,
      animation
    }
  }
} satisfies Config;
