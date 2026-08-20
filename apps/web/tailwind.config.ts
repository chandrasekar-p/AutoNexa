import type { Config } from 'tailwindcss';

// AutoNexa design system. See apps/web/README.md "Design system" for the
// reasoning — graphite chrome + light workspace, a copper/amber signature
// accent (deliberately not Tailwind/shadcn's default indigo-blue), and
// tabular monospace numerals for every data value as the one distinctive,
// consistently-applied signature element ("instrument cluster precision").
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware semantic tokens — backed by CSS custom properties
        // (see app/globals.css :root / .dark) so a component written once
        // against these names gets dark mode for free, with no `dark:`
        // variant needed at the call site. The sidebar/topbar "chrome" and
        // the login screen intentionally stay on the raw `graphite` scale
        // below instead of these tokens — they're a fixed dark instrument
        // bezel in both themes, not part of the light/dark surface.
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        'surface-hover': 'var(--color-surface-hover)',
        line: {
          DEFAULT: 'var(--color-line)',
          subtle: 'var(--color-line-subtle)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          secondary: 'var(--color-ink-secondary)',
          muted: 'var(--color-ink-muted)',
        },
        // Cool-shifted neutral scale — the app's chrome (sidebar/topbar)
        // sits at the dark end, the workspace surface at the light end.
        graphite: {
          950: '#0a0d11',
          900: '#12161b',
          850: '#181d24',
          800: '#1f252d',
          700: '#2b323c',
          600: '#3c454f',
          500: '#5b6570',
          400: '#818b96',
          300: '#a8b0b9',
          200: '#cbd1d7',
          100: '#e4e8eb',
          50: '#f4f6f7',
        },
        // Signature accent — burnished copper/amber. Distinct in hue from
        // the semantic `warning` scale below so "brand" and "caution"
        // never read as the same color.
        accent: {
          50: '#fdf4ec',
          100: '#faf5e9',
          200: '#f0d3ab',
          300: '#e3b177',
          400: '#d5904f',
          500: '#c07333',
          600: '#9c5a24',
          700: '#7a451c',
          800: '#5c3316',
          900: '#402410',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34b483',
          500: '#0f9d68',
          600: '#0c7f54',
          700: '#0a6644',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          400: '#e35d5d',
          500: '#dc3b3b',
          600: '#b82e2e',
          700: '#932424',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          400: '#e0ac3f',
          500: '#d69a1f',
          600: '#b17f17',
          700: '#8a6212',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // A deliberate scale (not arbitrary Tailwind defaults) — tracked
        // tighter as size increases, per the "precise instrument" brief.
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }], // 11px, labels
        xs: ['0.75rem', { lineHeight: '1.1rem', letterSpacing: '0.02em' }], // 12px
        sm: ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '0.005em' }], // 13px
        base: ['0.875rem', { lineHeight: '1.4rem' }], // 14px — default UI text
        md: ['1rem', { lineHeight: '1.5rem' }], // 16px
        lg: ['1.125rem', { lineHeight: '1.6rem', letterSpacing: '-0.005em' }], // 18px
        xl: ['1.25rem', { lineHeight: '1.7rem', letterSpacing: '-0.01em' }], // 20px
        '2xl': ['1.5rem', { lineHeight: '1.9rem', letterSpacing: '-0.015em' }], // 24px
        '3xl': ['1.875rem', { lineHeight: '2.2rem', letterSpacing: '-0.02em' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }], // 36px KPI figures
      },
      boxShadow: {
        panel: '0 1px 2px 0 rgb(10 13 17 / 0.05), 0 1px 1px 0 rgb(10 13 17 / 0.03)',
        card: '0 1px 3px 0 rgb(10 13 17 / 0.07), 0 1px 2px -1px rgb(10 13 17 / 0.05)',
      },
      borderRadius: {
        sm: '5px',
        DEFAULT: '7px',
        md: '9px',
        lg: '12px',
      },
    },
  },
  plugins: [],
};

export default config;
