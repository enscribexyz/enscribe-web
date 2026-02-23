import React, { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, ChevronDown, ChevronRight } from 'lucide-react'

interface CallDataPanelProps {
  callDataList: string[]
  allCallData: string
  isCallDataOpen: boolean
  onToggle: () => void
  copied: Record<string, boolean>
  onCopy: (text: string, id: string) => void
}

export const CallDataPanel = memo(function CallDataPanel({
  callDataList,
  allCallData,
  isCallDataOpen,
  onToggle,
  copied,
  onCopy,
}: CallDataPanelProps) {
  if (callDataList.length === 0) return null

  return (
    <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-3"
      >
        {isCallDataOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          Call Data ({callDataList.length} calls)
        </span>
      </button>

      {isCallDataOpen && (
        <div className="space-y-3">
          {/* Copy All Button */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(allCallData, 'all')}
              className="text-xs"
            >
              {copied['all'] ? (
                <>
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                  Copied All
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy All
                </>
              )}
            </Button>
          </div>

          {/* Individual Call Data Items */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {callDataList.map((callData, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all whitespace-pre-wrap">
                      {callData}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={() => {
                      const parts = callData.split(': ')
                      const hexData = parts.length > 1 ? parts[1] : callData
                      onCopy(hexData, `callData-${index}`)
                    }}
                  >
                    {copied[`callData-${index}`] ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
