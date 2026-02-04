/**
 * Labelhash to Label Mapping
 *
 * This file stores known labelhash -> ENS label mappings to "heal"
 * unresolved labelhashes in ENS subnames.
 *
 * Format: { 'labelhash': 'label' }
 *
 * Labelhashes are typically displayed as [0x1234...] in ENS names when
 * the original label text is not available on-chain.
 */

export const labelhashMap: Record<string, string> = {
  // Add known labelhash mappings here
  // Example:
  // '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef': 'example',
  '0x10d3b79a143ba6420c82091abb9ded890e84aa11dab2359e38c68c5a3d26d841':
    'shares-factory',
  '0xf6c174edd925dc0344a2d9e64242720868d68d883a9cbb705c8c23562471dded':
    'pool-manager-impl',
  '0x62fafeaa73aaaaee9d190b62a1df840242636b3ddc2fd0cf46fb089c28a44502':
    'whitelist-impl',
  '0x9642d137b133e776ef9aa8c9acb0673ae213bcaf45950d72d7ec3effc493819f':
    'constraint-rate-adapter-impl',
  '0x58586d628e4eabf5bcf03fc0b2355cc282ce565c845a537993cf66b80b38cfa4':
    'constraint-rate-adapter',
  '0xb7a3d859db132eab8dbbe6a6e638d69b2676cc2a9a4ca4ce1b8a3ab9005d5d22':
    'timelock-operational',
  '0x818f34a8cd3fda070131e5f69846ceb52ca22458fd76ee204352d636c9258321':
    'timelock-admin',
  '0xabc622d1f2d7007fe0d4936d8d1b359095660103749ed416c87acd01a9fced65':
    'timelock-upgrade',
  '0x97d358d4666e2845008cb3746a7bc511f13dcb3ca3b85ddd424c835203b7e962':
    'donation-handler',
  '0x84cfcaac021d7e304d207228676da47ee7642e1ec0a20b23df4300d25e15d7ad':
    'retropgf',
}

/**
 * Heals a labelhash by looking it up in the mapping
 * @param labelhash - The labelhash to heal (with or without 0x prefix)
 * @returns The healed label if found, otherwise the original labelhash
 */
export function healLabelhash(labelhash: string): string {
  console.log('[healLabelhash] Input hash:', labelhash)

  // Normalize the labelhash by ensuring it has 0x prefix
  const normalizedHash = labelhash.startsWith('0x')
    ? labelhash
    : `0x${labelhash}`

  console.log('[healLabelhash] Normalized hash:', normalizedHash)
  console.log(
    '[healLabelhash] Lowercase for lookup:',
    normalizedHash.toLowerCase(),
  )
  console.log('[healLabelhash] Available mappings:', Object.keys(labelhashMap))

  // Look up in the mapping
  const healedLabel = labelhashMap[normalizedHash.toLowerCase()]
  console.log('[healLabelhash] Lookup result:', healedLabel)

  // Return healed label if found, otherwise return original
  return healedLabel || labelhash
}

/**
 * Checks if a label is a labelhash (in the format [0x...] or [hash...])
 * @param label - The label to check
 * @returns true if the label is a labelhash format
 */
export function isLabelhash(label: string): boolean {
  // Match both [0x...] and [hash...] formats (with or without 0x prefix)
  return /^\[(0x)?[a-fA-F0-9]{64}\]$/.test(label)
}

/**
 * Heals a full ENS name by replacing any labelhash components
 * @param name - The full ENS name (e.g., "[0x123...].example.eth")
 * @returns The healed name with replaced labelhashes
 */
export function healENSName(name: string): string {
  if (!name) return name

  const parts = name.split('.')

  const healedParts = parts.map((part) => {
    if (isLabelhash(part)) {
      // Extract the hash from the brackets
      const hash = extractLabelhash(part)

      if (hash) {
        const healed = healLabelhash(hash)

        // If healed successfully (not just the hash back), return without brackets
        // Otherwise keep the original format
        if (healed !== hash) {
          return healed
        }
      }
      return part
    }

    return part
  })

  return healedParts.join('.')
}

/**
 * Extracts the labelhash from a bracketed format
 * @param label - The label in format [0x...] or [hash...]
 * @returns The extracted hash without brackets (with 0x prefix added if missing)
 */
export function extractLabelhash(label: string): string | null {
  // Match both [0x...] and [hash...] formats
  const match = label.match(/^\[((0x)?[a-fA-F0-9]{64})\]$/)
  if (!match) return null

  const hash = match[1]
  // Ensure the hash has 0x prefix for consistent lookup
  return hash.startsWith('0x') ? hash : `0x${hash}`
}

/**
 * Adds a new labelhash mapping (useful for runtime additions)
 * @param labelhash - The labelhash (with or without 0x prefix)
 * @param label - The corresponding label
 */
export function addLabelhashMapping(labelhash: string, label: string): void {
  const normalizedHash = labelhash.startsWith('0x')
    ? labelhash
    : `0x${labelhash}`
  labelhashMap[normalizedHash.toLowerCase()] = label
}

/**
 * Gets all known labelhash mappings
 * @returns The complete labelhash mapping object
 */
export function getAllMappings(): Record<string, string> {
  return { ...labelhashMap }
}

/**
 * Gets the count of known labelhash mappings
 * @returns The number of known mappings
 */
export function getMappingCount(): number {
  return Object.keys(labelhashMap).length
}
