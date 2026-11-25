import { useContext } from 'react'
import { ThemeCtx } from './themeContextValue'

export const useTheme = () => useContext(ThemeCtx)
