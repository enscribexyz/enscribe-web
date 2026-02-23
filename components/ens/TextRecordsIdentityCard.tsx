import React, { memo } from 'react'
import { ExternalLink } from 'lucide-react'
import type { TextRecords } from '@/types'

interface TextRecordsIdentityCardProps {
  textRecords: TextRecords
}

export const TextRecordsIdentityCard = memo(function TextRecordsIdentityCard({
  textRecords,
}: TextRecordsIdentityCardProps) {
  if (
    !textRecords.name &&
    !textRecords.alias &&
    !textRecords.description &&
    !textRecords.url &&
    !textRecords.avatar &&
    !textRecords.header
  ) {
    return null
  }

  return (
    <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header Background Image */}
      {textRecords.header && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 dark:opacity-40"
          style={{ backgroundImage: `url(${textRecords.header})` }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex gap-6">
        {/* Avatar Section (Left) - Circular */}
        {textRecords.avatar && (
          <div className="flex-shrink-0">
            <img
              src={textRecords.avatar}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Text Content (Right) */}
        <div className="flex-1 space-y-3">
          {/* Display Name/Alias */}
          {(textRecords.name || textRecords.alias) && (
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {textRecords.name || textRecords.alias}
            </h3>
          )}

          {/* Description */}
          {textRecords.description && (
            <p className="text-black dark:text-white text-sm leading-relaxed font-bold">
              {textRecords.description}
            </p>
          )}

          {/* URL */}
          {textRecords.url && (
            <a
              href={
                textRecords.url.startsWith('http')
                  ? textRecords.url
                  : `https://${textRecords.url}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-800 dark:text-blue-200 hover:underline font-bold"
            >
              {textRecords.url}
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          )}

          {/* Social Links */}
          {(textRecords['com.github'] ||
            textRecords['com.twitter'] ||
            textRecords['org.telegram'] ||
            textRecords['com.linkedin']) && (
            <div className="flex items-center gap-3 pt-2">
              {textRecords['com.github'] && (
                <a
                  href={
                    textRecords['com.github'].startsWith('http')
                      ? textRecords['com.github']
                      : `https://github.com/${textRecords['com.github']}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="GitHub"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </a>
              )}
              {textRecords['com.twitter'] && (
                <a
                  href={
                    textRecords['com.twitter'].startsWith('http')
                      ? textRecords['com.twitter']
                      : `https://twitter.com/${textRecords['com.twitter']}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="Twitter/X"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              )}
              {textRecords['org.telegram'] && (
                <a
                  href={
                    textRecords['org.telegram'].startsWith('http')
                      ? textRecords['org.telegram']
                      : `https://t.me/${textRecords['org.telegram']}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="Telegram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                  </svg>
                </a>
              )}
              {textRecords['com.linkedin'] && (
                <a
                  href={
                    textRecords['com.linkedin'].startsWith('http')
                      ? textRecords['com.linkedin']
                      : `https://linkedin.com/in/${textRecords['com.linkedin']}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="LinkedIn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
