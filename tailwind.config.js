/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          DEFAULT: '#1DBF73',
          50:  '#E8FAF2',
          100: '#C5F1DE',
          200: '#8FE4BF',
          300: '#59D6A0',
          400: '#30CB87',
          500: '#1DBF73',
          600: '#17A362',
          700: '#118050',
          800: '#0C5F3B',
          900: '#073F28',
        },
        solar: {
          DEFAULT: '#F9A825',
          50:  '#FFF8E1',
          100: '#FFEDB3',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#F9A825',
          600: '#E59400',
          700: '#C67A00',
          800: '#9C5F00',
          900: '#704400',
        },
        navy: {
          DEFAULT: '#0A2540',
          50:  '#EFF4FB',
          100: '#CFE0F5',
          200: '#9EC1EB',
          300: '#6DA3E1',
          400: '#3D85D7',
          500: '#1A66CE',
          600: '#154EA8',
          700: '#0F3882',
          800: '#0A2540',
          900: '#051326',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'float': 'float 4s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(10, 37, 64, 0.12)',
        'card': '0 4px 24px rgba(10, 37, 64, 0.08)',
        'card-hover': '0 12px 40px rgba(10, 37, 64, 0.15)',
        'emerald': '0 8px 25px rgba(29, 191, 115, 0.35)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0A2540 0%, #0d3a6e 50%, #0A2540 100%)',
        'emerald-gradient': 'linear-gradient(135deg, #1DBF73 0%, #17A362 100%)',
        'cta-gradient': 'linear-gradient(90deg, #1DBF73 0%, #F9A825 100%)',
      },
    },
  },
  plugins: [],
}
