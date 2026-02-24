import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function isTestnet(chainId: number): boolean {
  const testnetIds = [11155111, 59141, 84532, 11155420, 421614, 534351]
  return testnetIds.includes(chainId)
}
