/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          green: '#00E600',
          darkgreen: '#00B800',
          glow: '#00FF66',
        },
        navy: {
          950: '#070D18',
          900: '#0B1528',
          800: '#111E38',
          700: '#182B4F',
          600: '#233D6B',
        },
        brand: {
          blue: '#1E40AF',
          lightBlue: '#3B82F6',
          green: '#00E600',
          orange: '#F59E0B',
          red: '#EF4444',
        }
      }
    },
  },
  plugins: [],
}
