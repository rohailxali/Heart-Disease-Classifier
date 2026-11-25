/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        elevated: 'var(--elevated)',
        border: 'var(--border)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        teal: 'var(--teal)',
        rose: 'var(--rose)',
        slateBlue: 'var(--slate-blue)',
        amber: 'var(--amber)',
        success: 'var(--success)',
      },
    },
  },
  plugins: [],
}
