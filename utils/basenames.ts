/**
 * Utilities for working with Base ENS names (*.base.eth / *.basetest.eth).
 */

interface BasenameResult {
  label: string
  fqdn: string
}

/**
 * Splits a Base ENS name into its label and fully-qualified domain name.
 * Normalizes to lowercase. Validates that the domain ends with .base.eth
 * or .basetest.eth (for Base Sepolia).
 *
 * @example
 * splitBasename('MyContract.BASE.eth') // { label: 'mycontract', fqdn: 'mycontract.base.eth' }
 * splitBasename('example.basetest.eth') // { label: 'example', fqdn: 'example.basetest.eth' }
 */
export function splitBasename(name: string): BasenameResult {
  const normalized = name.toLowerCase()

  if (!normalized.endsWith('.base.eth') && !normalized.endsWith('.basetest.eth')) {
    throw new Error(
      `Invalid Base ENS name "${name}": must end with .base.eth or .basetest.eth`,
    )
  }

  const suffix = normalized.endsWith('.basetest.eth') ? '.basetest.eth' : '.base.eth'
  const label = normalized.slice(0, normalized.length - suffix.length)

  return {
    label,
    fqdn: normalized,
  }
}
