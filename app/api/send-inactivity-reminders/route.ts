// ============================================================
// GET/POST /api/send-inactivity-reminders
//
// A lighter-touch companion to /api/send-weekly-emails: rather than
// waiting for the weekly digest, this nudges a student the moment
// they've gone quiet for a few days — while there's still most of
// the week left to get back into a rhythm.
//
// For each student with `email_notifications = true` (the same
// opt-in the weekly digest uses — its description on the Profile
// page already promises "writing reminders", not just a weekly
// summary, so this fulfills that instead of adding a second toggle):
//   - Look at `user_stats.last_activity` (updated whenever a score
//     is inserted — i.e. their last SCORED essay, not just a draft
//     edit).
//   - Send a nudge if it's been >= INACTIVITY_THRESHOLD_DAYS, they've
//     written at least one essay ever (a student who's never
//     submitted gets a different "welcome" flow, not a "you've gone
//     quiet" message), and we haven't already sent a reminder since
//     their last write.
//   - At most ONE reminder per inactivity streak — writing again
//     advances `last_activity` past the last reminder timestamp, so
//     this can never turn into a daily nag. See migration
//     0018_inactivity_reminder_tracking.sql.
//
// Meant to run once a day via Vercel Cron (see vercel.json).
// Protected by CRON_SECRET, same pattern as the other cron routes
// (generate-daily-prompts, send-weekly-emails, refresh-leaderboard).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendViaEmailJs, escapeHtml, getEmailJsCredentialsFromEnv } from '@/lib/email'
import { formatDate, daysUntilManila } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pasaboost.vercel.app'

// Fires once the student has gone this many whole days without a
// scored essay. 3 days gives a mid-week nudge well before the
// weekly digest would otherwise be the first they hear about it.
const INACTIVITY_THRESHOLD_DAYS = 3

interface NudgeData {
  displayName: string | null
  daysInactive: number
  examType: string | null
  examDaysLeft: number | null
}

function buildSubject(): string {
  return "Haven't written in a few days?"
}

function buildEmailHtml(data: NudgeData): string {
  const name = data.displayName || 'there'

  const examLine =
    data.examType && data.examDaysLeft !== null && data.examDaysLeft >= 0
      ? `
      <p style="margin:0 0 20px;color:#333;font-size:14px;line-height:1.6;">
        Your ${escapeHtml(data.examType)} exam is ${
          data.examDaysLeft === 0 ? 'today' : `in ${data.examDaysLeft} day${data.examDaysLeft === 1 ? '' : 's'}`
        } — every essay between now and then adds up.
      </p>`
      : ''

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;">
    <div style="background:#0f172a;padding:24px 28px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700;">PasaBoost</h1>
      <p style="margin:4px 0 0;color:#cbd5e1;font-size:12px;">${escapeHtml(formatDate(new Date()))}</p>
    </div>
    <div style="background:#fff;padding:28px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
      <p style="margin:0 0 20px;color:#333;font-size:14px;line-height:1.6;">
        Hi ${escapeHtml(name)}, it's been ${data.daysInactive} days since your last scored essay.
        A short one today is enough to keep your momentum going.
      </p>
      ${examLine}
      <a href="${APP_URL}/editor" style="display:inline-block;padding:12px 22px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        Write an essay →
      </a>
      <p style="margin:28px 0 0;color:#999;font-size:11px;line-height:1.5;">
        You're receiving this because Email Notifications is turned on in your PasaBoost profile.
        You can turn it off any time from Profile → Preferences.
      </p>
    </div>
  </div>`
}

async function handleSend(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    console.warn('send-inactivity-reminders: CRON_SECRET is not set — this route is currently unprotected.')
  }

  const creds = getEmailJsCredentialsFromEnv()
  if (!creds) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Email sending is not configured. Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, and EMAILJS_PRIVATE_KEY on the server.',
      },
      { status: 503 }
    )
  }

  const supabase = createServiceRoleClient()

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, exam_type, exam_date, last_inactivity_reminder_sent_at')
    .eq('email_notifications', true)

  if (profilesError) {
    console.error('send-inactivity-reminders: failed to load profiles:', profilesError.message)
    return NextResponse.json({ success: false, error: 'Database error loading profiles.' }, { status: 500 })
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ success: true, sent: 0, skipped: 0, failed: 0, total: 0, message: 'No opted-in students.' })
  }

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const profile of profiles) {
    try {
      const { data: stats } = await supabase
        .from('user_stats')
        .select('last_activity, total_essays')
        .eq('user_id', profile.id)
        .single()

      // No stats row, or never submitted an essay — nothing to be
      // "quiet" about yet. A first-essay nudge is a different feature.
      if (!stats || !stats.total_essays || !stats.last_activity) {
        skipped++
        continue
      }

      const lastActivity = new Date(stats.last_activity)
      const daysInactive = Math.floor((Date.now() - lastActivity.getTime()) / 86400000)

      if (daysInactive < INACTIVITY_THRESHOLD_DAYS) {
        skipped++
        continue
      }

      // Already reminded since they last wrote — wait for them to
      // either write again (which advances last_activity and re-arms
      // this check) or hear from the weekly digest instead of
      // nudging every single day they stay inactive.
      if (
        profile.last_inactivity_reminder_sent_at &&
        new Date(profile.last_inactivity_reminder_sent_at) > lastActivity
      ) {
        skipped++
        continue
      }

      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id)
      const email = authUser?.user?.email
      if (authError || !email) {
        skipped++
        continue
      }

      const examDaysLeft = profile.exam_date ? daysUntilManila(profile.exam_date) : null

      const result = await sendViaEmailJs(creds, {
        to: email,
        subject: buildSubject(),
        html: buildEmailHtml({
          displayName: profile.display_name,
          daysInactive,
          examType: profile.exam_type,
          examDaysLeft,
        }),
      })

      if (!result.ok) {
        console.error(`send-inactivity-reminders: failed to send to ${profile.id} (${result.status}):`, result.body)
        failed++
        continue
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ last_inactivity_reminder_sent_at: new Date().toISOString() })
        .eq('id', profile.id)

      if (updateError) {
        // Email went out but we couldn't record it — log loudly, since
        // silently swallowing this would turn into a daily nag for
        // this one student instead of a single reminder.
        console.error(`send-inactivity-reminders: sent to ${profile.id} but failed to record it:`, updateError.message)
      }

      sent++
    } catch (err) {
      console.error(`send-inactivity-reminders: error processing ${profile.id}:`, err)
      failed++
    }
  }

  return NextResponse.json({ success: true, sent, skipped, failed, total: profiles.length, timestamp: new Date().toISOString() })
}

// Vercel Cron makes a GET request by default.
export async function GET(req: NextRequest) {
  return handleSend(req)
}

// Also allow POST for manual/admin triggering with the same auth check.
export async function POST(req: NextRequest) {
  return handleSend(req)
}
