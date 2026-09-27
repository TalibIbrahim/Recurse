/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'var(--canvas-bg)',
          secondary: 'var(--surface-secondary)',
        },
        surface: {
          DEFAULT: 'var(--surface-secondary)',
          elevated: 'var(--surface-elevated)',
        },
        glass: {
          DEFAULT: 'var(--glass-bg-default)',
          elevated: 'var(--glass-bg-elevated)',
          subtle: 'var(--glass-bg-subtle)',
          border: 'var(--glass-border)',
          sheen: 'var(--glass-sheen)',
        },
        label: {
          primary: 'var(--label-primary)',
          secondary: 'var(--label-secondary)',
          tertiary: 'var(--label-tertiary)',
          quaternary: 'var(--label-quaternary)',
        },
        accent: {
          blue: 'var(--accent-blue)',
          green: 'var(--accent-green)',
          orange: 'var(--accent-orange)',
          red: 'var(--accent-red)',
          purple: 'var(--accent-purple)',
        },
      },
      borderRadius: {
        'control': '12px',
        'card': '16px',
        'large': '20px',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        'glass-resting': '0 8px 32px 0 rgba(0, 0, 0, 0.12), inset 0 1px 0 0 var(--glass-sheen)',
        'glass-hover': '0 14px 40px 0 rgba(0, 0, 0, 0.22), inset 0 1px 0 0 var(--glass-sheen)',
        'glass-elevated': '0 24px 64px 0 rgba(0, 0, 0, 0.32), inset 0 1px 0 0 var(--glass-sheen)',
        'glow-green': '0 0 24px -4px rgba(48, 209, 88, 0.35)',
        'glow-orange': '0 0 24px -4px rgba(255, 159, 10, 0.35)',
        'glow-red': '0 0 24px -4px rgba(255, 69, 58, 0.35)',
        'glow-blue': '0 0 24px -4px rgba(10, 132, 255, 0.35)',
        'glow-purple': '0 0 24px -4px rgba(191, 90, 242, 0.35)',
      },
      backdropBlur: {
        'xs': '4px',
        'glass-subtle': '12px',
        'glass-default': '20px',
        'glass-elevated': '30px',
      },
    },
  },
  plugins: [],
};
