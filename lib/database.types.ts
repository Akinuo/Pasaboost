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
      community_comments: {
        Row: {
          content: string
          created_at: string | null
          display_name: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          display_name: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          display_name?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          comment_count: number
          created_at: string | null
          display_name: string
          essay: string
          exam_type: string
          id: string
          is_anonymous: boolean
          like_count: number
          prompt: string | null
          review_count: number
          review_dimensions: string[]
          review_requested: boolean
          score_id: string | null
          title: string
          total_score: number | null
          user_id: string
        }
        Insert: {
          comment_count?: number
          created_at?: string | null
          display_name: string
          essay: string
          exam_type?: string
          id?: string
          is_anonymous?: boolean
          like_count?: number
          prompt?: string | null
          review_count?: number
          review_dimensions?: string[]
          review_requested?: boolean
          score_id?: string | null
          title?: string
          total_score?: number | null
          user_id: string
        }
        Update: {
          comment_count?: number
          created_at?: string | null
          display_name?: string
          essay?: string
          exam_type?: string
          id?: string
          is_anonymous?: boolean
          like_count?: number
          prompt?: string | null
          review_count?: number
          review_dimensions?: string[]
          review_requested?: boolean
          score_id?: string | null
          title?: string
          total_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "scores"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reviews: {
        Row: {
          created_at: string | null
          dimension: string
          id: string
          post_id: string
          rating: number
          reviewer_display_name: string
          reviewer_id: string
          suggestion: string
          what_worked: string
        }
        Insert: {
          created_at?: string | null
          dimension: string
          id?: string
          post_id: string
          rating: number
          reviewer_display_name: string
          reviewer_id: string
          suggestion: string
          what_worked: string
        }
        Update: {
          created_at?: string | null
          dimension?: string
          id?: string
          post_id?: string
          rating?: number
          reviewer_display_name?: string
          reviewer_id?: string
          suggestion?: string
          what_worked?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reviews_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_qa_messages: {
        Row: {
          content: string
          created_at: string | null
          dimension: string | null
          id: string
          role: string
          score_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          dimension?: string | null
          id?: string
          role: string
          score_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          dimension?: string | null
          id?: string
          role?: string
          score_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_qa_messages_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "scores"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_display_name: string
          actor_id: string
          comment_id: string | null
          comment_preview: string | null
          created_at: string | null
          id: string
          is_read: boolean
          post_id: string | null
          post_title: string | null
          recipient_id: string
          review_dimension: string | null
          review_id: string | null
          review_preview: string | null
          group_id: string | null
          discussion_id: string | null
          reply_id: string | null
          discussion_title: string | null
          reply_preview: string | null
          type: string
        }
        Insert: {
          actor_display_name: string
          actor_id: string
          comment_id?: string | null
          comment_preview?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean
          post_id?: string | null
          post_title?: string | null
          recipient_id: string
          review_dimension?: string | null
          review_id?: string | null
          review_preview?: string | null
          group_id?: string | null
          discussion_id?: string | null
          reply_id?: string | null
          discussion_title?: string | null
          reply_preview?: string | null
          type: string
        }
        Update: {
          actor_display_name?: string
          actor_id?: string
          comment_id?: string | null
          comment_preview?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean
          post_id?: string | null
          post_title?: string | null
          recipient_id?: string
          review_dimension?: string | null
          review_id?: string | null
          review_preview?: string | null
          group_id?: string | null
          discussion_id?: string | null
          reply_id?: string | null
          discussion_title?: string | null
          reply_preview?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "post_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "group_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "group_discussion_replies"
            referencedColumns: ["id"]
          },
        ]
      }
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
          exam_mode_started_at: string | null
          exam_mode_time_limit_seconds: number | null
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
          exam_mode_started_at?: string | null
          exam_mode_time_limit_seconds?: number | null
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
          exam_mode_started_at?: string | null
          exam_mode_time_limit_seconds?: number | null
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
          exam_date: string | null
          exam_type: string | null
          id: string
          leaderboard_alias: string | null
          leaderboard_enabled: boolean | null
          photo_url: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email_notifications?: boolean | null
          exam_date?: string | null
          exam_type?: string | null
          id: string
          leaderboard_alias?: string | null
          leaderboard_enabled?: boolean | null
          photo_url?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email_notifications?: boolean | null
          exam_date?: string | null
          exam_type?: string | null
          id?: string
          leaderboard_alias?: string | null
          leaderboard_enabled?: boolean | null
          photo_url?: string | null
        }
        Relationships: []
      }
      ai_tool_usage: {
        Row: {
          id: string
          user_id: string
          tool: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          tool: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          tool?: string
          created_at?: string | null
        }
        Relationships: []
      }
      drill_attempts: {
        Row: {
          id: string
          user_id: string
          dimension: string
          exercise_prompt: string
          response: string
          word_count: number | null
          score: number
          feedback: string
          tip: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          dimension: string
          exercise_prompt: string
          response: string
          word_count?: number | null
          score: number
          feedback?: string
          tip?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          dimension?: string
          exercise_prompt?: string
          response?: string
          word_count?: number | null
          score?: number
          feedback?: string
          tip?: string | null
          created_at?: string | null
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
          exam_mode: boolean
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
          revised_from_score_id: string | null
          rubric_scores: Json
          strengths: Json | null
          suggestions: Json | null
          time_limit_seconds: number | null
          time_taken_seconds: number | null
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
          exam_mode?: boolean
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
          revised_from_score_id?: string | null
          rubric_scores: Json
          strengths?: Json | null
          suggestions?: Json | null
          time_limit_seconds?: number | null
          time_taken_seconds?: number | null
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
          exam_mode?: boolean
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
          revised_from_score_id?: string | null
          rubric_scores?: Json
          strengths?: Json | null
          suggestions?: Json | null
          time_limit_seconds?: number | null
          time_taken_seconds?: number | null
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
          {
            foreignKeyName: "scores_revised_from_score_id_fkey"
            columns: ["revised_from_score_id"]
            isOneToOne: false
            referencedRelation: "scores"
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
      study_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          invite_code: string
          created_by: string | null
          member_count: number
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          invite_code: string
          created_by?: string | null
          member_count?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          invite_code?: string
          created_by?: string | null
          member_count?: number
          created_at?: string | null
        }
        Relationships: []
      }
      study_group_members: {
        Row: {
          group_id: string
          user_id: string
          joined_at: string | null
        }
        Insert: {
          group_id: string
          user_id: string
          joined_at?: string | null
        }
        Update: {
          group_id?: string
          user_id?: string
          joined_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_discussions: {
        Row: {
          id: string
          group_id: string
          user_id: string
          display_name: string
          title: string
          body: string
          daily_prompt_id: string | null
          prompt_text: string | null
          reply_count: number
          created_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          display_name: string
          title: string
          body: string
          daily_prompt_id?: string | null
          prompt_text?: string | null
          reply_count?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          display_name?: string
          title?: string
          body?: string
          daily_prompt_id?: string | null
          prompt_text?: string | null
          reply_count?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_discussions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_discussions_daily_prompt_id_fkey"
            columns: ["daily_prompt_id"]
            isOneToOne: false
            referencedRelation: "daily_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_discussion_replies: {
        Row: {
          id: string
          discussion_id: string
          user_id: string
          display_name: string
          content: string
          created_at: string | null
        }
        Insert: {
          id?: string
          discussion_id: string
          user_id: string
          display_name: string
          content: string
          created_at?: string | null
        }
        Update: {
          id?: string
          discussion_id?: string
          user_id?: string
          display_name?: string
          content?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "group_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_study_group: {
        Args: { p_name: string; p_description?: string }
        Returns: Database['public']['Tables']['study_groups']['Row']
      }
      join_study_group_by_code: {
        Args: { p_invite_code: string }
        Returns: Database['public']['Tables']['study_groups']['Row']
      }
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
