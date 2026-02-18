import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from '@/utils/constants'
import { Database } from '@/types/supabase'

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY)

export async function POST(req: NextRequest) {
  try {
    const {
      contract_address,
      ens_name,
      deployer_address,
      network,
      timestamp,
      source,
      op_type,
      co_id,
      step,
      txn_hash,
      contract_type,
    } = await req.json()

    const { error } = await supabase.from('ens_named_contracts').insert({
      contract_address,
      ens_name,
      deployer_address,
      network,
      timestamp,
      source,
      op_type,
      co_id,
      step,
      txn_hash,
      contract_type,
    })

    if (error) {
      return NextResponse.json({ status: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    return NextResponse.json({ status: 'error while logging' }, { status: 500 })
  }
}
