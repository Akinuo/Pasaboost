import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ScoreBand, ScoreDimension, Difficulty } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// Score utilities
// ============================================================

export function getScoreBand(score: number): ScoreBand {
  if (score >= 90) return 'Excellent (90-100)'
  if (score >= 75) return 'Proficient (75-89)'
  if (score >= 60) return 'Developing (60-74)'
  if (score >= 45) return 'Beginning (45-59)'
  return 'Needs Improvement (<45)'
}

export function getScoreColor(score: number): string {
  if (score >= 85) return 'score-excellent'
  if (score >= 70) return 'score-good'
  if (score >= 55) return 'score-average'
  return 'score-poor'
}

export function getScoreBgColor(score: number): string {
  if (score >= 85) return 'score-band-excellent'
  if (score >= 70) return 'score-band-good'
  if (score >= 55) return 'score-band-average'
  return 'score-band-poor'
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Proficient'
  if (score >= 60) return 'Developing'
  if (score >= 45) return 'Beginning'
  return 'Needs Improvement'
}

// ============================================================
// AI-detection score penalty
// If the AI-generated-text checker estimates a likelihood of
// 60% or higher, the essay's total score takes a deduction —
// tiered so more clearly AI-flagged essays lose more points.
// Returns 0 when likelihood is below the 60 threshold.
// ============================================================

export function getAIPenalty(likelihood: number | null | undefined): number {
  if (likelihood == null) return 0
  if (likelihood >= 90) return 40
  if (likelihood >= 80) return 30
  if (likelihood >= 70) return 20
  if (likelihood >= 60) return 10
  return 0
}

export function getDimensionColor(dimension: ScoreDimension): string {
  const colors: Record<ScoreDimension, string> = {
    Content: 'hsl(var(--chart-1))',
    Organization: 'hsl(var(--chart-2))',
    Grammar: 'hsl(var(--chart-3))',
    Coherence: 'hsl(var(--chart-4))',
    Argument: 'hsl(var(--chart-5))',
  }
  return colors[dimension]
}

export const DIMENSION_DESCRIPTIONS: Record<ScoreDimension, string> = {
  Content: 'how well you develop ideas with specific, relevant evidence',
  Organization: 'how clearly your essay is structured from intro to conclusion',
  Grammar: 'sentence-level correctness — tenses, agreement, and mechanics',
  Coherence: 'how smoothly your ideas connect from sentence to sentence',
  Argument: 'how convincingly you state and support your thesis',
}

// ============================================================
// Weakness detection
// Averages each rubric dimension across a set of scores (e.g. a
// student's recent essays) and returns whichever one is lowest —
// used to power "weakness-targeted practice" recommendations.
// Requires at least `minSamples` scores so the insight isn't drawn
// from a single essay's noise.
// ============================================================

export interface WeakestDimensionResult {
  dimension: ScoreDimension
  averageScore: number // out of 20
  sampleSize: number
}

export function getWeakestDimension(
  scores: Array<{ rubricScores: { dimension: ScoreDimension; score: number }[] }>,
  minSamples = 3
): WeakestDimensionResult | null {
  if (scores.length < minSamples) return null

  const totals = new Map<ScoreDimension, { sum: number; count: number }>()
  for (const s of scores) {
    for (const r of s.rubricScores) {
      const entry = totals.get(r.dimension) ?? { sum: 0, count: 0 }
      entry.sum += r.score
      entry.count += 1
      totals.set(r.dimension, entry)
    }
  }

  let weakest: WeakestDimensionResult | null = null
  for (const [dimension, { sum, count }] of totals) {
    if (count === 0) continue
    const averageScore = sum / count
    if (!weakest || averageScore < weakest.averageScore) {
      weakest = { dimension, averageScore, sampleSize: count }
    }
  }
  return weakest
}

// ============================================================
// Text utilities
// ============================================================

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function calculateVocabularyDiversity(text: string): number {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || []
  if (words.length === 0) return 0
  const unique = new Set(words)
  return Math.round((unique.size / words.length) * 100)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

// ============================================================
// Date utilities
// ============================================================

export function formatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function getRelativeTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  const diffMs = Date.now() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(d)
}

// ============================================================
// Exam metadata
// ============================================================

export const EXAM_DESCRIPTIONS: Record<string, string> = {
  UPCAT: 'University of the Philippines College Admission Test',
  ACET: 'Ateneo College Entrance Test',
  DCAT: 'De La Salle College Admission Test',
  USTET: 'University of Santo Tomas Entrance Test',
  General: 'General College Entrance Examination',
}

export const EXAM_COLORS: Record<string, string> = {
  UPCAT: 'bg-[hsl(var(--chart-1)/0.12)] text-[hsl(var(--chart-1))]',
  ACET: 'bg-[hsl(var(--chart-2)/0.12)] text-[hsl(var(--chart-2))]',
  DCAT: 'bg-[hsl(var(--chart-3)/0.12)] text-[hsl(var(--chart-3))]',
  USTET: 'bg-[hsl(var(--chart-4)/0.14)] text-[hsl(var(--chart-4))]',
  General: 'bg-[hsl(var(--chart-5)/0.14)] text-[hsl(var(--chart-5))]',
}

// ============================================================
// Timed Exam Mode
//
// IMPORTANT: these are NOT official published time limits. Philippine
// college-entrance exams don't consistently publish per-section essay
// timing, and reported times vary by year, testing center, and
// whether an essay portion is even included that year. These are
// reasonable starting points based on commonly reported ranges from
// past examinees — students should adjust to match whatever their
// own school or review center has told them, which is why the value
// is always editable before starting a timed attempt.
// ============================================================

export const SUGGESTED_EXAM_TIME_MINUTES: Record<string, number> = {
  UPCAT: 20,
  ACET: 30,
  DCAT: 30,
  USTET: 30,
  General: 30,
}

export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${mm}:${ss.toString().padStart(2, '0')}`
}

// ============================================================
// Difficulty-level colors — green/yellow/red, from easiest to hardest
// ============================================================

export const LEVEL_COLORS: Record<Difficulty, string> = {
  Beginner: 'bg-[hsl(var(--level-beginner)/0.12)] text-[hsl(var(--level-beginner))]',
  Intermediate: 'bg-[hsl(var(--level-intermediate)/0.14)] text-[hsl(var(--level-intermediate))]',
  Advanced: 'bg-[hsl(var(--level-advanced)/0.14)] text-[hsl(var(--level-advanced))]',
}

// ============================================================
// Debounce
// ============================================================

export function debounce<T extends (...args: any[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// ============================================================
// Random alias generator (for the anonymous leaderboard)
// ============================================================

const ALIAS_ADJECTIVES = ['Blue', 'Swift', 'Bright', 'Sharp', 'Bold', 'Quiet', 'Rising', 'Clever']
const ALIAS_NOUNS = ['Scholar', 'Writer', 'Scribe', 'Thinker', 'Wordsmith', 'Essayist', 'Author']

export function generateLeaderboardAlias(): string {
  const adj = ALIAS_ADJECTIVES[Math.floor(Math.random() * ALIAS_ADJECTIVES.length)]
  const noun = ALIAS_NOUNS[Math.floor(Math.random() * ALIAS_NOUNS.length)]
  const num = Math.floor(Math.random() * 900) + 100
  return `${adj}${noun}_${num}`
}

// ============================================================
// Leaderboard aggregation — shared between the client-side
// opt-in/score-submit flow (lib/queries.ts) and the server-side
// refresh-leaderboard cron route, so both compute rankings exactly
// the same way and one "Overall" + one row per exam type always
// stay in sync with each other.
// ============================================================

export const OVERALL_LEADERBOARD_KEY = 'Overall'

export interface LeaderboardRowInput {
  user_id: string
  alias: string
  exam_type: string
  average_score: number
  essay_count: number
  best_score: number
  improvement: number
  badge?: string
}

// Recent-half vs. earlier-half average, so "improvement" reflects a
// genuine trend rather than a single lucky (or unlucky) essay.
export function computeImprovement(totalsOldestFirst: number[]): number {
  if (totalsOldestFirst.length < 2) return 0
  const recentCount = Math.max(1, Math.min(3, Math.floor(totalsOldestFirst.length / 2)))
  const recent = totalsOldestFirst.slice(-recentCount)
  const earlier = totalsOldestFirst.slice(0, totalsOldestFirst.length - recentCount)
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
  return Math.round(avg(recent) - avg(earlier))
}

// ============================================================
// Achievement badges
// A single badge label per leaderboard row (Overall + one per exam
// type), assigned by priority so the most impressive thing a student
// has earned is what shows. "Most Improved This Week" isn't decided
// here — it's comparative across students, so refresh-leaderboard
// overrides the winner's badge for each exam-type bucket after all
// rows in a batch have been computed (see BADGE_LABELS.mostImproved).
// ============================================================

export const BADGE_LABELS = {
  streak30: '🔥 30-Day Streak',
  streak7: '🔥 7-Day Streak',
  first90: '⭐ First 90+',
  bigImprover: '📈 Big Improver',
  mostImproved: '🏆 Most Improved This Week',
} as const

function computeBadge(bestScore: number, improvement: number, currentStreak?: number): string | undefined {
  if (currentStreak != null && currentStreak >= 30) return BADGE_LABELS.streak30
  if (currentStreak != null && currentStreak >= 7) return BADGE_LABELS.streak7
  if (bestScore >= 90) return BADGE_LABELS.first90
  if (improvement >= 10) return BADGE_LABELS.bigImprover
  return undefined
}

function aggregateOne(
  userId: string,
  alias: string,
  examType: string,
  totalsOldestFirst: number[],
  currentStreak?: number
): LeaderboardRowInput {
  const essayCount = totalsOldestFirst.length
  const bestScore = essayCount ? Math.max(...totalsOldestFirst) : 0
  const improvement = computeImprovement(totalsOldestFirst)
  return {
    user_id: userId,
    alias,
    exam_type: examType,
    average_score: essayCount ? Math.round(totalsOldestFirst.reduce((s, v) => s + v, 0) / essayCount) : 0,
    essay_count: essayCount,
    best_score: bestScore,
    improvement,
    badge: essayCount ? computeBadge(bestScore, improvement, currentStreak) : undefined,
  }
}

// Builds one "Overall" row plus one row per exam type the student has
// at least one score for. `scoresOldestFirst` must be sorted oldest
// first so improvement can compare early vs. recent attempts correctly.
// `currentStreak` (from user_stats) feeds the streak badges — optional
// since not every caller has it handy.
export function computeLeaderboardRows(
  userId: string,
  alias: string,
  scoresOldestFirst: Array<{ totalScore: number; examType: string }>,
  currentStreak?: number
): LeaderboardRowInput[] {
  const overall = aggregateOne(userId, alias, OVERALL_LEADERBOARD_KEY, scoresOldestFirst.map((s) => s.totalScore), currentStreak)

  const byExam = new Map<string, number[]>()
  for (const s of scoresOldestFirst) {
    const list = byExam.get(s.examType) ?? []
    list.push(s.totalScore)
    byExam.set(s.examType, list)
  }

  const perExam = Array.from(byExam.entries()).map(([examType, totals]) => aggregateOne(userId, alias, examType, totals, currentStreak))

  return [overall, ...perExam]
}

// ============================================================
// Leaderboard alias validation — format + a light profanity filter.
// This is the client-side copy for instant feedback; the same rules
// are enforced again server-side by a Postgres trigger (see
// supabase/migrations/0005_leaderboard_upgrades.sql) so they can't be
// bypassed by calling the API directly. Deliberately a light,
// common-sense list — not a claim of bulletproof moderation.
// ============================================================

const ALIAS_FORMAT = /^[A-Za-z0-9_]{3,30}$/

const ALIAS_BLOCKED_SUBSTRINGS = [
  // English
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy',
  'nigger', 'nigga', 'faggot', 'retard', 'whore', 'slut', 'rape',
  // Tagalog / Filipino
  'putangina', 'putanginamo', 'gago', 'gaga', 'tangina', 'tarantado',
  'ulol', 'bobo', 'inutil', 'leche', 'pakshet', 'peste', 'kupal',
  'hayop', 'punyeta', 'buwisit',
]

export function validateLeaderboardAlias(raw: string): { valid: boolean; error?: string } {
  const alias = raw.trim()

  if (!ALIAS_FORMAT.test(alias)) {
    return { valid: false, error: 'Use 3-30 letters, numbers, or underscores — no spaces or symbols.' }
  }

  const normalized = alias.toLowerCase()
  if (ALIAS_BLOCKED_SUBSTRINGS.some((word) => normalized.includes(word))) {
    return { valid: false, error: "That username isn't allowed. Please choose another." }
  }

  return { valid: true }
}
