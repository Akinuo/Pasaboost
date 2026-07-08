'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setThemeState((localStorage.getItem('pasaboost-theme') as Theme) || 'system')
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function applyTheme(t: Theme) {
      const isDark = t === 'dark' || (t === 'system' && media.matches)
      root.classList.toggle('dark', isDark)
      setResolvedTheme(isDark ? 'dark' : 'light')
    }

    applyTheme(theme)

    if (theme === 'system') {
      const handler = () => applyTheme('system')
      media.addEventListener('change', handler)
      return () => media.removeEventListener('change', handler)
    }
  }, [theme, mounted])

  const setTheme = (t: Theme) => {
    localStorage.setItem('pasaboost-theme', t)
    setThemeState(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
