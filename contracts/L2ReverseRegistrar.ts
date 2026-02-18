/**
 * ABI for the L2 Reverse Registrar contract's nameForAddr function.
 * Used for reverse ENS name resolution on L2 chains (Base, Optimism, Arbitrum, Scroll, Linea).
 *
 * This was previously duplicated inline in utils/ens.ts, components/ENSDetails.tsx,
 * and components/NameContract.tsx. Now it's a single source of truth.
 */
const L2ReverseRegistrarABI = [
  {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'nameForAddr',
    outputs: [{ internalType: 'string', name: 'name', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export default L2ReverseRegistrarABI
