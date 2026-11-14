/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral scale — cool slate, near-black/white (Linear/Notion-style base).
        canvas: '#F3F5F7',        // app background
        surface: '#FFFFFF',       // cards, panels, modals
        'surface-sunken': '#F5F7F9', // table headers, subtle recessed areas
        border: {
          DEFAULT: '#E8EBEF',
          strong: '#D5D9DF',
        },
        ink: {
          DEFAULT: '#14161A',  // primary text
          muted: '#6B7280',    // secondary text
          faint: '#9AA0AC',    // tertiary / placeholder text
        },
        // Single brand accent — confident blue, used sparingly for primary actions.
        accent: {
          DEFAULT: '#15181C',
          hover: '#000000',
          active: '#000000',
          soft: '#EEF0F3',
          'soft-border': '#E1E4E9',
        },
        success: { DEFAULT: '#16A34A', soft: '#ECFDF3' },
        warning: { DEFAULT: '#D97706', soft: '#FFFBEB' },
        danger: { DEFAULT: '#DC2626', soft: '#FEF2F2' },
        info: { DEFAULT: '#2F5FEE', soft: '#EEF2FF' },
        // Sidebar keeps a distinct dark ink tone — not pure black, not brand green.
        shell: {
          DEFAULT: '#15171C',
          raised: '#1D2027',
          border: 'rgba(255,255,255,0.08)',
        },
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '10px',
        md: '14px',
        lg: '18px',
        xl: '22px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(20, 22, 26, 0.04)',
        card: '0 1px 2px rgba(20, 22, 26, 0.03), 0 8px 24px -12px rgba(20, 22, 26, 0.06)',
        sm: '0 1px 3px rgba(20, 22, 26, 0.06), 0 1px 2px rgba(20, 22, 26, 0.04)',
        md: '0 4px 12px rgba(20, 22, 26, 0.08), 0 1px 2px rgba(20, 22, 26, 0.04)',
        lg: '0 12px 32px rgba(20, 22, 26, 0.12), 0 2px 6px rgba(20, 22, 26, 0.06)',
        focus: '0 0 0 3px rgba(21, 24, 28, 0.10)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'scale-in': {
          from: { opacity: 0, transform: 'scale(0.96) translateY(4px)' },
          to: { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
        'toast-in': {
          from: { opacity: 0, transform: 'translateY(6px) scale(0.98)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'scale-in': 'scale-in 0.16s cubic-bezier(0.2, 0, 0, 1)',
        'toast-in': 'toast-in 0.22s cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
}
