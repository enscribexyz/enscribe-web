import React from 'react'
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit'
import { useTheme } from '@/hooks/useTheme'

interface ThemeAwareRainbowKitProps {
  children: React.ReactNode
}

export function ThemeAwareRainbowKit({ children }: ThemeAwareRainbowKitProps) {
  const { theme } = useTheme()

  // Determine which theme to use
  const getCurrentTheme = () => {
    if (theme === 'dark') {
      return darkTheme({
        borderRadius: 'large',
        fontStack: 'system',
      })
    } else if (theme === 'light') {
      return lightTheme({
        borderRadius: 'large',
        fontStack: 'system',
      })
    } else {
      // For 'system' theme, we'll use the current system preference
      if (typeof window !== 'undefined') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        return isDark
          ? darkTheme({
              borderRadius: 'large',
              fontStack: 'system',
            })
          : lightTheme({
              borderRadius: 'large',
              fontStack: 'system',
            })
      }
      // Default to light theme for SSR
      return lightTheme({
        borderRadius: 'large',
        fontStack: 'system',
      })
    }
  }

  return (
    <RainbowKitProvider modalSize="wide" theme={getCurrentTheme()}>
      {children}
    </RainbowKitProvider>
  )
}
