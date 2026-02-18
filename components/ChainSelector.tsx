import React, { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import Image from 'next/image'
import { CHAIN_OPTIONS, getChainOption } from '@/lib/chains'

interface ChainSelectorProps {
  selectedChain: number
  onChainChange: (chainId: number) => void
}

const getChainById = (id: number) => getChainOption(id) ?? CHAIN_OPTIONS[0]

export default function ChainSelector({
  selectedChain,
  onChainChange,
}: ChainSelectorProps) {
  const [isMobile, setIsMobile] = useState(false)
  const selectedChainInfo = getChainById(selectedChain)

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }

    checkIfMobile()

    window.addEventListener('resize', checkIfMobile)
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  return (
    <Select
      value={selectedChain.toString()}
      onValueChange={(value) => onChainChange(parseInt(value))}
    >
      <SelectTrigger className="text-gray-900 dark:text-gray-100 md:w-[180px] w-fit min-w-[40px] transition-all focus:ring-0 focus:ring-offset-0">
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedChainInfo.logo && (
            <div className="flex-shrink-0 w-6 h-6 relative">
              {' '}
              {/* Increased size for full logo */}
              <Image
                src={selectedChainInfo.logo}
                alt={selectedChainInfo.name}
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
          )}
          <span
            className={`whitespace-nowrap ${isMobile ? 'hidden' : 'inline'}`}
          >
            {selectedChainInfo.name}
          </span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {CHAIN_OPTIONS.map((chain) => (
          <SelectItem
            key={chain.id}
            value={chain.id.toString()}
            className="focus:bg-gray-100 dark:focus:bg-gray-700"
          >
            <div className="flex items-center gap-2">
              {chain.logo && (
                <div className="flex-shrink-0 w-6 h-6 relative">
                  {' '}
                  {/* Increased size for full logo */}
                  <Image
                    src={chain.logo}
                    alt={chain.name}
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
              )}
              <span className="whitespace-nowrap">{chain.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
