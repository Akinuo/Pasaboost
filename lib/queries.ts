// ============================================================
// Supabase Query Layer
// All database reads/writes for PasaBoost, using Postgres via
// the Supabase client. Converts snake_case rows <-> camelCase
// app types so the rest of the app never sees raw DB shapes.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { computeLeaderboardRows, OVERALL_LEADERBOARD_KEY } from '@/lib/utils'
import type {
  EssayDraft, EssayScore, UserStats, UserProfile,
  LeaderboardEntry, ScoreDataPoint, ExamType, RubricScore, WritingPrompt,
  CommunityPost, CommunityComment, AppNotification,
} from '@/types'

type TypedClient = SupabaseClient<Database>

// ============================================================
// Row → App type converters
// ============================================================

function rowToDraft(row: Database['public']['Tables']['drafts']['Row']): EssayDraft {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title ?? 'Untitled',
    content: row.content,
    prompt: row.prompt ?? undefined,
    promptCategory: (row.prompt_category as EssayDraft['promptCategory']) ?? undefined,
    examType: row.exam_type as ExamType,
    wordCount: row.word_count ?? 0,
    createdAt: new Date(row.created_at ?? Date.now()),
    updatedAt: new Date(row.updated_at ?? row.created_at ?? Date.now()),
    isSubmitted: row.is_submitted ?? false,
    scoreId: row.score_id ?? undefined,
    examModeStartedAt: row.exam_mode_started_at ? new Date(row.exam_mode_started_at) : undefined,
    examModeTimeLimitSeconds: row.exam_mode_time_limit_seconds ?? undefined,
  }
}

function rowToScore(row: Database['public']['Tables']['scores']['Row']): EssayScore {
  return {
    id: row.id,
    essayId: row.essay_id ?? undefined,
    userId: row.user_id,
    essay: row.essay,
    prompt: row.prompt ?? undefined,
    examType: row.exam_type as ExamType,
    totalScore: row.total_score,
    rubricScores: row.rubric_scores as unknown as RubricScore[],
    overallFeedback: row.overall_feedback ?? '',
    strengths: (row.strengths as string[]) ?? [],
    weaknesses: (row.weaknesses as string[]) ?? [],
    suggestions: (row.suggestions as string[]) ?? [],
    paragraphRewrites: (row.paragraph_rewrites as unknown as EssayScore['paragraphRewrites']) ?? [],
    estimatedBand: (row.estimated_band as EssayScore['estimatedBand']) ?? 'Developing (60-74)',
    readabilityScore: row.readability_score ?? undefined,
    vocabularyDiversity: row.vocabulary_diversity ?? undefined,
    createdAt: new Date(row.created_at ?? Date.now()),
    modelVersion: row.model_version ?? undefined,
    grammarIssues: ((row as any).grammar_issues as EssayScore['grammarIssues']) ?? [],
    aiDetection: (row as any).ai_likelihood != null ? {
      likelihood: (row as any).ai_likelihood,
      verdict: (row as any).ai_verdict ?? 'Mixed / Possibly AI-Assisted',
      indicators: ((row as any).ai_indicators as string[]) ?? [],
      explanation: (row as any).ai_explanation ?? '',
    } : undefined,
    originality: (row as any).originality_score != null ? {
      score: (row as any).originality_score,
      flagged: !!(row as any).originality_flagged,
      note: (row as any).originality_note ?? '',
      matchedEssayId: (row as any).originality_matched_essay_id ?? undefined,
      similarityPercent: (row as any).originality_similarity_percent ?? undefined,
    } : undefined,
    aiPenaltyApplied: (row as any).ai_penalty_applied ?? undefined,
    preAIPenaltyScore: (row as any).pre_ai_penalty_score ?? undefined,
    examMode: (row as any).exam_mode ?? false,
    timeLimitSeconds: (row as any).time_limit_seconds ?? undefined,
    timeTakenSeconds: (row as any).time_taken_seconds ?? undefined,
  }
}

function rowToStats(row: Database['public']['Tables']['user_stats']['Row']): UserStats {
  return {
    userId: row.user_id,
    totalEssays: row.total_essays ?? 0,
    averageScore: row.average_score ?? 0,
    bestScore: row.best_score ?? 0,
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
    lastActivity: new Date(row.last_activity ?? Date.now()),
    weeklyGoal: row.weekly_goal ?? 0,
    thisWeekCount: row.this_week_count ?? 0,
    totalWords: row.total_words ?? 0,
  }
}

// ============================================================
// Profile
// ============================================================

export async function getProfile(supabase: TypedClient, userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error || !data) return null
  return {
    id: data.id,
    displayName: data.display_name,
    photoUrl: data.photo_url,
    email: null, // email lives on auth.users, merged in by the caller if needed
    leaderboardEnabled: data.leaderboard_enabled ?? false,
    leaderboardAlias: data.leaderboard_alias,
    emailNotifications: data.email_notifications ?? true,
  }
}

export async function updateProfile(
  supabase: TypedClient,
  userId: string,
  updates: Partial<{ displayName: string; leaderboardEnabled: boolean; leaderboardAlias: string; emailNotifications: boolean }>
) {
  const { error } = await supabase
    .from('profiles')
    .update({
      ...(updates.displayName !== undefined && { display_name: updates.displayName }),
      ...(updates.leaderboardEnabled !== undefined && { leaderboard_enabled: updates.leaderboardEnabled }),
      ...(updates.leaderboardAlias !== undefined && { leaderboard_alias: updates.leaderboardAlias }),
      ...(updates.emailNotifications !== undefined && { email_notifications: updates.emailNotifications }),
    })
    .eq('id', userId)
  if (error) throw error
}

// ============================================================
// User stats
// ============================================================

export async function getUserStats(supabase: TypedClient, userId: string): Promise<UserStats | null> {
  const { data, error } = await supabase.from('user_stats').select('*').eq('user_id', userId).single()
  if (error || !data) return null
  return rowToStats(data)
}

// ============================================================
// Drafts
// ============================================================

export async function saveDraft(
  supabase: TypedClient,
  draft: {
    userId: string
    title: string
    content: string
    examType: ExamType
    prompt?: string
    wordCount: number
    isSubmitted?: boolean
    examModeStartedAt?: Date | null
    examModeTimeLimitSeconds?: number | null
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('drafts')
    .insert({
      user_id: draft.userId,
      title: draft.title,
      content: draft.content,
      exam_type: draft.examType,
      prompt: draft.prompt,
      word_count: draft.wordCount,
      is_submitted: draft.isSubmitted ?? false,
      exam_mode_started_at: draft.examModeStartedAt ? draft.examModeStartedAt.toISOString() : undefined,
      exam_mode_time_limit_seconds: draft.examModeTimeLimitSeconds ?? undefined,
    })
    .select('id')
    .single()

  if (error || !data) throw error ?? new Error('Failed to save draft')
  return data.id
}

export async function updateDraft(
  supabase: TypedClient,
  draftId: string,
  updates: Partial<{
    title: string
    content: string
    examType: ExamType
    prompt: string
    wordCount: number
    isSubmitted: boolean
    examModeStartedAt: Date | null
    examModeTimeLimitSeconds: number | null
  }>
): Promise<void> {
  const { error } = await supabase
    .from('drafts')
    .update({
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.content !== undefined && { content: updates.content }),
      ...(updates.examType !== undefined && { exam_type: updates.examType }),
      ...(updates.prompt !== undefined && { prompt: updates.prompt }),
      ...(updates.wordCount !== undefined && { word_count: updates.wordCount }),
      ...(updates.isSubmitted !== undefined && { is_submitted: updates.isSubmitted }),
      ...(updates.examModeStartedAt !== undefined && { exam_mode_started_at: updates.examModeStartedAt ? updates.examModeStartedAt.toISOString() : null }),
      ...(updates.examModeTimeLimitSeconds !== undefined && { exam_mode_time_limit_seconds: updates.examModeTimeLimitSeconds }),
    })
    .eq('id', draftId)
  if (error) throw error
}

export async function deleteDraft(supabase: TypedClient, draftId: string): Promise<void> {
  const { error } = await supabase.from('drafts').delete().eq('id', draftId)
  if (error) throw error
}

export async function getUserDrafts(supabase: TypedClient, userId: string): Promise<EssayDraft[]> {
  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50)
  if (error || !data) return []
  return data.map(rowToDraft)
}

export async function getDraft(supabase: TypedClient, draftId: string): Promise<EssayDraft | null> {
  const { data, error } = await supabase.from('drafts').select('*').eq('id', draftId).single()
  if (error || !data) return null
  return rowToDraft(data)
}

// ============================================================
// Scores
// ============================================================

export async function getScore(supabase: TypedClient, scoreId: string): Promise<EssayScore | null> {
  const { data, error } = await supabase.from('scores').select('*').eq('id', scoreId).single()
  if (error || !data) return null
  return rowToScore(data)
}

export async function getUserScores(
  supabase: TypedClient,
  userId: string,
  options?: { examType?: ExamType; limit?: number }
): Promise<EssayScore[]> {
  let query = supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 100)

  if (options?.examType) {
    query = query.eq('exam_type', options.examType)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data.map(rowToScore)
}

export async function getScoreHistory(supabase: TypedClient, userId: string): Promise<ScoreDataPoint[]> {
  const scores = await getUserScores(supabase, userId, { limit: 50 })
  return scores.reverse().map((s) => ({
    date: s.createdAt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
    totalScore: s.totalScore,
    content: s.rubricScores.find((r) => r.dimension === 'Content')?.score ?? 0,
    organization: s.rubricScores.find((r) => r.dimension === 'Organization')?.score ?? 0,
    grammar: s.rubricScores.find((r) => r.dimension === 'Grammar')?.score ?? 0,
    coherence: s.rubricScores.find((r) => r.dimension === 'Coherence')?.score ?? 0,
    argument: s.rubricScores.find((r) => r.dimension === 'Argument')?.score ?? 0,
    essayId: s.id,
    examType: s.examType,
  }))
}

/**
 * Counts scores created in the last hour — used as a zero-infra
 * rate limit check (no separate KV/Redis needed).
 */
export async function getRecentScoreCount(supabase: TypedClient, userId: string): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString()
  const { count, error } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)
  if (error) return 0
  return count ?? 0
}

// ============================================================
// Leaderboard
// ============================================================

export async function getLeaderboard(
  supabase: TypedClient,
  examType?: ExamType,
  topN = 20
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('exam_type', examType ?? OVERALL_LEADERBOARD_KEY)
    .order('average_score', { ascending: false })
    .limit(topN)

  if (error || !data) return []

  return data.map((row, idx) => ({
    rank: idx + 1,
    alias: row.alias,
    averageScore: row.average_score,
    essayCount: row.essay_count,
    bestScore: row.best_score,
    improvement: row.improvement ?? 0,
    examType: row.exam_type === OVERALL_LEADERBOARD_KEY ? undefined : (row.exam_type as ExamType),
    badge: row.badge ?? undefined,
  }))
}

// Recomputes and upserts one "Overall" row plus one row per exam type
// the student has at least one score for. Called whenever a student
// opts into the leaderboard and again right after each new essay is
// scored, so their entry (and the specific exam-type tab it belongs
// under) stays current without waiting on the periodic cron refresh.
export async function syncLeaderboardEntries(
  supabase: TypedClient,
  userId: string,
  alias: string,
  scoresOldestFirst: Array<{ totalScore: number; examType: ExamType }>,
  currentStreak?: number
): Promise<void> {
  const rows = computeLeaderboardRows(userId, alias, scoresOldestFirst, currentStreak).map((row) => ({
    ...row,
    last_updated: new Date().toISOString(),
  }))
  const { error } = await supabase.from('leaderboard').upsert(rows)
  if (error) throw error
}

// Renames the student's alias across every one of their existing rows
// (Overall + each exam type) without touching their score aggregates.
export async function renameLeaderboardAlias(supabase: TypedClient, userId: string, alias: string): Promise<void> {
  const { error } = await supabase.from('leaderboard').update({ alias }).eq('user_id', userId)
  if (error) throw error
}

export async function removeLeaderboardEntry(supabase: TypedClient, userId: string): Promise<void> {
  const { error } = await supabase.from('leaderboard').delete().eq('user_id', userId)
  if (error) throw error
}

// ============================================================
// Daily AI-generated prompts
// Reads whatever the most recent generated batch is — normally
// today's, but falls back to the latest available batch if the
// daily job hasn't run yet (e.g. right after midnight) so the
// prompts page is never empty.
// ============================================================
export async function getDailyGeneratedPrompts(supabase: TypedClient, limit = 20): Promise<WritingPrompt[]> {
  const { data: latest } = await supabase
    .from('daily_prompts')
    .select('generated_date')
    .order('generated_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latest) return []

  const { data, error } = await supabase
    .from('daily_prompts')
    .select('*')
    .eq('generated_date', latest.generated_date)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    text: row.text,
    category: row.category as WritingPrompt['category'],
    examType: row.exam_type as ExamType[],
    difficulty: row.difficulty as WritingPrompt['difficulty'],
    keywords: row.keywords,
    tip: row.tip ?? undefined,
    isDaily: true,
    date: row.generated_date,
  }))
}

// ============================================================
// Community — shared essays, likes, comments
// ============================================================

function rowToCommunityPost(
  row: Database['public']['Tables']['community_posts']['Row'],
  currentUserId: string,
  likedPostIds: Set<string>
): CommunityPost {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.is_anonymous ? 'Anonymous' : row.display_name,
    isAnonymous: row.is_anonymous,
    title: row.title,
    essay: row.essay,
    prompt: row.prompt ?? undefined,
    examType: row.exam_type as ExamType,
    scoreId: row.score_id ?? undefined,
    totalScore: row.total_score ?? undefined,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    likedByMe: likedPostIds.has(row.id),
    isOwn: row.user_id === currentUserId,
    createdAt: new Date(row.created_at ?? Date.now()),
  }
}

/**
 * Fetches the community feed plus, in one extra query, which of those
 * posts the current user has already liked — so the like button can
 * render correctly on first paint without an extra round-trip.
 */
export async function getCommunityPosts(
  supabase: TypedClient,
  currentUserId: string,
  options?: { examType?: ExamType; limit?: number }
): Promise<CommunityPost[]> {
  let query = supabase
    .from('community_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50)

  if (options?.examType) {
    query = query.eq('exam_type', options.examType)
  }

  const { data, error } = await query
  if (error || !data) return []

  const postIds = data.map((r) => r.id)
  let likedPostIds = new Set<string>()
  if (postIds.length > 0) {
    const { data: likes } = await supabase
      .from('community_likes')
      .select('post_id')
      .eq('user_id', currentUserId)
      .in('post_id', postIds)
    likedPostIds = new Set((likes ?? []).map((l) => l.post_id))
  }

  return data.map((row) => rowToCommunityPost(row, currentUserId, likedPostIds))
}

export async function getCommunityPost(
  supabase: TypedClient,
  postId: string,
  currentUserId: string
): Promise<CommunityPost | null> {
  const { data, error } = await supabase.from('community_posts').select('*').eq('id', postId).single()
  if (error || !data) return null

  const { data: like } = await supabase
    .from('community_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', currentUserId)
    .maybeSingle()

  return rowToCommunityPost(data, currentUserId, new Set(like ? [postId] : []))
}

export async function createCommunityPost(
  supabase: TypedClient,
  post: {
    userId: string
    displayName: string
    isAnonymous: boolean
    title: string
    essay: string
    examType: ExamType
    prompt?: string
    scoreId?: string
    totalScore?: number
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      user_id: post.userId,
      display_name: post.displayName,
      is_anonymous: post.isAnonymous,
      title: post.title,
      essay: post.essay,
      exam_type: post.examType,
      prompt: post.prompt,
      score_id: post.scoreId,
      total_score: post.totalScore,
    })
    .select('id')
    .single()

  if (error || !data) throw error ?? new Error('Failed to share essay')
  return data.id
}

export async function deleteCommunityPost(supabase: TypedClient, postId: string): Promise<void> {
  const { error } = await supabase.from('community_posts').delete().eq('id', postId)
  if (error) throw error
}

export async function likeCommunityPost(supabase: TypedClient, postId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('community_likes').insert({ post_id: postId, user_id: userId })
  // Ignore duplicate-like races (unique constraint) — end state is the same either way.
  if (error && error.code !== '23505') throw error
}

export async function unlikeCommunityPost(supabase: TypedClient, postId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', userId)
  if (error) throw error
}

export async function getCommunityComments(supabase: TypedClient, postId: string, currentUserId: string): Promise<CommunityComment[]> {
  const { data, error } = await supabase
    .from('community_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((row) => ({
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    displayName: row.display_name,
    content: row.content,
    isOwn: row.user_id === currentUserId,
    createdAt: new Date(row.created_at ?? Date.now()),
  }))
}

export async function addCommunityComment(
  supabase: TypedClient,
  comment: { postId: string; userId: string; displayName: string; content: string }
): Promise<string> {
  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: comment.postId,
      user_id: comment.userId,
      display_name: comment.displayName,
      content: comment.content,
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('Failed to post comment')
  return data.id
}

export async function deleteCommunityComment(supabase: TypedClient, commentId: string): Promise<void> {
  const { error } = await supabase.from('community_comments').delete().eq('id', commentId)
  if (error) throw error
}

// ============================================================
// Notifications — "someone liked / commented on your post"
// Rows are inserted server-side by triggers (see migration 0008),
// so this layer only ever reads and marks-as-read.
// ============================================================

function rowToNotification(row: Database['public']['Tables']['notifications']['Row']): AppNotification {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorDisplayName: row.actor_display_name,
    type: row.type as AppNotification['type'],
    postId: row.post_id,
    commentId: row.comment_id ?? undefined,
    postTitle: row.post_title,
    commentPreview: row.comment_preview ?? undefined,
    isRead: row.is_read,
    createdAt: new Date(row.created_at ?? Date.now()),
  }
}

export async function getNotifications(
  supabase: TypedClient,
  userId: string,
  limit = 30
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data.map(rowToNotification)
}

export async function getUnreadNotificationCount(supabase: TypedClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)
  if (error) return 0
  return count ?? 0
}

export async function markNotificationRead(supabase: TypedClient, notificationId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId)
  if (error) throw error
}

export async function markAllNotificationsRead(supabase: TypedClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)
  if (error) throw error
}
