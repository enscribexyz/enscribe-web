import React from 'react'

interface EnscribeLogoProps {
  size?: number
  className?: string
}

/**
 * The Enscribe SVG logo mark.
 * Appears in the sidebar (desktop & mobile) and the header (medium screens).
 */
export function EnscribeLogo({ size = 32, className }: EnscribeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="4" fill="#151A2D" />
      <path
        d="M10 12L6 16L10 20"
        stroke="#4DB8E8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 12L26 16L22 20"
        stroke="#4DB8E8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 10L14 22"
        stroke="#4DB8E8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
