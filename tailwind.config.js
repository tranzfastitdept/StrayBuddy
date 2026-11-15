/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — cyan is the cat side, amber the dog side.
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
        buddy: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#f97316',
        },
        ink: {
          900: '#020617',
          800: '#0b1220',
          700: '#111b2e',
        },
      },
      boxShadow: {
        hud: '0 10px 30px -12px rgba(2, 6, 23, 0.85)',
        glow: '0 0 0 1px rgba(16, 185, 129, 0.35), 0 12px 30px -14px rgba(16, 185, 129, 0.55)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
