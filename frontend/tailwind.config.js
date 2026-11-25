/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:       'var(--color-bg)',
        surface:  'var(--color-surface)',
        ink:      'var(--color-ink)',
        muted:    'var(--color-muted)',
        rule:     'var(--color-rule)',
        oxblood:  'var(--color-oxblood)',
        green:    'var(--color-green)',
        ochre:    'var(--color-ochre)',
        ochreInk: 'var(--color-ochre-ink)',
        slate:    'var(--color-slate)',
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        sans:    ['"Instrument Sans Variable"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'monospace'],
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
  plugins: [],
}
