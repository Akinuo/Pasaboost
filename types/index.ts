// ============================================================
// PasaBoost Application Types
// These are the "shaped for the UI" types — converted from the
// raw snake_case Supabase rows by the functions in lib/queries.ts
// ============================================================

export type ExamType = 'UPCAT' | 'ACET' | 'DCAT' | 'USTET' | 'General'

export type PromptCategory =
  | 'Social Issues'
  | 'Science & Technology'
  | 'Education'
  | 'Environment'
  | 'Culture & Identity'
  | 'Economics'
  | 'Health'
  | 'Government & Politics'

export interface UserProfile {
  id: string
  displayName: string | null
  photoUrl: string | null
  email: string | null
  leaderboardEnabled: boolean
  leaderboardAlias: string | null
  emailNotifications: boolean
}

export interface UserStats {
  userId: string
  totalEssays: number
  averageScore: number
  bestScore: number
  currentStreak: number
  longestStreak: number
  lastActivity: Date
  weeklyGoal: number
  thisWeekCount: number
  totalWords: number
}

export interface EssayDraft {
  id: string
  userId: string
  title: string
  content: string
  prompt?: string
  promptCategory?: PromptCategory
  examType: ExamType
  wordCount: number
  createdAt: Date
  updatedAt: Date
  isSubmitted: boolean
  scoreId?: string
  examModeStartedAt?: Date
  examModeTimeLimitSeconds?: number
}

export type ScoreDimension = 'Content' | 'Organization' | 'Grammar' | 'Coherence' | 'Argument'

export interface RubricScore {
  dimension: ScoreDimension
  score: number
  maxScore: 20
  feedback: string
  strengths: string[]
  weaknesses: string[]
}

export interface ParagraphRewrite {
  original: string
  rewritten: string
  explanation: string
  improvements: string[]
}

export type ScoreBand =
  | 'Excellent (90-100)'
  | 'Proficient (75-89)'
  | 'Developing (60-74)'
  | 'Beginning (45-59)'
  | 'Needs Improvement (<45)'

export interface EssayScore {
  id: string
  essayId?: string
  userId: string
  essay: string
  prompt?: string
  examType: ExamType
  totalScore: number
  rubricScores: RubricScore[]
  overallFeedback: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  paragraphRewrites: ParagraphRewrite[]
  estimatedBand: ScoreBand
  readabilityScore?: number
  vocabularyDiversity?: number
  createdAt: Date
  modelVersion?: string
  grammarIssues?: GrammarIssue[]
  aiDetection?: AIDetectionResult
  originality?: OriginalityResult
  aiPenaltyApplied?: number // points deducted from totalScore because aiDetection.likelihood >= 60
  preAIPenaltyScore?: number // the totalScore before the AI-likelihood deduction was applied
  examMode: boolean // whether this was written under Timed Exam Mode
  timeLimitSeconds?: number // the limit that was set for the attempt
  timeTakenSeconds?: number // how long the student actually took (capped at timeLimitSeconds)
}

export interface ScoreDataPoint {
  date: string
  totalScore: number
  content: number
  organization: number
  grammar: number
  coherence: number
  argument: number
  essayId: string
  examType: ExamType
}

export interface DimensionProgress {
  dimension: ScoreDimension
  firstScore: number
  latestScore: number
  improvement: number
  trend: 'up' | 'down' | 'stable'
}

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export interface WritingPrompt {
  id: string
  text: string
  category: PromptCategory
  examType: ExamType[]
  difficulty: Difficulty
  keywords: string[]
  tip?: string
  isDaily?: boolean
  date?: string
  // Which rubric dimension(s) this prompt is well-suited to exercise —
  // powers the "weakness-targeted practice" recommendations on the
  // Dashboard (see getPromptsForDimension in lib/prompts.ts).
  skillFocus?: ScoreDimension[]
}

export interface LeaderboardEntry {
  rank: number
  alias: string
  averageScore: number
  essayCount: number
  bestScore: number
  improvement: number
  examType?: ExamType
  badge?: string
}

export interface ScoreEssayResponse {
  success: boolean
  score?: Omit<EssayScore, 'id' | 'createdAt'>
  error?: string
  rateLimitRemaining?: number
}

// ============================================================
// Grammar highlighting
// ============================================================

export type GrammarIssueType = 'grammar' | 'spelling' | 'punctuation' | 'style'

export interface GrammarIssue {
  type: GrammarIssueType
  excerpt: string // verbatim snippet from the essay this issue refers to (used to locate + highlight it)
  issue: string // short description of what's wrong
  suggestion: string // how to fix it (human-readable explanation)
  replacement?: string // verbatim corrected text to substitute for `excerpt` — enables one-click "Apply Fix"
}

export interface GrammarCheckResponse {
  success: boolean
  issues?: GrammarIssue[]
  error?: string
}

// ============================================================
// AI-generated text detection
// ============================================================

export type AIDetectionVerdict = 'Likely Human-Written' | 'Mixed / Possibly AI-Assisted' | 'Likely AI-Generated'

export interface AIDetectionResult {
  likelihood: number // 0-100, higher = more likely AI-generated
  verdict: AIDetectionVerdict
  indicators: string[] // short bullet points explaining the signal (both directions)
  explanation: string
}

// ============================================================
// Originality / self-plagiarism check
// ============================================================

export interface OriginalityResult {
  score: number // 0-100, 100 = fully original vs. the student's own history
  flagged: boolean
  note: string
  matchedEssayId?: string
  matchedEssayTitle?: string
  similarityPercent?: number
}

export interface IntegrityCheckResponse {
  success: boolean
  aiDetection?: AIDetectionResult
  originality?: OriginalityResult
  error?: string
}

// ============================================================
// Outline / brainstorm assistant
// ============================================================

export interface OutlineSection {
  title: string
  points: string[]
}

export interface EssayOutline {
  thesisSuggestion: string
  sections: OutlineSection[]
  transitionTips: string[]
}

export interface OutlineResponse {
  success: boolean
  outline?: EssayOutline
  error?: string
}

export interface LoginFormValues {
  email: string
  password: string
}

export interface RegisterFormValues {
  displayName: string
  email: string
  password: string
  confirmPassword: string
  agreeToTerms: true
}
