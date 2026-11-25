/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['Mali', '"Baloo 2"', 'sans-serif'],
        body: ['"Prompt"', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        script: ['"Great Vibes"', '"Dancing Script"', 'cursive'],
      },
      colors: {
        blush: {
          50: '#FFF6F8',
          100: '#FDEBF0',
          200: '#FBD8E3',
        },
        rose: {
          400: '#F472A0',
          500: '#EC4C82',
          600: '#D93B72',
        },
        peach: '#FFD9C7',
        gold: '#E8B84B',
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(217, 59, 114, 0.18)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
