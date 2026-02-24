import { NextResponse } from 'next/server'
import { ENSCRIBE_OPENAPI_SPEC } from '@/lib/openapi'

export function GET() {
  return NextResponse.json(ENSCRIBE_OPENAPI_SPEC)
}
