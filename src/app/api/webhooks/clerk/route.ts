import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

type ClerkEvent = {
  type: string
  data: Record<string, unknown>
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const headersList = await headers()
  const svixId = headersList.get('svix-id')
  const svixTimestamp = headersList.get('svix-timestamp')
  const svixSignature = headersList.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()

  let event: ClerkEvent
  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkEvent
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'organization.created': {
      const { id, name, slug } = event.data as {
        id: string
        name: string
        slug: string
      }
      await supabase.from('organizations').upsert(
        {
          clerk_org_id: id,
          name,
          slug,
          delegation_status: 'pending',
        },
        { onConflict: 'clerk_org_id' },
      )
      break
    }

    case 'organization.updated': {
      const { id, name, slug } = event.data as {
        id: string
        name: string
        slug: string
      }
      await supabase
        .from('organizations')
        .update({ name, slug, updated_at: new Date().toISOString() })
        .eq('clerk_org_id', id)
      break
    }

    case 'organizationMembership.created': {
      const { organization, public_user_data, role } = event.data as {
        organization: { id: string }
        public_user_data: { user_id: string }
        role: string
      }

      // Get org from Supabase
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('clerk_org_id', organization.id)
        .single()

      if (org) {
        await supabase.from('org_members').upsert(
          {
            org_id: org.id,
            clerk_user_id: public_user_data.user_id,
            role: role === 'org:admin' ? 'admin' : 'member',
          },
          { onConflict: 'org_id,clerk_user_id' },
        )
      }
      break
    }

    case 'organizationMembership.deleted': {
      const { organization, public_user_data } = event.data as {
        organization: { id: string }
        public_user_data: { user_id: string }
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('clerk_org_id', organization.id)
        .single()

      if (org) {
        await supabase
          .from('org_members')
          .delete()
          .eq('org_id', org.id)
          .eq('clerk_user_id', public_user_data.user_id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
