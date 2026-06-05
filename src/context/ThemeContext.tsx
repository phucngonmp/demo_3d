import { useState, useLayoutEffect, type ReactNode } from 'react'
import { ThemeContext, type Theme } from './theme'

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('glb-theme')
  if (stored === 'dark' || stored === 'light') return stored
  return 'light' // default
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('glb-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
