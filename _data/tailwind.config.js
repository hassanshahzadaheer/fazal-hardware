/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F6B3B', // deep green
          hover: '#195A31',
        },
        accent: {
          DEFAULT: '#2563EB', // links / active nav
        },
        bg: '#F7F8FA',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        text: '#111827',
        muted: '#6B7280',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#2563EB',
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
        sm: '4px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
