/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['Mali', 'Prompt', 'sans-serif'],
        body: ['"Prompt"', 'sans-serif'],
        script: ['"Great Vibes"', 'cursive'],
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
        // ชมพูเบอร์รี: ตัวหนังสือ/ราคาบนพื้นกระจกชมพู อ่านได้ ≥4.5:1
        berry: '#B4235A',
        peach: '#FFD9C7',
        gold: '#E8B84B',
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(217, 59, 114, 0.18)',
        // เงานุ่มสีกลาง (unslop): ของเล็ก / การ์ด / ของที่ลอยเหนือหน้า
        hair: '0 1px 2px rgba(31, 27, 22, 0.05)',
        soft: '0 1px 2px rgba(31, 27, 22, 0.04), 0 8px 24px rgba(31, 27, 22, 0.06)',
        lift: '0 2px 4px rgba(31, 27, 22, 0.04), 0 24px 48px -12px rgba(31, 27, 22, 0.18)',
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
