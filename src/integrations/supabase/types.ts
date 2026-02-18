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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      council_debates: {
        Row: {
          challenger_argument: string | null
          challenger_key: string
          created_at: string
          defender_counter: string | null
          defender_key: string
          id: string
          idea_id: string
          round: number
          user_id: string
          winner_key: string | null
        }
        Insert: {
          challenger_argument?: string | null
          challenger_key: string
          created_at?: string
          defender_counter?: string | null
          defender_key: string
          id?: string
          idea_id: string
          round: number
          user_id: string
          winner_key?: string | null
        }
        Update: {
          challenger_argument?: string | null
          challenger_key?: string
          created_at?: string
          defender_counter?: string | null
          defender_key?: string
          id?: string
          idea_id?: string
          round?: number
          user_id?: string
          winner_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "council_debates_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "council_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      council_decision_scores: {
        Row: {
          consensus_pct: number | null
          created_at: string
          execution_difficulty: number | null
          id: string
          idea_id: string
          innovation_score: number | null
          long_term_potential: number | null
          risk_score: number | null
          user_id: string
        }
        Insert: {
          consensus_pct?: number | null
          created_at?: string
          execution_difficulty?: number | null
          id?: string
          idea_id: string
          innovation_score?: number | null
          long_term_potential?: number | null
          risk_score?: number | null
          user_id: string
        }
        Update: {
          consensus_pct?: number | null
          created_at?: string
          execution_difficulty?: number | null
          id?: string
          idea_id?: string
          innovation_score?: number | null
          long_term_potential?: number | null
          risk_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_decision_scores_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "council_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      council_ideas: {
        Row: {
          bias_radar: Json | null
          consensus_score: number | null
          content: string
          created_at: string
          id: string
          starred: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bias_radar?: Json | null
          consensus_score?: number | null
          content: string
          created_at?: string
          id?: string
          starred?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bias_radar?: Json | null
          consensus_score?: number | null
          content?: string
          created_at?: string
          id?: string
          starred?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      council_responses: {
        Row: {
          analysis: string | null
          created_at: string
          id: string
          idea_id: string
          persona_key: string
          user_id: string
          vote: string | null
          vote_score: number | null
        }
        Insert: {
          analysis?: string | null
          created_at?: string
          id?: string
          idea_id: string
          persona_key: string
          user_id: string
          vote?: string | null
          vote_score?: number | null
        }
        Update: {
          analysis?: string | null
          created_at?: string
          id?: string
          idea_id?: string
          persona_key?: string
          user_id?: string
          vote?: string | null
          vote_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "council_responses_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "council_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      council_simulations: {
        Row: {
          consensus_score: number | null
          created_at: string
          failure_points: string | null
          id: string
          idea_id: string
          persona_reactions: Json | null
          required_resources: string | null
          risk_probability: number | null
          scenario_description: string | null
          scenario_type: string
          time_to_execution: string | null
          user_id: string
        }
        Insert: {
          consensus_score?: number | null
          created_at?: string
          failure_points?: string | null
          id?: string
          idea_id: string
          persona_reactions?: Json | null
          required_resources?: string | null
          risk_probability?: number | null
          scenario_description?: string | null
          scenario_type: string
          time_to_execution?: string | null
          user_id: string
        }
        Update: {
          consensus_score?: number | null
          created_at?: string
          failure_points?: string | null
          id?: string
          idea_id?: string
          persona_reactions?: Json | null
          required_resources?: string | null
          risk_probability?: number | null
          scenario_description?: string | null
          scenario_type?: string
          time_to_execution?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_simulations_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "council_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      council_sticky_notes: {
        Row: {
          collapsed: boolean
          color: string
          content: string
          created_at: string
          emoji_reaction: string | null
          id: string
          parent_id: string
          parent_type: string
          priority_flag: string | null
          user_id: string
        }
        Insert: {
          collapsed?: boolean
          color?: string
          content?: string
          created_at?: string
          emoji_reaction?: string | null
          id?: string
          parent_id: string
          parent_type?: string
          priority_flag?: string | null
          user_id: string
        }
        Update: {
          collapsed?: boolean
          color?: string
          content?: string
          created_at?: string
          emoji_reaction?: string | null
          id?: string
          parent_id?: string
          parent_type?: string
          priority_flag?: string | null
          user_id?: string
        }
        Relationships: []
      }
      council_threads: {
        Row: {
          created_at: string
          id: string
          persona_key: string
          persona_reply: string
          response_id: string | null
          user_id: string
          user_message: string
        }
        Insert: {
          created_at?: string
          id?: string
          persona_key: string
          persona_reply: string
          response_id?: string | null
          user_id: string
          user_message: string
        }
        Update: {
          created_at?: string
          id?: string
          persona_key?: string
          persona_reply?: string
          response_id?: string | null
          user_id?: string
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_threads_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "council_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: Json | null
          created_at: string
          folder_id: string | null
          id: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          folder_id?: string | null
          id?: string
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          folder_id?: string | null
          id?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          parent_id: string | null
          sort_order: number | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          parent_id?: string | null
          sort_order?: number | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          parent_id?: string | null
          sort_order?: number | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current_amount: number | null
          deadline: string | null
          folder_id: string | null
          id: string
          pinned: boolean
          target_amount: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number | null
          deadline?: string | null
          folder_id?: string | null
          id?: string
          pinned?: boolean
          target_amount?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number | null
          deadline?: string | null
          folder_id?: string | null
          id?: string
          pinned?: boolean
          target_amount?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_versions: {
        Row: {
          change_summary: string | null
          consensus_score: number | null
          content: string
          created_at: string
          id: string
          idea_id: string
          influenced_by: string | null
          user_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          consensus_score?: number | null
          content: string
          created_at?: string
          id?: string
          idea_id: string
          influenced_by?: string | null
          user_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          consensus_score?: number | null
          content?: string
          created_at?: string
          id?: string
          idea_id?: string
          influenced_by?: string | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "idea_versions_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "council_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      schedule_blocks: {
        Row: {
          created_at: string
          duration: string
          id: string
          scheduled_date: string
          task_id: string | null
          time: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: string
          id?: string
          scheduled_date?: string
          task_id?: string | null
          time: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: string
          id?: string
          scheduled_date?: string
          task_id?: string | null
          time?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          content: string | null
          created_at: string
          done: boolean
          due_date: string | null
          energy_level: number | null
          folder_id: string | null
          id: string
          pinned: boolean
          priority: string | null
          scheduled_date: string | null
          sort_order: number | null
          status: string
          tags: string[] | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          energy_level?: number | null
          folder_id?: string | null
          id?: string
          pinned?: boolean
          priority?: string | null
          scheduled_date?: string | null
          sort_order?: number | null
          status?: string
          tags?: string[] | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          energy_level?: number | null
          folder_id?: string | null
          id?: string
          pinned?: boolean
          priority?: string | null
          scheduled_date?: string | null
          sort_order?: number | null
          status?: string
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          activity: string
          created_at: string
          date: string
          energy: number
          id: string
          mood: string | null
          user_id: string
        }
        Insert: {
          activity: string
          created_at?: string
          date: string
          energy?: number
          id?: string
          mood?: string | null
          user_id: string
        }
        Update: {
          activity?: string
          created_at?: string
          date?: string
          energy?: number
          id?: string
          mood?: string | null
          user_id?: string
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
