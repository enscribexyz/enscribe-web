import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from '@/utils/constants'
import { Database } from '@/types/supabase'

export async function POST(_req: NextRequest) {
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY)
  try {
    const { data, error } = await supabase.rpc('get_next_poap_link')

    if (error) {
      console.error('Error fetching POAP link:', error.message)
      return NextResponse.json({ status: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: 'success', link: data })
  } catch (error) {
    return NextResponse.json({ status: 'error while logging' }, { status: 500 })
  }
}
