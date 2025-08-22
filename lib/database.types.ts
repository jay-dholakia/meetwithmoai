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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      intake_responses_v2: {
        Row: {
          user_id: string
          // Part A: Interests & Activities (10)
          activities_enjoyed: string[] | null
          top_3_activities: string[] | null
          active_outdoor_frequency: number | null
          indoor_hangs_frequency: number | null
          try_new_activities: number | null
          competitive_activities: number | null
          sports_teams: string | null
          music_preferences: string[] | null
          alcohol_preference: string | null
          kid_friendly_preference: string | null
          // Part B: Social Style & Reliability (10)
          energy_from_people: number | null
          prefer_one_on_one: number | null
          comfortable_joining_solo: number | null
          like_structured_plans: number | null
          enjoy_spontaneous: number | null
          conversation_flow: number | null
          playful_banter: number | null
          reliable_plans: number | null
          value_balance_talking: number | null
          prefer_deep_friendships: number | null
          // Part C: Work, Life & Anchors (5)
          work_study: string | null
          industry: string | null
          life_stage: string | null
          local_status: string | null
          hometown: string | null
          // Part D: Communication & Boundaries (5)
          favorite_planning_method: string | null
          reply_speed: string | null
          preferred_meeting_times: string[] | null
          travel_distance: string | null
          avoid_topics: string[] | null
          // Part E: Creative Open-Ended (5)
          current_media: string | null
          free_saturday: string | null
          day_brightener: string | null
          three_words_description: string | null
          new_to_try: string | null
          // Metadata
          embed_vector: number[] | null
          completed_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: string
          activities_enjoyed?: string[] | null
          top_3_activities?: string[] | null
          active_outdoor_frequency?: number | null
          indoor_hangs_frequency?: number | null
          try_new_activities?: number | null
          competitive_activities?: number | null
          sports_teams?: string | null
          music_preferences?: string[] | null
          alcohol_preference?: string | null
          kid_friendly_preference?: string | null
          energy_from_people?: number | null
          prefer_one_on_one?: number | null
          comfortable_joining_solo?: number | null
          like_structured_plans?: number | null
          enjoy_spontaneous?: number | null
          conversation_flow?: number | null
          playful_banter?: number | null
          reliable_plans?: number | null
          value_balance_talking?: number | null
          prefer_deep_friendships?: number | null
          work_study?: string | null
          industry?: string | null
          life_stage?: string | null
          local_status?: string | null
          hometown?: string | null
          favorite_planning_method?: string | null
          reply_speed?: string | null
          preferred_meeting_times?: string[] | null
          travel_distance?: string | null
          avoid_topics?: string[] | null
          current_media?: string | null
          free_saturday?: string | null
          day_brightener?: string | null
          three_words_description?: string | null
          new_to_try?: string | null
          embed_vector?: number[] | null
          completed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          activities_enjoyed?: string[] | null
          top_3_activities?: string[] | null
          active_outdoor_frequency?: number | null
          indoor_hangs_frequency?: number | null
          try_new_activities?: number | null
          competitive_activities?: number | null
          sports_teams?: string | null
          music_preferences?: string[] | null
          alcohol_preference?: string | null
          kid_friendly_preference?: string | null
          energy_from_people?: number | null
          prefer_one_on_one?: number | null
          comfortable_joining_solo?: number | null
          like_structured_plans?: number | null
          enjoy_spontaneous?: number | null
          conversation_flow?: number | null
          playful_banter?: number | null
          reliable_plans?: number | null
          value_balance_talking?: number | null
          prefer_deep_friendships?: number | null
          work_study?: string | null
          industry?: string | null
          life_stage?: string | null
          local_status?: string | null
          hometown?: string | null
          favorite_planning_method?: string | null
          reply_speed?: string | null
          preferred_meeting_times?: string[] | null
          travel_distance?: string | null
          avoid_topics?: string[] | null
          current_media?: string | null
          free_saturday?: string | null
          day_brightener?: string | null
          three_words_description?: string | null
          new_to_try?: string | null
          embed_vector?: number[] | null
          completed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_responses_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          meeting_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string
          host_id: string | null
          id: string
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time: string
          host_id?: string | null
          id?: string
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string
          host_id?: string | null
          id?: string
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
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
  public: {
    Enums: {},
  },
} as const


