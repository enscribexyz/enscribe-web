import { getENS, fetchAssociatedNamesCount } from '@/utils/ens'

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { chainId, address } = req.query

  const chainIdNum = Number(chainId)

  if (!chainId || Number.isNaN(chainIdNum)) {
    return res
      .status(400)
      .json({ error: `Invalid chainId parameter: ${String(chainId)}` })
  }

  if (!address || typeof address !== 'string') {
    return res
      .status(400)
      .json({ error: `Invalid address parameter: ${String(address)}` })
  }

  const primaryENS = await getENS(address as string, chainIdNum)

  if (primaryENS) {
    return res.status(200).json({ label: 'View Metadata' })
  } else {
    const { count, name } = await fetchAssociatedNamesCount(address as string, chainIdNum)
    if (count > 0) {
      return res.status(200).json({ label: count === 1 ? `${name}` : `⚠️ ${count} Names`})
    } else {
      return res.status(200).json({ label: '❌ Set ENS' })
    }
  }
}
