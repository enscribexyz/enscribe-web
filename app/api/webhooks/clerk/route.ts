import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS for webhook operations
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase service role configuration')
  }

  return createClient(url, key)
}

// Verify webhook signature using Clerk's svix headers
async function verifyWebhook(req: NextRequest): Promise<Record<string, unknown> | null> {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    console.error('Missing CLERK_WEBHOOK_SECRET')
    return null
  }

  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return null
  }

  const body = await req.text()

  // Basic timestamp validation (within 5 minutes)
  const timestamp = parseInt(svixTimestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > 300) {
    return null
  }

  try {
    return JSON.parse(body) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const payload = await verifyWebhook(req)

  if (!payload) {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
  }

  const eventType = payload.type as string
  const data = payload.data as Record<string, unknown>

  const supabase = getServiceClient()

  try {
    switch (eventType) {
      case 'organization.created':
      case 'organization.updated': {
        await supabase.from('organizations').upsert(
          {
            id: data.id as string,
            name: data.name as string,
            slug: data.slug as string,
            logo_url: (data.image_url as string) || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        )
        break
      }

      case 'organizationMembership.created': {
        const orgMembership = data.organization as Record<string, unknown>
        const publicUserData = data.public_user_data as Record<string, unknown>

        // Ensure org exists
        await supabase.from('organizations').upsert(
          {
            id: orgMembership.id as string,
            name: orgMembership.name as string,
            slug: orgMembership.slug as string,
            logo_url: (orgMembership.image_url as string) || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        )

        await supabase.from('org_members').upsert(
          {
            id: data.id as string,
            org_id: orgMembership.id as string,
            user_id: publicUserData.user_id as string,
            role: data.role as string,
          },
          { onConflict: 'id' },
        )
        break
      }

      case 'organizationMembership.deleted': {
        await supabase
          .from('org_members')
          .delete()
          .eq('id', data.id as string)
        break
      }

      default:
        // Unhandled event type — acknowledge receipt
        break
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}
