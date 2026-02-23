import React, { memo } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'

interface AbiItem {
  type: string
  name?: string
  stateMutability?: string
  inputs?: { type: string; name?: string; indexed?: boolean }[]
  outputs?: { type: string }[]
}

interface SourcifyMetadata {
  metadata?: {
    compiler?: { version?: string }
    sources?: Record<string, { urls?: string[] }>
  }
  abi?: AbiItem[]
}

interface CompiledMetadataPanelProps {
  sourcifyMetadata: SourcifyMetadata
}

export const CompiledMetadataPanel = memo(function CompiledMetadataPanel({
  sourcifyMetadata,
}: CompiledMetadataPanelProps) {
  return (
    <div className="mt-6">
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Compiled Metadata
        </h4>
        <div className="space-y-3">
          {/* Solidity Version */}
          {sourcifyMetadata.metadata?.compiler?.version && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Solidity
              </span>
              <span className="inline-block px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono">
                {sourcifyMetadata.metadata.compiler.version}
              </span>
            </div>
          )}

          {/* Contract ABI */}
          {sourcifyMetadata.abi && sourcifyMetadata.abi.length > 0 && (
            <div>
              <details className="group cursor-pointer">
                <summary className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between py-1">
                  <span>Contract ABI</span>
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-2 max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <AbiSection abi={sourcifyMetadata.abi} type="function" label="Functions" />
                  <AbiSection abi={sourcifyMetadata.abi} type="event" label="Events" />
                  <AbiSection abi={sourcifyMetadata.abi} type="error" label="Errors" />
                </div>
              </details>
            </div>
          )}

          {/* Source Files */}
          {sourcifyMetadata.metadata?.sources &&
            Object.keys(sourcifyMetadata.metadata.sources).length > 0 && (
              <div>
                <details className="group cursor-pointer">
                  <summary className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between py-1">
                    <span>Source Files</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    {Object.entries(sourcifyMetadata.metadata.sources).map(
                      ([fileName, fileData], index) => {
                        let ipfsViewerUrl = ''
                        if (fileData.urls && fileData.urls[1]) {
                          const match = fileData.urls[1].match(/dweb:\/ipfs\/(.+)/)
                          if (match && match[1]) {
                            ipfsViewerUrl = `https://ipfsviewer.com/?hash=${match[1]}`
                          }
                        }

                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between text-xs bg-white dark:bg-gray-900 p-2 rounded"
                          >
                            <span className="text-gray-700 dark:text-gray-300 font-mono truncate">
                              {fileName}
                            </span>
                            {ipfsViewerUrl && (
                              <a
                                href={ipfsViewerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 ml-2 flex-shrink-0"
                              >
                                ipfs://
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )
                      },
                    )}
                  </div>
                </details>
              </div>
            )}
        </div>
      </div>
    </div>
  )
})

function AbiSection({
  abi,
  type,
  label,
}: {
  abi: AbiItem[]
  type: string
  label: string
}) {
  const items = abi.filter((item) => item.type === type)
  if (items.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </p>
      <div className="space-y-1">
        {items.map((item, index) => {
          if (type === 'function') {
            return (
              <div
                key={index}
                className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all"
              >
                <span className="text-green-600 dark:text-green-400">{item.name}</span>
                <span className="text-gray-500">(</span>
                {item.inputs?.map((input, i) => (
                  <span key={i}>
                    <span className="text-blue-600 dark:text-blue-400">{input.type}</span>
                    {input.name && (
                      <span className="text-gray-600 dark:text-gray-400"> {input.name}</span>
                    )}
                    {item.inputs && i < item.inputs.length - 1 && (
                      <span className="text-gray-500">, </span>
                    )}
                  </span>
                ))}
                <span className="text-gray-500">)</span>
                {item.stateMutability && item.stateMutability !== 'nonpayable' && (
                  <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                    {item.stateMutability}
                  </span>
                )}
                {item.outputs && item.outputs.length > 0 && (
                  <span className="text-gray-500">
                    {' returns ('}
                    {item.outputs.map((output, i) => (
                      <span key={i}>
                        <span className="text-blue-600 dark:text-blue-400">{output.type}</span>
                        {item.outputs && i < item.outputs.length - 1 && ', '}
                      </span>
                    ))}
                    {')'}
                  </span>
                )}
              </div>
            )
          }

          if (type === 'event') {
            return (
              <div key={index} className="text-xs font-mono break-all">
                <span className="text-yellow-600 dark:text-yellow-400">{item.name}</span>
                <span className="text-gray-500">(</span>
                {item.inputs?.map((input, i) => (
                  <span key={i} className="text-gray-600 dark:text-gray-400">
                    <span className="text-blue-600 dark:text-blue-400">{input.type}</span>
                    {input.indexed && (
                      <span className="text-purple-600 dark:text-purple-400"> indexed</span>
                    )}
                    {input.name && <span> {input.name}</span>}
                    {item.inputs && i < item.inputs.length - 1 && (
                      <span className="text-gray-500">, </span>
                    )}
                  </span>
                ))}
                <span className="text-gray-500">)</span>
              </div>
            )
          }

          // error
          return (
            <div
              key={index}
              className="text-xs font-mono text-red-600 dark:text-red-400 break-all"
            >
              {item.name}
              <span className="text-gray-500">(</span>
              {item.inputs?.map((input, i) => (
                <span key={i} className="text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 dark:text-blue-400">{input.type}</span>
                  {input.name && <span> {input.name}</span>}
                  {item.inputs && i < item.inputs.length - 1 && (
                    <span className="text-gray-500">, </span>
                  )}
                </span>
              ))}
              <span className="text-gray-500">)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
