import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ui-theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(storageKey) as Theme
      if (savedTheme) {
        setTheme(savedTheme)
      }
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }

    // Dispatch a custom event to notify components of theme change
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }))
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme)
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, newTheme)
      }
    },
  }

  return React.createElement(ThemeProviderContext.Provider, { value }, children)
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
