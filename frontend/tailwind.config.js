/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#FAF8F5',
        card: '#FFFFFF',
        accent: '#7C3AED',
        'accent-hover': '#6D28D9',
        success: '#10B981',
        error: '#EF4444',
        muted: '#9CA3AF',
      },
      borderRadius: {
        card: '1rem',
      },
    },
  },
  plugins: [],
}
