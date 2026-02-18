import * as React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    if (typeof window === 'undefined') return

    if (
      theme === 'light' ||
      (theme === 'system' &&
        !window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      setTheme('dark')
    } else {
      setTheme('light')
    }
  }

  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window === 'undefined') return false
    return window.document.documentElement.classList.contains('dark')
  })

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const updateIsDark = () => {
      const root = window.document.documentElement
      setIsDark(root.classList.contains('dark'))
    }

    // Listen for theme changes
    window.addEventListener('theme-change', updateIsDark)

    // Also check on mount
    updateIsDark()

    return () => {
      window.removeEventListener('theme-change', updateIsDark)
    }
  }, [])

  // Debug logging
  React.useEffect(() => {
  }, [theme, isDark])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      data-theme-toggle="true"
      className={`h-9 w-9 p-0 transition-colors ${
        isDark
          ? '!bg-white !border-gray-300 hover:!bg-gray-100 !text-gray-900'
          : '!bg-gray-800 !border-gray-600 hover:!bg-gray-700 !text-white'
      }`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
