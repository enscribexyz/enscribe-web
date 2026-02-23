import React, { memo } from 'react'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import type { TextRecords } from '@/types'

interface TechnicalDetailsAndAuditsPanelProps {
  textRecords: TextRecords
}

export const TechnicalDetailsAndAuditsPanel = memo(
  function TechnicalDetailsAndAuditsPanel({
    textRecords,
  }: TechnicalDetailsAndAuditsPanelProps) {
    if (
      !textRecords.category &&
      !textRecords.license &&
      !textRecords.docs &&
      !textRecords.audits
    ) {
      return null
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Technical Details (Left) */}
        {(textRecords.category || textRecords.license || textRecords.docs) && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Technical Details
            </h4>
            <div className="space-y-3">
              {textRecords.category && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Category
                  </span>
                  <span className="inline-block px-3 py-1 text-sm rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                    {textRecords.category}
                  </span>
                </div>
              )}

              {textRecords.license && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    License
                  </span>
                  <span className="inline-block px-3 py-1 text-sm rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    {textRecords.license}
                  </span>
                </div>
              )}

              {textRecords.docs && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                    Docs
                  </span>
                  <a
                    href={
                      textRecords.docs.startsWith('http')
                        ? textRecords.docs
                        : `https://${textRecords.docs}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline break-all text-right"
                  >
                    {textRecords.docs}
                    <ExternalLink className="ml-1 h-3 w-3 flex-shrink-0" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Audits (Right) */}
        {textRecords.audits && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Security Audits
            </h4>
            <div className="space-y-3">
              <AuditsList audits={textRecords.audits} />
            </div>
          </div>
        )}
      </div>
    )
  },
)

function AuditsList({ audits }: { audits: string }) {
  try {
    const parsed = JSON.parse(audits)
    if (Array.isArray(parsed)) {
      return (
        <>
          {parsed
            .flatMap((audit: unknown, index: number) => {
              if (typeof audit === 'string') {
                return (
                  <div key={index} className="flex items-start gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <a
                      href={audit.startsWith('http') ? audit : `https://${audit}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      {audit.split('/').pop() || `Audit ${index + 1}`}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )
              }

              if (audit && typeof audit === 'object' && 'auditor' in audit) {
                const a = audit as { auditor: string; url?: string }
                return (
                  <div key={index} className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {a.auditor}
                      </span>
                      {a.url && (
                        <>
                          <span className="mx-2 text-gray-400">•</span>
                          <a
                            href={
                              a.url.startsWith('http') ? a.url : `https://${a.url}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            View Report
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                )
              }

              // Handle object with key-value pairs (e.g., {"Cantina": "url"})
              return Object.entries(audit as Record<string, unknown>).map(
                ([auditorName, url], entryIndex) => (
                  <div
                    key={`${index}-${entryIndex}`}
                    className="flex items-center gap-3"
                  >
                    <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {auditorName}
                      </span>
                      <span className="mx-2 text-gray-400">•</span>
                      <a
                        href={
                          typeof url === 'string' && url.startsWith('http')
                            ? url
                            : `https://${url}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        View Report
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ),
              )
            })}
        </>
      )
    }
  } catch {
    // Not JSON — treat as comma-separated or single URL
  }

  const auditUrls = audits.split(',').map((url) => url.trim())
  return (
    <>
      {auditUrls.map((url, index) => (
        <div key={index} className="flex items-start gap-2">
          <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <a
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            {url.split('/').pop() || `Audit ${index + 1}`}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ))}
    </>
  )
}
