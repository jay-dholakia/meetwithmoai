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
      ai_chat_history: {
        Row: {
          created_at: string | null
          id: string
          message_data: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_data: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_data?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string | null
          blocker_id: string | null
          created_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id?: string | null
          blocker_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string | null
          blocker_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          candidate_id: string | null
          created_at: string | null
          id: string
          response: boolean
          user_id: string | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          response: boolean
          user_id?: string | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          response?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "match_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_present: boolean | null
          created_at: string | null
          id: string
          last_activity_at: string | null
          opened_at: string | null
          status: string | null
          user_a: string | null
          user_b: string | null
        }
        Insert: {
          ai_present?: boolean | null
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          opened_at?: string | null
          status?: string | null
          user_a?: string | null
          user_b?: string | null
        }
        Update: {
          ai_present?: boolean | null
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          opened_at?: string | null
          status?: string | null
          user_a?: string | null
          user_b?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_responses: {
        Row: {
          activities_enjoyed: string[] | null
          books_podcasts: string[] | null
          challenge_overcome: string | null
          created_at: string | null
          creative_hobbies: string[] | null
          current_life_stage: string | null
          current_song_show_podcast: string | null
          drink_alcohol: string | null
          enjoy_competitive_activities: string | null
          enjoy_cooking_hosting: string | null
          enjoy_trying_new_activities: string | null
          favorite_restaurant: string | null
          first_meet_ideas: string[] | null
          free_saturday_activity: string | null
          friends_describe_three_words: string | null
          going_out_vs_quiet: string | null
          good_communicator: string | null
          grew_up_here_or_moved: string | null
          hangout_preference: string | null
          hometown_region: string | null
          id: string
          industries: string[] | null
          introvert_extrovert_scale: string | null
          listener_or_talker: string | null
          looking_for_in_friend: string | null
          morning_motivation: string | null
          movies_shows: string[] | null
          music_genres: string[] | null
          new_to_try_with_friends: string | null
          planner_organized: string | null
          preferred_meetup_times: string[] | null
          proud_of_lately: string | null
          punctual_person: string | null
          reliable_friend: string | null
          role_model_and_why: string | null
          small_things_better_day: string | null
          spontaneous_adventurous: string | null
          sports_teams: string | null
          time_in_city: string | null
          travel_distance: string | null
          updated_at: string | null
          user_id: string | null
          work_study: string | null
        }
        Insert: {
          activities_enjoyed?: string[] | null
          books_podcasts?: string[] | null
          challenge_overcome?: string | null
          created_at?: string | null
          creative_hobbies?: string[] | null
          current_life_stage?: string | null
          current_song_show_podcast?: string | null
          drink_alcohol?: string | null
          enjoy_competitive_activities?: string | null
          enjoy_cooking_hosting?: string | null
          enjoy_trying_new_activities?: string | null
          favorite_restaurant?: string | null
          first_meet_ideas?: string[] | null
          free_saturday_activity?: string | null
          friends_describe_three_words?: string | null
          going_out_vs_quiet?: string | null
          good_communicator?: string | null
          grew_up_here_or_moved?: string | null
          hangout_preference?: string | null
          hometown_region?: string | null
          id?: string
          industries?: string[] | null
          introvert_extrovert_scale?: string | null
          listener_or_talker?: string | null
          looking_for_in_friend?: string | null
          morning_motivation?: string | null
          movies_shows?: string[] | null
          music_genres?: string[] | null
          new_to_try_with_friends?: string | null
          planner_organized?: string | null
          preferred_meetup_times?: string[] | null
          proud_of_lately?: string | null
          punctual_person?: string | null
          reliable_friend?: string | null
          role_model_and_why?: string | null
          small_things_better_day?: string | null
          spontaneous_adventurous?: string | null
          sports_teams?: string | null
          time_in_city?: string | null
          travel_distance?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_study?: string | null
        }
        Update: {
          activities_enjoyed?: string[] | null
          books_podcasts?: string[] | null
          challenge_overcome?: string | null
          created_at?: string | null
          creative_hobbies?: string[] | null
          current_life_stage?: string | null
          current_song_show_podcast?: string | null
          drink_alcohol?: string | null
          enjoy_competitive_activities?: string | null
          enjoy_cooking_hosting?: string | null
          enjoy_trying_new_activities?: string | null
          favorite_restaurant?: string | null
          first_meet_ideas?: string[] | null
          free_saturday_activity?: string | null
          friends_describe_three_words?: string | null
          going_out_vs_quiet?: string | null
          good_communicator?: string | null
          grew_up_here_or_moved?: string | null
          hangout_preference?: string | null
          hometown_region?: string | null
          id?: string
          industries?: string[] | null
          introvert_extrovert_scale?: string | null
          listener_or_talker?: string | null
          looking_for_in_friend?: string | null
          morning_motivation?: string | null
          movies_shows?: string[] | null
          music_genres?: string[] | null
          new_to_try_with_friends?: string | null
          planner_organized?: string | null
          preferred_meetup_times?: string[] | null
          proud_of_lately?: string | null
          punctual_person?: string | null
          reliable_friend?: string | null
          role_model_and_why?: string | null
          small_things_better_day?: string | null
          spontaneous_adventurous?: string | null
          sports_teams?: string | null
          time_in_city?: string | null
          travel_distance?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_study?: string | null
        }
        Relationships: []
      }
      intake_responses_v2: {
        Row: {
          active_outdoor_frequency: number | null
          activities_enjoyed: string[] | null
          alcohol_preference: string | null
          avoid_topics: string[] | null
          comfortable_joining_solo: number | null
          competitive_activities: number | null
          completed_at: string | null
          conversation_flow: number | null
          current_media: string | null
          day_brightener: string | null
          embed_vector: string | null
          energy_from_people: number | null
          enjoy_spontaneous: number | null
          favorite_planning_method: string | null
          free_saturday: string | null
          hometown: string | null
          indoor_hangs_frequency: number | null
          industry: string | null
          kid_friendly_preference: string | null
          life_stage: string | null
          like_structured_plans: number | null
          local_status: string | null
          music_preferences: string[] | null
          new_to_try: string | null
          playful_banter: number | null
          prefer_deep_friendships: number | null
          prefer_one_on_one: number | null
          preferred_meeting_times: string[] | null
          reliable_plans: number | null
          reply_speed: string | null
          sports_teams: string | null
          three_words_description: string | null
          top_3_activities: string[] | null
          travel_distance: string | null
          try_new_activities: number | null
          updated_at: string | null
          user_id: string
          value_balance_talking: number | null
          work_study: string | null
        }
        Insert: {
          active_outdoor_frequency?: number | null
          activities_enjoyed?: string[] | null
          alcohol_preference?: string | null
          avoid_topics?: string[] | null
          comfortable_joining_solo?: number | null
          competitive_activities?: number | null
          completed_at?: string | null
          conversation_flow?: number | null
          current_media?: string | null
          day_brightener?: string | null
          embed_vector?: string | null
          energy_from_people?: number | null
          enjoy_spontaneous?: number | null
          favorite_planning_method?: string | null
          free_saturday?: string | null
          hometown?: string | null
          indoor_hangs_frequency?: number | null
          industry?: string | null
          kid_friendly_preference?: string | null
          life_stage?: string | null
          like_structured_plans?: number | null
          local_status?: string | null
          music_preferences?: string[] | null
          new_to_try?: string | null
          playful_banter?: number | null
          prefer_deep_friendships?: number | null
          prefer_one_on_one?: number | null
          preferred_meeting_times?: string[] | null
          reliable_plans?: number | null
          reply_speed?: string | null
          sports_teams?: string | null
          three_words_description?: string | null
          top_3_activities?: string[] | null
          travel_distance?: string | null
          try_new_activities?: number | null
          updated_at?: string | null
          user_id: string
          value_balance_talking?: number | null
          work_study?: string | null
        }
        Update: {
          active_outdoor_frequency?: number | null
          activities_enjoyed?: string[] | null
          alcohol_preference?: string | null
          avoid_topics?: string[] | null
          comfortable_joining_solo?: number | null
          competitive_activities?: number | null
          completed_at?: string | null
          conversation_flow?: number | null
          current_media?: string | null
          day_brightener?: string | null
          embed_vector?: string | null
          energy_from_people?: number | null
          enjoy_spontaneous?: number | null
          favorite_planning_method?: string | null
          free_saturday?: string | null
          hometown?: string | null
          indoor_hangs_frequency?: number | null
          industry?: string | null
          kid_friendly_preference?: string | null
          life_stage?: string | null
          like_structured_plans?: number | null
          local_status?: string | null
          music_preferences?: string[] | null
          new_to_try?: string | null
          playful_banter?: number | null
          prefer_deep_friendships?: number | null
          prefer_one_on_one?: number | null
          preferred_meeting_times?: string[] | null
          reliable_plans?: number | null
          reply_speed?: string | null
          sports_teams?: string | null
          three_words_description?: string | null
          top_3_activities?: string[] | null
          travel_distance?: string | null
          try_new_activities?: number | null
          updated_at?: string | null
          user_id?: string
          value_balance_talking?: number | null
          work_study?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_responses_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_responses_v3: {
        Row: {
          active_friends_preference: string | null
          age_range_preference: string | null
          availability_times: string[] | null
          big_picture_discussions: string | null
          book_types: string[] | null
          budget_consciousness: string | null
          coffee_or_tea: string | null
          communication_preference: string | null
          completed_at: string | null
          cultural_activities: string[] | null
          deep_conversation_frequency: string | null
          default_hangout: string | null
          embed_vector: string | null
          enjoys_cooking: string | null
          enjoys_reading: string | null
          favorite_cuisines: string[] | null
          friend_type: string | null
          friend_types_seeking: string[] | null
          friendship_commitment: string | null
          friendship_pace: string | null
          fun_activities: string[] | null
          gaming_types: string[] | null
          hangout_frequency: string | null
          has_kids: string | null
          holiday_preference: string | null
          honesty_approach: string | null
          important_issues: string[] | null
          is_gamer: string | null
          lazy_sunday: string | null
          live_music_frequency: string | null
          music_genres: string[] | null
          networking_vs_friendship: string | null
          news_engagement: string | null
          nyt_games: string[] | null
          partnered_friend_preference: string | null
          personality_type: string | null
          plays_nyt_games: string | null
          podcast_types: string[] | null
          political_alignment_importance: string | null
          recharge_method: string | null
          routine_vs_flexible: string | null
          sense_of_humor: string | null
          shared_vs_different: string | null
          single_friend_preference: string | null
          social_activity_level: string | null
          social_media_usage: string | null
          social_setting: string | null
          sports_fitness: string[] | null
          time_commitment: string | null
          travel_with_friends: string | null
          trying_restaurants: string | null
          updated_at: string | null
          user_id: string
          values_importance: string | null
          watching_with_friends: string | null
          weekend_preference: string | null
          worldview_preference: string | null
        }
        Insert: {
          active_friends_preference?: string | null
          age_range_preference?: string | null
          availability_times?: string[] | null
          big_picture_discussions?: string | null
          book_types?: string[] | null
          budget_consciousness?: string | null
          coffee_or_tea?: string | null
          communication_preference?: string | null
          completed_at?: string | null
          cultural_activities?: string[] | null
          deep_conversation_frequency?: string | null
          default_hangout?: string | null
          embed_vector?: string | null
          enjoys_cooking?: string | null
          enjoys_reading?: string | null
          favorite_cuisines?: string[] | null
          friend_type?: string | null
          friend_types_seeking?: string[] | null
          friendship_commitment?: string | null
          friendship_pace?: string | null
          fun_activities?: string[] | null
          gaming_types?: string[] | null
          hangout_frequency?: string | null
          has_kids?: string | null
          holiday_preference?: string | null
          honesty_approach?: string | null
          important_issues?: string[] | null
          is_gamer?: string | null
          lazy_sunday?: string | null
          live_music_frequency?: string | null
          music_genres?: string[] | null
          networking_vs_friendship?: string | null
          news_engagement?: string | null
          nyt_games?: string[] | null
          partnered_friend_preference?: string | null
          personality_type?: string | null
          plays_nyt_games?: string | null
          podcast_types?: string[] | null
          political_alignment_importance?: string | null
          recharge_method?: string | null
          routine_vs_flexible?: string | null
          sense_of_humor?: string | null
          shared_vs_different?: string | null
          single_friend_preference?: string | null
          social_activity_level?: string | null
          social_media_usage?: string | null
          social_setting?: string | null
          sports_fitness?: string[] | null
          time_commitment?: string | null
          travel_with_friends?: string | null
          trying_restaurants?: string | null
          updated_at?: string | null
          user_id: string
          values_importance?: string | null
          watching_with_friends?: string | null
          weekend_preference?: string | null
          worldview_preference?: string | null
        }
        Update: {
          active_friends_preference?: string | null
          age_range_preference?: string | null
          availability_times?: string[] | null
          big_picture_discussions?: string | null
          book_types?: string[] | null
          budget_consciousness?: string | null
          coffee_or_tea?: string | null
          communication_preference?: string | null
          completed_at?: string | null
          cultural_activities?: string[] | null
          deep_conversation_frequency?: string | null
          default_hangout?: string | null
          embed_vector?: string | null
          enjoys_cooking?: string | null
          enjoys_reading?: string | null
          favorite_cuisines?: string[] | null
          friend_type?: string | null
          friend_types_seeking?: string[] | null
          friendship_commitment?: string | null
          friendship_pace?: string | null
          fun_activities?: string[] | null
          gaming_types?: string[] | null
          hangout_frequency?: string | null
          has_kids?: string | null
          holiday_preference?: string | null
          honesty_approach?: string | null
          important_issues?: string[] | null
          is_gamer?: string | null
          lazy_sunday?: string | null
          live_music_frequency?: string | null
          music_genres?: string[] | null
          networking_vs_friendship?: string | null
          news_engagement?: string | null
          nyt_games?: string[] | null
          partnered_friend_preference?: string | null
          personality_type?: string | null
          plays_nyt_games?: string | null
          podcast_types?: string[] | null
          political_alignment_importance?: string | null
          recharge_method?: string | null
          routine_vs_flexible?: string | null
          sense_of_humor?: string | null
          shared_vs_different?: string | null
          single_friend_preference?: string | null
          social_activity_level?: string | null
          social_media_usage?: string | null
          social_setting?: string | null
          sports_fitness?: string[] | null
          time_commitment?: string | null
          travel_with_friends?: string | null
          trying_restaurants?: string | null
          updated_at?: string | null
          user_id?: string
          values_importance?: string | null
          watching_with_friends?: string | null
          weekend_preference?: string | null
          worldview_preference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_responses_v3_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_candidates: {
        Row: {
          batch_week: string
          created_at: string | null
          expires_at: string | null
          id: string
          reasons: Json | null
          score: number | null
          status: string | null
          user_a: string | null
          user_b: string | null
        }
        Insert: {
          batch_week: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          reasons?: Json | null
          score?: number | null
          status?: string | null
          user_a?: string | null
          user_b?: string | null
        }
        Update: {
          batch_week?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          reasons?: Json | null
          score?: number | null
          status?: string | null
          user_a?: string | null
          user_b?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_candidates_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_candidates_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      messages: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          sender_id: string | null
          sender_type: string
          text: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_id?: string | null
          sender_type: string
          text: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_id?: string | null
          sender_type?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          availability_slots: Json | null
          created_at: string | null
          languages: string[] | null
          reminder_opt_in: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          availability_slots?: Json | null
          created_at?: string | null
          languages?: string[] | null
          reminder_opt_in?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          availability_slots?: Json | null
          created_at?: string | null
          languages?: string[] | null
          reminder_opt_in?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio_text: string | null
          birthdate: string | null
          city: string | null
          created_at: string | null
          first_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          is_paused: boolean | null
          languages: string[] | null
          last_name: string | null
          lat: number | null
          lng: number | null
          pronouns: string | null
          radius_km: number | null
          relationship_status: string | null
          sexual_orientation: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio_text?: string | null
          birthdate?: string | null
          city?: string | null
          created_at?: string | null
          first_name: string
          gender?: string | null
          id: string
          is_active?: boolean | null
          is_paused?: boolean | null
          languages?: string[] | null
          last_name?: string | null
          lat?: number | null
          lng?: number | null
          pronouns?: string | null
          radius_km?: number | null
          relationship_status?: string | null
          sexual_orientation?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio_text?: string | null
          birthdate?: string | null
          city?: string | null
          created_at?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_paused?: boolean | null
          languages?: string[] | null
          last_name?: string | null
          lat?: number | null
          lng?: number | null
          pronouns?: string | null
          radius_km?: number | null
          relationship_status?: string | null
          sexual_orientation?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reported_id: string | null
          reporter_id: string | null
          status: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          reported_id?: string | null
          reporter_id?: string | null
          status?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reported_id?: string | null
          reporter_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      calculate_age: {
        Args: { birth_date: string }
        Returns: number
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
  public: {
    Enums: {},
  },
} as const