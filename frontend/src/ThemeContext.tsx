// Theme context provider
import { useEffect, useState, type ReactNode } from 'react'
import { ThemeCtx, type Theme } from './themeContextValue'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // 1. Check DOM attribute set by index.html early script
    const currentAttr = document.documentElement.getAttribute('data-theme') as Theme | null
    if (currentAttr === 'dark' || currentAttr === 'light') {
      return currentAttr
    }
    // 2. Check localStorage
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved === 'dark' || saved === 'light') {
      return saved
    }
    // 3. Fallback to prefers-color-scheme
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
    return prefersLight ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>
}
