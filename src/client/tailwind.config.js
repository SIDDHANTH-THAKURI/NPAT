/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        baloo: ['"Baloo 2"', 'cursive'],
        nunito: ['Nunito', 'sans-serif'],
      },
      colors: {
        peach: {
          100: '#FFF3E6',
          200: '#FDDCB5',
          300: '#FBC98A',
        },
        lavender: '#DDD5F3',
        skyblue: '#C9E8F8',
        mint: '#C8EDD9',
        rose: '#FAD0DC',
      },
      borderRadius: {
        xl2: '24px',
        pill: '50px',
      },
    },
  },
  plugins: [],
};
