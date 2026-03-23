// supabase/functions/send-notifications/index.ts
// Deploy with: supabase functions deploy send-notifications
//
// This function is called via Supabase Database Webhooks when:
//   - A new row is inserted into: reports, road_closures, safety_alerts,
//     construction_notices, broadcast_messages
//
// It fans out to all users who have opted in to that event type
// and sends via email (and SMS via email-to-gateway)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Carrier SMS gateway map
const SMS_GATEWAYS: Record<string, string> = {
  verizon:    'vtext.com',
  tmobile:    'tmomail.net',
  att:        'txt.att.net',
  sprint:     'messaging.sprintpcs.com',
  uscellular: 'email.uscc.net',
  boost:      'sms.myboostmobile.com',
  cricket:    'mms.cricketwireless.net',
  metro:      'mymetropcs.com',
}

function getSmsEmail(phone: string, carrier: string): string | null {
  const gateway = SMS_GATEWAYS[carrier]
  if (!gateway) return null
  const digits = phone.replace(/\D/g, '').slice(-10)
  return `${digits}@${gateway}`
}

// Map database event to notification event_type
function getEventType(table: string, record: any): string | null {
  switch (table) {
    case 'reports':
      return record.severity === 'severe' ? 'new_severe_report' : null
    case 'road_closures':
      return record.status === 'active' ? 'road_closed' : record.status === 'reopened' ? 'road_reopened' : null
    case 'safety_alerts':
      return `safety_alert_${record.visibility}` // public, officials, police
    case 'construction_notices':
      return record.status === 'scheduled' ? 'construction_new' : record.status === 'active' ? 'construction_active' : null
    case 'broadcast_messages':
      return 'broadcast'
    default:
      return null
  }
}

// Build notification content
function buildContent(table: string, record: any): { subject: string, body: string } {
  switch (table) {
    case 'reports':
      return {
        subject: `⚠ Severe Road Issue — ${record.report_type?.replace('_', ' ')} on Canaan Road`,
        body: `A severe road issue has been reported on Canaan Road Watch.\n\nType: ${record.report_type?.replace('_', ' ')}\nDescription: ${record.description}\n\nView it at: https://canaanroads.com`,
      }
    case 'road_closures':
      return {
        subject: `🚧 Road Closure — Canaan Road Watch`,
        body: `A road has been closed.\n\nReason: ${record.reason}\n\nView details at: https://canaanroads.com`,
      }
    case 'safety_alerts':
      return {
        subject: `🚨 Safety Alert — ${record.alert_type?.replace('_', ' ')} — Canaan`,
        body: `A safety alert has been filed.\n\nType: ${record.alert_type?.replace('_', ' ')}\nSeverity: ${record.severity}\nDetails: ${record.description || 'See canaanroads.com for details'}\n\nStay safe. View at: https://canaanroads.com`,
      }
    case 'construction_notices':
      return {
        subject: `🏗 Construction Notice — ${record.title}`,
        body: `A construction notice has been posted.\n\n${record.title}\n${record.description || ''}\n\nStart: ${record.start_date || 'TBD'}\nEnd: ${record.end_date || 'TBD'}\n\nView at: https://canaanroads.com`,
      }
    case 'broadcast_messages':
      return {
        subject: `📢 ${record.title} — Canaan Road Watch`,
        body: `${record.message}\n\n— Sent by Canaan Road Watch official\nView at: https://canaanroads.com`,
      }
    default:
      return { subject: 'Canaan Road Watch Update', body: 'Visit canaanroads.com for details.' }
  }
}

// Check if user is allowed to receive this event type
async function userCanReceiveEvent(userId: string, eventType: string): Promise<boolean> {
  // Officials-only events
  if (eventType === 'safety_alert_officials') {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).single()
    const officialRoles = ['admin', 'police_chief', 'police', 'road_agent_manager', 'road_agent', 'road_worker', 'town_administrator']
    return officialRoles.includes(data?.role)
  }
  // Police-only events
  if (eventType === 'safety_alert_police') {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).single()
    return ['admin', 'police_chief', 'police'].includes(data?.role)
  }
  return true
}

serve(async (req) => {
  try {
    const payload = await req.json()
    const { table, record, type } = payload

    // Only process INSERT events
    if (type !== 'INSERT') return new Response('OK', { status: 200 })

    const eventType = getEventType(table, record)
    if (!eventType) return new Response('No notification needed', { status: 200 })

    const { subject, body } = buildContent(table, record)

    // Get all users who have opted in to this event type
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, enabled, channels')
      .eq('event_type', eventType)
      .eq('enabled', true)

    if (!prefs || prefs.length === 0) return new Response('No subscribers', { status: 200 })

    let sent = 0
    let failed = 0

    for (const pref of prefs) {
      // Check role-based access
      const canReceive = await userCanReceiveEvent(pref.user_id, eventType)
      if (!canReceive) continue

      const channels = pref.channels as { email: boolean; sms: boolean }

      // Get user's active contacts
      const { data: contacts } = await supabase
        .from('notification_contacts')
        .select('*')
        .eq('user_id', pref.user_id)
        .eq('active', true)

      if (!contacts || contacts.length === 0) continue

      for (const contact of contacts) {
        let destination: string | null = null

        if (contact.type === 'email' && channels.email) {
          destination = contact.value
        } else if (contact.type === 'sms' && channels.sms && contact.carrier) {
          destination = getSmsEmail(contact.value, contact.carrier)
        }

        if (!destination) continue

        // Send via Supabase Auth email (or your preferred email provider)
        try {
          const { error } = await supabase.auth.admin.inviteUserByEmail(destination)
          // Note: In production replace with your email service:
          // Resend, SendGrid, Postmark, or Supabase SMTP
          // Example with fetch to Resend:
          // await fetch('https://api.resend.com/emails', {
          //   method: 'POST',
          //   headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
          //   body: JSON.stringify({ from: 'alerts@canaanroads.com', to: destination, subject, text: body })
          // })

          // Log the send
          await supabase.from('notification_log').insert({
            user_id: pref.user_id,
            event_type: eventType,
            event_id: record.id?.toString(),
            channel: contact.type,
            destination,
            status: 'sent',
          })
          sent++
        } catch (e) {
          await supabase.from('notification_log').insert({
            user_id: pref.user_id,
            event_type: eventType,
            event_id: record.id?.toString(),
            channel: contact.type,
            destination,
            status: 'failed',
          })
          failed++
        }
      }
    }

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
