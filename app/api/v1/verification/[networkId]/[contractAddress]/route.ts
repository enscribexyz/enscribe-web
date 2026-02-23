import { NextRequest, NextResponse } from 'next/server'
import {
  getVerificationData,
  triggerVerificationLogic,
} from '@/lib/verification'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ networkId: string; contractAddress: string }> },
) {
  const { networkId, contractAddress } = await params

  if (typeof networkId !== 'string' || typeof contractAddress !== 'string') {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  try {
    const data = await getVerificationData(networkId, contractAddress)
    return NextResponse.json(data)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ networkId: string; contractAddress: string }> },
) {
  const { networkId, contractAddress } = await params

  if (typeof networkId !== 'string' || typeof contractAddress !== 'string') {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  try {
    const data = await triggerVerificationLogic(networkId, contractAddress)
    return NextResponse.json(data)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
