/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        ink: '#0f172a',
        mist: '#f8fafc',
        ocean: '#0d9488', // Modern teal
        coral: '#ef4444', // Red-coral
        brand: {
          light: '#f0fdfa',
          teal: '#0d9488',
          tealDark: '#115e59',
          indigo: '#6366f1',
          indigoDark: '#4f46e5',
          bgDark: '#090d16',
          panelDark: '#111827',
          borderDark: '#1f2937',
        }
      },
      boxShadow: {
        'glow-teal': '0 0 15px rgba(13, 148, 136, 0.15)',
        'glow-indigo': '0 0 15px rgba(99, 102, 241, 0.15)',
      }
    },
  },
  plugins: [],
};
