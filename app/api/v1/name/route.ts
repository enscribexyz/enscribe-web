import { NextResponse } from 'next/server'
import {
  uniqueNamesGenerator,
  Config,
  adjectives,
} from 'unique-names-generator'
import { nouns } from '@/utils/constants'

const customConfig: Config = {
  dictionaries: [adjectives, nouns],
  separator: '-',
  length: 2,
}

function generateFourDigitNumber(): number {
  return Math.floor(1000 + Math.random() * 9000)
}

export function GET() {
  const name: string = `${uniqueNamesGenerator(customConfig)}-${generateFourDigitNumber()}`
  return new NextResponse(name, { status: 200 })
}
