export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      daily_prompts: {
        Row: {
          category: string
          created_at: string
          difficulty: string
          exam_type: string[]
          generated_date: string
          id: string
          keywords: string[]
          text: string
          tip: string | null
        }
        Insert: {
          category: string
          created_at?: string
          difficulty: string
          exam_type?: string[]
          generated_date?: string
          id?: string
          keywords?: string[]
          text: string
          tip?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          difficulty?: string
          exam_type?: string[]
          generated_date?: string
          id?: string
          keywords?: string[]
          text?: string
          tip?: string | null
        }
        Relationships: []
      }
      drafts: {
        Row: {
          content: string
          created_at: string | null
          exam_type: string
          id: string
          is_submitted: boolean | null
          prompt: string | null
          prompt_category: string | null
          score_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string
          word_count: number | null
        }
        Insert: {
          content?: string
          created_at?: string | null
          exam_type?: string
          id?: string
          is_submitted?: boolean | null
          prompt?: string | null
          prompt_category?: string | null
          score_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          word_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          exam_type?: string
          id?: string
          is_submitted?: boolean | null
          prompt?: string | null
          prompt_category?: string | null
          score_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          word_count?: number | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          alias: string
          average_score: number
          badge: string | null
          best_score: number
          essay_count: number
          exam_type: string
          improvement: number | null
          last_updated: string | null
          user_id: string
        }
        Insert: {
          alias: string
          average_score?: number
          badge?: string | null
          best_score?: number
          essay_count?: number
          exam_type?: string
          improvement?: number | null
          last_updated?: string | null
          user_id: string
        }
        Update: {
          alias?: string
          average_score?: number
          badge?: string | null
          best_score?: number
          essay_count?: number
          exam_type?: string
          improvement?: number | null
          last_updated?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email_notifications: boolean | null
          id: string
          leaderboard_alias: string | null
          leaderboard_enabled: boolean | null
          photo_url: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email_notifications?: boolean | null
          id: string
          leaderboard_alias?: string | null
          leaderboard_enabled?: boolean | null
          photo_url?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email_notifications?: boolean | null
          id?: string
          leaderboard_alias?: string | null
          leaderboard_enabled?: boolean | null
          photo_url?: string | null
        }
        Relationships: []
      }
      scores: {
        Row: {
          ai_explanation: string | null
          ai_indicators: Json | null
          ai_likelihood: number | null
          ai_verdict: string | null
          created_at: string | null
          essay: string
          essay_id: string | null
          estimated_band: string | null
          exam_type: string
          grammar_issues: Json | null
          id: string
          model_version: string | null
          originality_flagged: boolean | null
          originality_matched_essay_id: string | null
          originality_note: string | null
          originality_score: number | null
          originality_similarity_percent: number | null
          overall_feedback: string | null
          paragraph_rewrites: Json | null
          pre_ai_penalty_score: number | null
          ai_penalty_applied: number
          prompt: string | null
          readability_score: number | null
          rubric_scores: Json
          strengths: Json | null
          suggestions: Json | null
          total_score: number
          user_id: string
          vocabulary_diversity: number | null
          weaknesses: Json | null
        }
        Insert: {
          ai_explanation?: string | null
          ai_indicators?: Json | null
          ai_likelihood?: number | null
          ai_verdict?: string | null
          created_at?: string | null
          essay: string
          essay_id?: string | null
          estimated_band?: string | null
          exam_type: string
          grammar_issues?: Json | null
          id?: string
          model_version?: string | null
          originality_flagged?: boolean | null
          originality_matched_essay_id?: string | null
          originality_note?: string | null
          originality_score?: number | null
          originality_similarity_percent?: number | null
          overall_feedback?: string | null
          paragraph_rewrites?: Json | null
          pre_ai_penalty_score?: number | null
          ai_penalty_applied?: number
          prompt?: string | null
          readability_score?: number | null
          rubric_scores: Json
          strengths?: Json | null
          suggestions?: Json | null
          total_score: number
          user_id: string
          vocabulary_diversity?: number | null
          weaknesses?: Json | null
        }
        Update: {
          ai_explanation?: string | null
          ai_indicators?: Json | null
          ai_likelihood?: number | null
          ai_verdict?: string | null
          created_at?: string | null
          essay?: string
          essay_id?: string | null
          estimated_band?: string | null
          exam_type?: string
          grammar_issues?: Json | null
          id?: string
          model_version?: string | null
          originality_flagged?: boolean | null
          originality_matched_essay_id?: string | null
          originality_note?: string | null
          originality_score?: number | null
          originality_similarity_percent?: number | null
          overall_feedback?: string | null
          paragraph_rewrites?: Json | null
          pre_ai_penalty_score?: number | null
          ai_penalty_applied?: number
          prompt?: string | null
          readability_score?: number | null
          rubric_scores?: Json
          strengths?: Json | null
          suggestions?: Json | null
          total_score?: number
          user_id?: string
          vocabulary_diversity?: number | null
          weaknesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_originality_matched_essay_id_fkey"
            columns: ["originality_matched_essay_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          average_score: number | null
          best_score: number | null
          current_streak: number | null
          last_activity: string | null
          longest_streak: number | null
          this_week_count: number | null
          total_essays: number | null
          total_words: number | null
          user_id: string
          weekly_goal: number | null
        }
        Insert: {
          average_score?: number | null
          best_score?: number | null
          current_streak?: number | null
          last_activity?: string | null
          longest_streak?: number | null
          this_week_count?: number | null
          total_essays?: number | null
          total_words?: number | null
          user_id: string
          weekly_goal?: number | null
        }
        Update: {
          average_score?: number | null
          best_score?: number | null
          current_streak?: number | null
          last_activity?: string | null
          longest_streak?: number | null
          this_week_count?: number | null
          total_essays?: number | null
          total_words?: number | null
          user_id?: string
          weekly_goal?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
