/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: { relative: true, files: ['./index.html', './src/**/*.{ts,tsx}'] },
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        background: token('background'),
        card: token('card'),
        foreground: token('foreground'),
        muted: token('muted'),
        'muted-foreground': token('muted-foreground'),
        subtle: token('subtle'),
        border: token('border'),
        ring: token('ring'),
        primary: token('primary'),
        'primary-foreground': token('primary-foreground'),
        accent: token('accent'),
        'accent-foreground': token('accent-foreground'),
        gain: token('gain'),
        'gain-soft': token('gain-soft'),
        loss: token('loss'),
        'loss-soft': token('loss-soft'),
        warn: token('warn'),
        'warn-soft': token('warn-soft'),
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 1px 1px rgb(0 0 0 / 0.02)',
        pop: '0 12px 32px -8px rgb(0 0 0 / 0.18), 0 2px 6px rgb(0 0 0 / 0.06)',
      },
      keyframes: {
        'flash-up': { '0%': { backgroundColor: 'rgb(var(--gain) / 0.22)' }, '100%': { backgroundColor: 'transparent' } },
        'flash-down': { '0%': { backgroundColor: 'rgb(var(--loss) / 0.22)' }, '100%': { backgroundColor: 'transparent' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': { from: { opacity: '0', transform: 'translateY(4px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        pulse2: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.35' } },
      },
      animation: {
        'flash-up': 'flash-up 1.1s ease-out',
        'flash-down': 'flash-down 1.1s ease-out',
        'fade-in': 'fade-in 150ms ease-out',
        'pop-in': 'pop-in 160ms ease-out',
        live: 'pulse2 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
