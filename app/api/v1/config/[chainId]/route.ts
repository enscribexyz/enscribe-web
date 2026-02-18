import { NextRequest, NextResponse } from 'next/server'
import { CONTRACTS } from '@/utils/constants'

export function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chainId: string }> },
) {
  return params.then(({ chainId }) => {
    const chainIdNum = parseInt(String(chainId), 10)

    if (isNaN(chainIdNum)) {
      return NextResponse.json(
        { error: `Invalid chainId parameter: ${chainId}` },
        { status: 400 },
      )
    }

    if (!Object.keys(CONTRACTS).includes(chainIdNum.toString())) {
      return NextResponse.json(
        { error: `No config found for chainId ${chainId}` },
        { status: 404 },
      )
    }

    const chainConfig = {
      reverse_registrar_addr: CONTRACTS[chainIdNum].REVERSE_REGISTRAR,
      ens_registry_addr: CONTRACTS[chainIdNum].ENS_REGISTRY,
      public_resolver_addr: CONTRACTS[chainIdNum].PUBLIC_RESOLVER,
      name_wrapper_addr: CONTRACTS[chainIdNum].NAME_WRAPPER,
      enscribe_addr: CONTRACTS[chainIdNum].ENSCRIBE_CONTRACT,
      parent_name: CONTRACTS[chainIdNum].ENSCRIBE_DOMAIN,
    }

    return NextResponse.json(chainConfig)
  })
}
