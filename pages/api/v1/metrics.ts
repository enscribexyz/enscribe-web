import { createClient } from '@supabase/supabase-js'
import { NextApiRequest, NextApiResponse } from 'next'
import { SUPABASE_KEY, SUPABASE_URL } from '@/utils/constants'
import { Database, Tables } from '@/types/supabase'

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === 'POST') {
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
    } = req.body


    try {
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
        return res.status(500).json({ status: error.message })
      } else {
        return res.status(200).json({ status: 'success' })
      }
    } catch (error) {
      return res.status(500).json({ status: 'error while logging' })
    }
  }

  res.setHeader('Allow', ['POST'])
  return res.status(405).json({ error: 'GET not allowed' })
}
