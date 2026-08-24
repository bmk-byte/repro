/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#9C1D20',
          dark: '#7A1518',
          light: '#B73538',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#9C1D20',
          600: '#7A1518',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
          1000:'#f5f5dc',
        },
      },
      screens: {
        'xs': '480px',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};