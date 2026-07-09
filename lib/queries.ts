// ============================================================
// Supabase Query Layer
// All database reads/writes for PasaBoost, using Postgres via
// the Supabase client. Converts snake_case rows <-> camelCase
// app types so the rest of the app never sees raw DB shapes.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type {
  EssayDraft, EssayScore, UserStats, UserProfile,
  LeaderboardEntry, ScoreDataPoint, ExamType, RubricScore,
} from '@/types'

type TypedClient = SupabaseClient<Database>

// ============================================================
// Row → App type converters
// ============================================================

function rowToDraft(row: Database['public']['Tables']['drafts']['Row']): EssayDraft {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    prompt: row.prompt ?? undefined,
    promptCategory: (row.prompt_category as EssayDraft['promptCategory']) ?? undefined,
    examType: row.exam_type,
    wordCount: row.word_count,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    isSubmitted: row.is_submitted,
    scoreId: row.score_id ?? undefined,
  }
}

function rowToScore(row: Database['public']['Tables']['scores']['Row']): EssayScore {
  return {
    id: row.id,
    essayId: row.essay_id ?? undefined,
    userId: row.user_id,
    essay: row.essay,
    prompt: row.prompt ?? undefined,
    examType: row.exam_type,
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
    createdAt: new Date(row.created_at),
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
  }
}

function rowToStats(row: Database['public']['Tables']['user_stats']['Row']): UserStats {
  return {
    userId: row.user_id,
    totalEssays: row.total_essays,
    averageScore: row.average_score,
    bestScore: row.best_score,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastActivity: new Date(row.last_activity),
    weeklyGoal: row.weekly_goal,
    thisWeekCount: row.this_week_count,
    totalWords: row.total_words,
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
    leaderboardEnabled: data.leaderboard_enabled,
    leaderboardAlias: data.leaderboard_alias,
    emailNotifications: data.email_notifications,
  }
}

export async function updateProfile(
  supabase: TypedClient,
  userId: string,
  updates: Partial<{ displayName: string; leaderboardEnabled: boolean; emailNotifications: boolean }>
) {
  const { error } = await supabase
    .from('profiles')
    .update({
      ...(updates.displayName !== undefined && { display_name: updates.displayName }),
      ...(updates.leaderboardEnabled !== undefined && { leaderboard_enabled: updates.leaderboardEnabled }),
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
  let query = supabase
    .from('leaderboard')
    .select('*')
    .order('average_score', { ascending: false })
    .limit(topN)

  if (examType) {
    query = query.eq('exam_type', examType)
  }

  const { data, error } = await query
  if (error || !data) return []

  return data.map((row, idx) => ({
    rank: idx + 1,
    alias: row.alias,
    averageScore: row.average_score,
    essayCount: row.essay_count,
    bestScore: row.best_score,
    improvement: row.improvement,
    examType: row.exam_type as ExamType | undefined,
    badge: row.badge ?? undefined,
  }))
}

export async function upsertLeaderboardEntry(
  supabase: TypedClient,
  userId: string,
  entry: { alias: string; averageScore: number; essayCount: number; bestScore: number; improvement: number; examType?: ExamType }
): Promise<void> {
  const { error } = await supabase.from('leaderboard').upsert({
    user_id: userId,
    alias: entry.alias,
    average_score: entry.averageScore,
    essay_count: entry.essayCount,
    best_score: entry.bestScore,
    improvement: entry.improvement,
    exam_type: entry.examType,
    last_updated: new Date().toISOString(),
  })
  if (error) throw error
}

export async function removeLeaderboardEntry(supabase: TypedClient, userId: string): Promise<void> {
  const { error } = await supabase.from('leaderboard').delete().eq('user_id', userId)
  if (error) throw error
}
