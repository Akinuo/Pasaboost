// ============================================================
// GET/POST /api/refresh-leaderboard
//
// Recomputes average_score, essay_count, best_score, and improvement
// for every user currently opted into the leaderboard, then upserts
// the fresh numbers back into `leaderboard`. This is what keeps rankings
// current even for students who haven't opened their Profile page —
// previously the leaderboard only updated when a user toggled the
// setting themselves.
//
// Meant to be triggered every 30 minutes by a scheduled GitHub Actions
// workflow (see .github/workflows/refresh-leaderboard.yml) rather than
// Vercel Cron, since Vercel's Hobby plan only allows once-daily jobs.
// The leaderboard page itself listens for the resulting row changes via
// Supabase Realtime, so every open tab updates the moment this runs —
// not a normal user-facing route.
//
// Protected by CRON_SECRET: the workflow sends
// `Authorization: Bearer $CRON_SECRET`, so this checks that header
// rather than requiring a signed-in user. Same pattern as
// /api/generate-daily-prompts.
//
// Also self-heals: removes any leaderboard row left behind for a user
// who has since turned leaderboard participation off.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ScoreRow {
  user_id: string
  total_score: number
  created_at: string | null
}

// Recent-half vs. earlier-half average, so "improvement" reflects a
// genuine trend rather than a single lucky (or unlucky) essay.
function computeImprovement(totals: number[]): number {
  if (totals.length < 2) return 0
  const recentCount = Math.max(1, Math.min(3, Math.floor(totals.length / 2)))
  const recent = totals.slice(-recentCount)
  const earlier = totals.slice(0, totals.length - recentCount)
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
  return Math.round(avg(recent) - avg(earlier))
}

async function handleRefresh(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    console.warn('refresh-leaderboard: CRON_SECRET is not set — this route is currently unprotected.')
  }

  const supabase = createServiceRoleClient()

  // 1. Self-heal: drop any leaderboard row for a user who has since opted out
  //    (normally handled client-side, but this keeps things consistent even
  //    if that ever fails partway through).
  const { data: optedOut } = await supabase
    .from('profiles')
    .select('id')
    .eq('leaderboard_enabled', false)

  if (optedOut && optedOut.length > 0) {
    await supabase.from('leaderboard').delete().in('user_id', optedOut.map((p) => p.id))
  }

  // 2. Load every currently opted-in leaderboard row (alias is preserved as-is —
  //    it's generated once client-side and shouldn't change underneath a user).
  const { data: rows, error: rowsError } = await supabase.from('leaderboard').select('user_id, alias')

  if (rowsError) {
    console.error('refresh-leaderboard: failed to load leaderboard rows:', rowsError.message)
    return NextResponse.json({ success: false, error: 'Database error loading leaderboard.' }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ success: true, updated: 0, cleaned: optedOut?.length ?? 0, message: 'No opted-in users to refresh.' })
  }

  const userIds = rows.map((r) => r.user_id)

  // 3. Pull every score for those users in one query and group in memory —
  //    far cheaper than one round trip per user.
  const { data: scores, error: scoresError } = await supabase
    .from('scores')
    .select('user_id, total_score, created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: true })

  if (scoresError) {
    console.error('refresh-leaderboard: failed to load scores:', scoresError.message)
    return NextResponse.json({ success: false, error: 'Database error loading scores.' }, { status: 500 })
  }

  const byUser = new Map<string, ScoreRow[]>()
  for (const s of (scores ?? []) as ScoreRow[]) {
    const list = byUser.get(s.user_id) ?? []
    list.push(s)
    byUser.set(s.user_id, list)
  }

  const updates = rows.map((row) => {
    const totals = (byUser.get(row.user_id) ?? []).map((s) => s.total_score)
    const essayCount = totals.length
    const averageScore = essayCount ? Math.round(totals.reduce((s, v) => s + v, 0) / essayCount) : 0
    const bestScore = essayCount ? Math.max(...totals) : 0

    return {
      user_id: row.user_id,
      alias: row.alias,
      average_score: averageScore,
      essay_count: essayCount,
      best_score: bestScore,
      improvement: computeImprovement(totals),
      last_updated: new Date().toISOString(),
    }
  })

  const { error: upsertError } = await supabase.from('leaderboard').upsert(updates)

  if (upsertError) {
    console.error('refresh-leaderboard: upsert failed:', upsertError.message)
    return NextResponse.json({ success: false, error: 'Failed to save refreshed leaderboard.' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    updated: updates.length,
    cleaned: optedOut?.length ?? 0,
    timestamp: new Date().toISOString(),
  })
}

// GitHub Actions calls this on a schedule (GET).
export async function GET(req: NextRequest) {
  return handleRefresh(req)
}

// Also allow POST for manual/admin triggering with the same auth check.
export async function POST(req: NextRequest) {
  return handleRefresh(req)
}
