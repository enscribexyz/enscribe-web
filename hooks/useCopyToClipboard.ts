import { useState, useCallback } from 'react'

/**
 * Hook for copying text to clipboard with timed visual feedback.
 * Replaces the identical pattern duplicated across 5 components.
 */
export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  const copyToClipboard = useCallback(
    (text: string, id: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied((prev) => ({ ...prev, [id]: true }))
          setTimeout(() => {
            setCopied((prev) => ({ ...prev, [id]: false }))
          }, resetMs)
        })
        .catch((err) => {
          console.error('Failed to copy text: ', err)
        })
    },
    [resetMs],
  )

  const resetCopied = useCallback(() => setCopied({}), [])

  return { copied, copyToClipboard, resetCopied }
}
