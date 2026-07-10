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
