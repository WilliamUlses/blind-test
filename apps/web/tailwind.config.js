/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#050505', // Rich Black
        surface: '#12121AB0', // Glassy dark
        primary: {
          DEFAULT: '#A855F7', // Electric Purple
          glow: '#A855F780',
        },
        secondary: {
          DEFAULT: '#EC4899', // Hot Pink
          glow: '#EC489980',
        },
        accent: '#D8B4FE', // Light Purple
        muted: '#9CA3AF',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'scale-up': 'scaleUp 0.3s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #A855F7 0deg, #EC4899 180deg, #A855F7 360deg)',
      },
    },
  },
  plugins: [],
};
