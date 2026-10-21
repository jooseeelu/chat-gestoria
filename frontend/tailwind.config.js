/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dorado elegante Gestoría eMadrid
        gold: {
          50: '#fbf8f0',
          100: '#f5edd7',
          200: '#ebdaa9',
          300: '#dec278',
          400: '#d1a84f',
          500: '#c59a3e', // Dorado corporativo principal
          600: '#aa7e30',
          700: '#875e27',
          800: '#6d4b24',
          900: '#5a3e21',
          950: '#34210e',
        },
        // Azul Marino Profundo (Navy corporativo de despacho/gestoría)
        navy: {
          50: '#f0f4f9',
          100: '#dde5f2',
          200: '#c0d0e7',
          300: '#94b2d8',
          400: '#628ec4',
          500: '#3f6fb0',
          600: '#2f5593',
          700: '#264476',
          800: '#1b2d4f', // Navy elegante para tarjetas
          850: '#13213a',
          900: '#0c172a', // Fondo principal navy noche
          950: '#070e1b', // Fondo ultra-oscuro
        },
        // Mapeo brand -> dorado para botones y acentos
        brand: {
          50: '#fbf8f0',
          100: '#f5edd7',
          200: '#ebdaa9',
          300: '#dec278',
          400: '#d1a84f',
          500: '#c59a3e',
          600: '#aa7e30',
          700: '#875e27',
          800: '#6d4b24',
          900: '#5a3e21',
          950: '#34210e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.12)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glow-gold': '0 0 25px -4px rgba(197, 154, 62, 0.35)',
        'glow-navy': '0 0 30px -5px rgba(27, 45, 79, 0.6)',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        'fade-in-up': {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        }
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fade-in-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    },
  },
  plugins: [],
}
