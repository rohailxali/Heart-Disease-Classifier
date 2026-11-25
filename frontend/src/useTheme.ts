import { useContext } from 'react'
import { ThemeCtx } from './ThemeContext'

export function useTheme() {
  return useContext(ThemeCtx)
}
