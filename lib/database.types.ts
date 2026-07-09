// ============================================================
// STUB Supabase database types.
//
// This file was empty and broke the TypeScript build (imported
// as `import type { Database } from '@/lib/database.types'` in
// multiple places but had no exports).
//
// This is a hand-written stub inferred from actual usage in
// lib/queries.ts, NOT the real generated schema. Replace it with
// the real thing as soon as possible by running:
//
//   npm run db:types
//
// (requires SUPABASE_PROJECT_ID env var + `supabase login`)
// ============================================================

import type { ExamType } from '@/types'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type ProfilesRow = {
  id: string
  display_name: string
  photo_url: string | null
  leaderboard_enabled: boolean
  leaderboard_alias: string | null
  email_notifications: boolean
}

type DraftsRow = {
  id: string
  user_id: string
  title: string
  content: string
  prompt: string | null
  prompt_category: string | null
  exam_type: ExamType
  word_count: number
  created_at: string
  updated_at: string
  is_submitted: boolean
  score_id: string | null
}

type ScoresRow = {
  id: string
  essay_id: string | null
  user_id: string
  essay: string
  prompt: string | null
  exam_type: ExamType
  total_score: number
  rubric_scores: Json
  overall_feedback: string | null
  strengths: Json | null
  weaknesses: Json | null
  suggestions: Json | null
  paragraph_rewrites: Json | null
  estimated_band: string | null
  readability_score: number | null
  vocabulary_diversity: number | null
  created_at: string
  model_version: string | null
  grammar_issues: Json | null
  ai_likelihood: number | null
  ai_verdict: string | null
  ai_indicators: Json | null
  ai_explanation: string | null
  originality_score: number | null
  originality_flagged: boolean | null
  originality_note: string | null
  originality_matched_essay_id: string | null
  originality_similarity_percent: number | null
}

type UserStatsRow = {
  user_id: string
  total_essays: number
  average_score: number
  best_score: number
  current_streak: number
  longest_streak: number
  last_activity: string
  weekly_goal: number
  this_week_count: number
  total_words: number
}

type LeaderboardRow = {
  user_id: string
  alias: string
  average_score: number
  essay_count: number
  best_score: number
  improvement: number
  exam_type: string | null
  badge: string | null
  last_updated: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow
        Insert: Partial<ProfilesRow> & { id: string }
        Update: Partial<ProfilesRow>
        Relationships: []
      }
      drafts: {
        Row: DraftsRow
        Insert: Partial<DraftsRow> & {
          user_id: string
          title: string
          content: string
          exam_type: ExamType
          word_count: number
        }
        Update: Partial<DraftsRow>
        Relationships: []
      }
      scores: {
        Row: ScoresRow
        Insert: Partial<ScoresRow> & {
          user_id: string
          essay: string
          exam_type: ExamType
          total_score: number
        }
        Update: Partial<ScoresRow>
        Relationships: []
      }
      user_stats: {
        Row: UserStatsRow
        Insert: Partial<UserStatsRow> & { user_id: string }
        Update: Partial<UserStatsRow>
        Relationships: []
      }
      leaderboard: {
        Row: LeaderboardRow
        Insert: Partial<LeaderboardRow> & { user_id: string; alias: string }
        Update: Partial<LeaderboardRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
