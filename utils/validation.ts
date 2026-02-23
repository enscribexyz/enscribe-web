import { isAddress } from 'viem'

export function isEmpty(value: string): boolean {
  return value == null || value.trim().length === 0
}

export function isAddressEmpty(address: string): boolean {
  return isEmpty(address)
}

export function isValidAddress(address: string): boolean {
  if (isEmpty(address)) {
    return false
  }
  if (!isAddress(address)) {
    return false
  }
  return true
}
