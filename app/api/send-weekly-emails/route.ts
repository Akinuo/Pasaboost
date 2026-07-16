// ============================================================
// GET/POST /api/send-weekly-emails
//
// Actually sends the "weekly progress summaries and writing
// reminders" that the Email Notifications toggle on the Profile
// page has promised since it was added. Meant to be triggered once
// a week by Vercel Cron (see vercel.json) — not a normal user-facing
// route.
//
// For each student with `email_notifications = true`:
//   - If they wrote at least one essay this week, they get a
//     progress summary (essays this week, average score, streak,
//     and — reusing the same "weakness-targeted practice" logic as
//     the Dashboard — their lowest-scoring rubric dimension).
//   - If they didn't, they get a short, friendly reminder instead.
//
// Protected by CRON_SECRET, same pattern as the other cron routes
// in this app (generate-daily-prompts, refresh-leaderboard).
//
// Note on scale: this looks up each recipient's email via
// `auth.admin.getUserById`, one call per user. That's fine at
// PasaBoost's current size; if the student base grows large enough
// for that to matter, switch to paginating `auth.admin.listUsers()`
// once and matching by id instead of one lookup per user.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getWeakestDimension, DIMENSION_DESCRIPTIONS, formatDate } from '@/lib/utils'
import { sendViaEmailJs, escapeHtml, getEmailJsCredentialsFromEnv } from '@/lib/email'
import type { ScoreDimension } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pasaboost.vercel.app'

interface RecipientData {
  userId: string
  displayName: string | null
  thisWeekCount: number
  currentStreak: number
  weeklyGoal: number
  averageScore: number
  weakest: { dimension: ScoreDimension; averageScore: number } | null
}

function buildSubject(data: RecipientData): string {
  if (data.thisWeekCount > 0) return `Your PasaBoost week: ${data.thisWeekCount} essay${data.thisWeekCount > 1 ? 's' : ''} scored`
  return "Haven't written this week? Let's fix that."
}

function buildEmailHtml(data: RecipientData): string {
  const name = data.displayName || 'there'
  const wroteThisWeek = data.thisWeekCount > 0

  const bodyHtml = wroteThisWeek
    ? `
      <p style="margin:0 0 16px;color:#333;font-size:14px;line-height:1.6;">
        Hi ${escapeHtml(name)}, here's how your writing went this week:
      </p>
      <table role="presentation" width="100%" style="margin:0 0 20px;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 16px;background:#f5f5f7;border-radius:8px 0 0 8px;">
            <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.04em;">Essays this week</div>
            <div style="font-size:22px;font-weight:700;color:#0f172a;">${data.thisWeekCount}</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:12px 16px;background:#f5f5f7;">
            <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.04em;">Average score</div>
            <div style="font-size:22px;font-weight:700;color:#0f172a;">${data.averageScore}/100</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:12px 16px;background:#f5f5f7;border-radius:0 8px 8px 0;">
            <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.04em;">Current streak</div>
            <div style="font-size:22px;font-weight:700;color:#0f172a;">${data.currentStreak}d</div>
          </td>
        </tr>
      </table>
      ${data.weakest ? `
      <p style="margin:0 0 20px;color:#333;font-size:14px;line-height:1.6;">
        <strong>${escapeHtml(data.weakest.dimension)}</strong> is your lowest-scoring dimension right now, averaging
        <strong>${data.weakest.averageScore.toFixed(1)}/20</strong> — ${escapeHtml(DIMENSION_DESCRIPTIONS[data.weakest.dimension])}.
        Your Dashboard has prompts picked to target it.
      </p>
      ` : ''}
    `
    : `
      <p style="margin:0 0 20px;color:#333;font-size:14px;line-height:1.6;">
        Hi ${escapeHtml(name)}, we didn't see a new essay from you this week. A little consistent practice goes
        a long way toward exam day — even one essay keeps your momentum going.
      </p>
    `

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;">
    <div style="background:#0f172a;padding:24px 28px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700;">PasaBoost</h1>
      <p style="margin:4px 0 0;color:#cbd5e1;font-size:12px;">Weekly Progress Update · ${escapeHtml(formatDate(new Date()))}</p>
    </div>
    <div style="background:#fff;padding:28px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
      ${bodyHtml}
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
    console.warn('send-weekly-emails: CRON_SECRET is not set — this route is currently unprotected.')
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
    .select('id, display_name')
    .eq('email_notifications', true)

  if (profilesError) {
    console.error('send-weekly-emails: failed to load profiles:', profilesError.message)
    return NextResponse.json({ success: false, error: 'Database error loading profiles.' }, { status: 500 })
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ success: true, sent: 0, skipped: 0, failed: 0, message: 'No opted-in students.' })
  }

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const profile of profiles) {
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id)
      const email = authUser?.user?.email
      if (authError || !email) {
        skipped++
        continue
      }

      const { data: stats } = await supabase.from('user_stats').select('*').eq('user_id', profile.id).single()
      const { data: recentScores } = await supabase
        .from('scores')
        .select('rubric_scores, total_score')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // A brand-new student with zero essays ever gets no email this
      // round — nothing to summarize and a reminder would be premature.
      if (!recentScores || recentScores.length === 0) {
        skipped++
        continue
      }

      const averageScore = Math.round(recentScores.reduce((s, r) => s + r.total_score, 0) / recentScores.length)
      const weakestResult = getWeakestDimension(
        recentScores.map((r) => ({ rubricScores: (r.rubric_scores as unknown as { dimension: ScoreDimension; score: number }[]) ?? [] }))
      )

      const data: RecipientData = {
        userId: profile.id,
        displayName: profile.display_name,
        thisWeekCount: stats?.this_week_count ?? 0,
        currentStreak: stats?.current_streak ?? 0,
        weeklyGoal: stats?.weekly_goal ?? 0,
        averageScore,
        weakest: weakestResult ? { dimension: weakestResult.dimension, averageScore: weakestResult.averageScore } : null,
      }

      const result = await sendViaEmailJs(creds, {
        to: email,
        subject: buildSubject(data),
        html: buildEmailHtml(data),
      })

      if (!result.ok) {
        console.error(`send-weekly-emails: failed to send to ${profile.id} (${result.status}):`, result.body)
        failed++
      } else {
        sent++
      }
    } catch (err) {
      console.error(`send-weekly-emails: error processing ${profile.id}:`, err)
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
