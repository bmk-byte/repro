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
          1000: '#f5f5dc',
        },
        // Warm-leaning neutral scale (pairs with the maroon primary and the
        // cream tone already used at primary-1000) — replaces default
        // Tailwind gray across new/updated UI so surfaces feel intentional
        // rather than generic.
        stone: {
          50: '#FAF9F7',
          100: '#F3F1ED',
          200: '#E7E3DB',
          300: '#D6CFC2',
          400: '#B3A996',
          500: '#8A7F6C',
          600: '#69604F',
          700: '#524A3C',
          800: '#3A342A',
          900: '#25211A',
        },
        // Status colors are deliberately distinct from `primary` (maroon)
        // so a brand-colored element is never mistaken for an error state.
        success: {
          DEFAULT: '#15803D',
          light: '#DCFCE7',
          dark: '#14532D',
        },
        warning: {
          DEFAULT: '#B45309',
          light: '#FEF3C7',
          dark: '#78350F',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          dark: '#991B1B',
        },
        info: {
          DEFAULT: '#1D4ED8',
          light: '#DBEAFE',
          dark: '#1E3A8A',
        },
      },
      screens: {
        xs: '480px',
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.5' }],
        sm: ['0.875rem', { lineHeight: '1.5' }],
        base: ['1rem', { lineHeight: '1.6' }],
        lg: ['1.125rem', { lineHeight: '1.6' }],
        xl: ['1.25rem', { lineHeight: '1.5' }],
        '2xl': ['1.5rem', { lineHeight: '1.35' }],
        '3xl': ['1.875rem', { lineHeight: '1.25' }],
        '4xl': ['2.25rem', { lineHeight: '1.15' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
      },
      borderRadius: {
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(37,33,26,0.06)',
        card: '0 1px 2px rgba(37,33,26,0.05), 0 4px 12px -4px rgba(37,33,26,0.10)',
        raised: '0 4px 16px -4px rgba(37,33,26,0.14), 0 2px 6px -2px rgba(37,33,26,0.08)',
        modal: '0 12px 40px -8px rgba(37,33,26,0.28)',
      },
    },
  },
  plugins: [],
};
