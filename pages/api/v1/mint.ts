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
    try {
      const { data, error } = await supabase.rpc('get_next_poap_link')
      console.log(`returned mint link: ${data}`)

      if (error) {
        console.error('Error fetching POAP link:', error.message)
        console.log('error occurred: ' + error.details)
        console.log(error.message)
        return res.status(500).json({ status: error.message })
      } else {
        return res.status(200).json({ status: 'success', link: data })
      }
    } catch (error) {
      console.log('error occurred: ' + error)
      return res.status(500).json({ status: 'error while logging' })
    }
  }

  res.setHeader('Allow', ['POST'])
  return res.status(405).json({ error: 'GET not allowed' })
}
