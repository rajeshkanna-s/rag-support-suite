/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172026',
        mist: '#f6f7f9',
        ocean: '#0f6b6e',
        coral: '#d35d47',
      },
    },
  },
  plugins: [],
};
