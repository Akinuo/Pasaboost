// ============================================================
// GET/POST /api/refresh-leaderboard
//
// Recomputes one "Overall" row plus one row per exam type for every
// user currently opted into the leaderboard, then upserts the fresh
// numbers back into `leaderboard`. This is what keeps rankings
// current even for students who haven't opened their Profile page,
// and it backfills exam-specific rows (UPCAT/ACET/DCAT/USTET) that
// never existed before — the editor page also syncs a student's own
// rows immediately after each new essay, so this cron is mainly a
// safety net and cross-device/cross-user consistency pass.
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
// Also self-heals: removes any leaderboard rows left behind for a user
// who has since turned leaderboard participation off.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { computeLeaderboardRows, OVERALL_LEADERBOARD_KEY } from '@/lib/utils'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ScoreRow {
  user_id: string
  total_score: number
  exam_type: string
  created_at: string | null
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

  // 1. Self-heal: drop any leaderboard rows for a user who has since opted out
  //    (normally handled client-side, but this keeps things consistent even
  //    if that ever fails partway through).
  const { data: optedOut } = await supabase
    .from('profiles')
    .select('id')
    .eq('leaderboard_enabled', false)

  if (optedOut && optedOut.length > 0) {
    await supabase.from('leaderboard').delete().in('user_id', optedOut.map((p) => p.id))
  }

  // 2. Load one canonical row per opted-in user — the 'Overall' row always
  //    exists for anyone opted in, so it's a safe marker for "this user
  //    should have leaderboard rows" and carries their current alias.
  const { data: rows, error: rowsError } = await supabase
    .from('leaderboard')
    .select('user_id, alias')
    .eq('exam_type', OVERALL_LEADERBOARD_KEY)

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
    .select('user_id, total_score, exam_type, created_at')
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

  // 4. Recompute Overall + one row per exam type actually present in each
  //    user's scores. This naturally creates any missing exam-type rows
  //    (the backfill) and refreshes existing ones in the same pass.
  const updates = rows.flatMap((row) => {
    const userScores = byUser.get(row.user_id) ?? []
    const rowsForUser = computeLeaderboardRows(
      row.user_id,
      row.alias,
      userScores.map((s) => ({ totalScore: s.total_score, examType: s.exam_type }))
    )
    return rowsForUser.map((r) => ({ ...r, last_updated: new Date().toISOString() }))
  })

  const { error: upsertError } = await supabase.from('leaderboard').upsert(updates)

  if (upsertError) {
    console.error('refresh-leaderboard: upsert failed:', upsertError.message)
    return NextResponse.json({ success: false, error: 'Failed to save refreshed leaderboard.' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    usersRefreshed: rows.length,
    rowsUpserted: updates.length,
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
