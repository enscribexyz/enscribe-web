import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function shortenENSName(name: string, maxLength = 20): string {
  if (name.length <= maxLength) return name
  const dotIndex = name.lastIndexOf('.')
  if (dotIndex === -1) return name
  const label = name.slice(0, dotIndex)
  const suffix = name.slice(dotIndex)
  const available = maxLength - suffix.length - 3
  if (available <= 0) return name
  return label.slice(0, available) + '...' + suffix
}

export function isTestnet(chainId: number): boolean {
  return [11155111, 59141, 84532, 11155420, 421614, 534351].includes(chainId)
}

export function getExplorerTxUrl(explorerUrl: string, txHash: string): string {
  return `${explorerUrl}/tx/${txHash}`
}

export function getExplorerAddressUrl(
  explorerUrl: string,
  address: string,
): string {
  return `${explorerUrl}/address/${address}`
}
