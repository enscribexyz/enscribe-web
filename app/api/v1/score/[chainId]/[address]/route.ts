import { NextRequest, NextResponse } from 'next/server'
import { getENS, fetchForwardNameSummary, hasNameMetadata } from '@/utils/ens'

const SCORE_NO_ENS_RECORD = 0
const SCORE_MULTIPLE_FORWARD_NAMES = 25
const SCORE_SINGLE_FORWARD_NAME = 50
const SCORE_PRIMARY_OR_METADATA = 75
const SCORE_PRIMARY_AND_METADATA = 100
const SCORE_CACHE_TTL_MS = 30_000
const SCORE_CACHE_MAX_SIZE = 5000

type ScoreCacheEntry = {
  score: number
  expiresAt: number
}

const scoreCache = new Map<string, ScoreCacheEntry>()
const inFlightScoreLookups = new Map<string, Promise<number>>()

const getCacheKey = (chainId: number, address: string) =>
  `${chainId}:${address.toLowerCase()}`

const pruneExpiredCacheEntries = () => {
  const now = Date.now()
  for (const [key, entry] of scoreCache.entries()) {
    if (entry.expiresAt <= now) {
      scoreCache.delete(key)
    }
  }
}

const readScoreCache = (
  chainId: number,
  address: string,
): number | undefined => {
  pruneExpiredCacheEntries()

  const key = getCacheKey(chainId, address)
  const entry = scoreCache.get(key)
  if (!entry) return undefined

  // Touch for LRU behavior.
  scoreCache.delete(key)
  scoreCache.set(key, entry)
  return entry.score
}

const writeScoreCache = (chainId: number, address: string, score: number) => {
  pruneExpiredCacheEntries()

  const key = getCacheKey(chainId, address)
  scoreCache.set(key, {
    score,
    expiresAt: Date.now() + SCORE_CACHE_TTL_MS,
  })

  while (scoreCache.size > SCORE_CACHE_MAX_SIZE) {
    const oldestKey = scoreCache.keys().next().value as string | undefined
    if (!oldestKey) break
    scoreCache.delete(oldestKey)
  }
}

const computeScore = async (
  chainId: number,
  address: string,
  apiBaseUrl: string,
): Promise<number> => {
  const primaryENS = await getENS(address, chainId)
  if (primaryENS) {
    const primaryHasMetadata = await hasNameMetadata(
      chainId,
      primaryENS,
      apiBaseUrl,
    )
    return primaryHasMetadata
      ? SCORE_PRIMARY_AND_METADATA
      : SCORE_PRIMARY_OR_METADATA
  }

  const forwardSummary = await fetchForwardNameSummary(
    address,
    chainId,
    apiBaseUrl,
  )

  if (forwardSummary.count === 0) {
    return SCORE_NO_ENS_RECORD
  }

  if (forwardSummary.count > 1) {
    return SCORE_MULTIPLE_FORWARD_NAMES
  }

  const hasMetadata = forwardSummary.singleNameHasMetadata

  if (hasMetadata) {
    return SCORE_PRIMARY_OR_METADATA
  }

  return SCORE_SINGLE_FORWARD_NAME
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chainId: string; address: string }> },
) {
  const { chainId, address } = await params

  const chainIdNum = Number(chainId)

  if (!chainId || Number.isNaN(chainIdNum)) {
    return NextResponse.json(
      { error: `Invalid chainId parameter: ${String(chainId)}` },
      { status: 400 },
    )
  }

  if (!address || typeof address !== 'string') {
    return NextResponse.json(
      { error: `Invalid address parameter: ${String(address)}` },
      { status: 400 },
    )
  }

  const cachedScore = readScoreCache(chainIdNum, address)
  if (cachedScore !== undefined) {
    return NextResponse.json({ score: cachedScore })
  }

  const apiBaseUrl = req.nextUrl.origin
  const cacheKey = getCacheKey(chainIdNum, address)
  let lookupPromise = inFlightScoreLookups.get(cacheKey)
  if (!lookupPromise) {
    lookupPromise = computeScore(chainIdNum, address, apiBaseUrl)
      .then((score) => {
        writeScoreCache(chainIdNum, address, score)
        return score
      })
      .finally(() => {
        inFlightScoreLookups.delete(cacheKey)
      })

    inFlightScoreLookups.set(cacheKey, lookupPromise)
  }

  const score = await lookupPromise

  return NextResponse.json({ score })
}
