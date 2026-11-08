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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author: string
          author_role: string
          created_at: string
          date: string
          id: string
          pinned: boolean
          text: string
          title: string
        }
        Insert: {
          author?: string
          author_role?: string
          created_at?: string
          date?: string
          id?: string
          pinned?: boolean
          text: string
          title: string
        }
        Update: {
          author?: string
          author_role?: string
          created_at?: string
          date?: string
          id?: string
          pinned?: boolean
          text?: string
          title?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          author_id: string | null
          author_name: string
          author_photo: string | null
          author_role: string
          created_at: string
          id: string
          text: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          author_photo?: string | null
          author_role?: string
          created_at?: string
          id?: string
          text: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          author_photo?: string | null
          author_role?: string
          created_at?: string
          id?: string
          text?: string
        }
        Relationships: []
      }
      club_info: {
        Row: {
          about: string
          contact_email: string
          contact_phone: string
          history: string
          home_ground: string
          id: string
          kits_url: string
          logo_url: string
          motto: string
          name: string
          training_schedule: string
          updated_at: string
        }
        Insert: {
          about?: string
          contact_email?: string
          contact_phone?: string
          history?: string
          home_ground?: string
          id?: string
          kits_url?: string
          logo_url?: string
          motto?: string
          name?: string
          training_schedule?: string
          updated_at?: string
        }
        Update: {
          about?: string
          contact_email?: string
          contact_phone?: string
          history?: string
          home_ground?: string
          id?: string
          kits_url?: string
          logo_url?: string
          motto?: string
          name?: string
          training_schedule?: string
          updated_at?: string
        }
        Relationships: []
      }
      fixtures: {
        Row: {
          assists: string | null
          competition: string
          created_at: string
          date: string
          id: string
          opponent: string
          opponent_logo: string | null
          opponent_score: number | null
          outcome: string | null
          report: string | null
          scorers: string | null
          status: string | null
          team_score: number | null
          time: string | null
          type: string
          venue: string | null
        }
        Insert: {
          assists?: string | null
          competition?: string
          created_at?: string
          date?: string
          id?: string
          opponent: string
          opponent_logo?: string | null
          opponent_score?: number | null
          outcome?: string | null
          report?: string | null
          scorers?: string | null
          status?: string | null
          team_score?: number | null
          time?: string | null
          type: string
          venue?: string | null
        }
        Update: {
          assists?: string | null
          competition?: string
          created_at?: string
          date?: string
          id?: string
          opponent?: string
          opponent_logo?: string | null
          opponent_score?: number | null
          outcome?: string | null
          report?: string | null
          scorers?: string | null
          status?: string | null
          team_score?: number | null
          time?: string | null
          type?: string
          venue?: string | null
        }
        Relationships: []
      }
      league_stats: {
        Row: {
          drawn: number
          goal_difference: number
          goals_against: number
          goals_for: number
          id: string
          lost: number
          played: number
          points: number
          position: string
          won: number
        }
        Insert: {
          drawn?: number
          goal_difference?: number
          goals_against?: number
          goals_for?: number
          id?: string
          lost?: number
          played?: number
          points?: number
          position?: string
          won?: number
        }
        Update: {
          drawn?: number
          goal_difference?: number
          goals_against?: number
          goals_for?: number
          id?: string
          lost?: number
          played?: number
          points?: number
          position?: string
          won?: number
        }
        Relationships: []
      }
      playbook_tactics: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          key_players: string | null
          sheet_page: number | null
          sort_order: number
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          key_players?: string | null
          sheet_page?: number | null
          sort_order?: number
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          key_players?: string | null
          sheet_page?: number | null
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          chat_access: boolean
          display_name: string
          email: string
          id: string
          is_reviewed: boolean
          joined_at: string
          photo_url: string | null
          status: string
        }
        Insert: {
          chat_access?: boolean
          display_name?: string
          email?: string
          id: string
          is_reviewed?: boolean
          joined_at?: string
          photo_url?: string | null
          status?: string
        }
        Update: {
          chat_access?: boolean
          display_name?: string
          email?: string
          id?: string
          is_reviewed?: boolean
          joined_at?: string
          photo_url?: string | null
          status?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      squad_members: {
        Row: {
          attributes: Json
          bio: string | null
          card_image: string | null
          card_position: string
          category: string
          chat_access: boolean
          club_role: string
          created_at: string
          id: string
          name: string
          number: number | null
          photo: string | null
          position: string
          rating: number
          sort_order: number
          stats: Json
          tactical_role: string | null
        }
        Insert: {
          attributes?: Json
          bio?: string | null
          card_image?: string | null
          card_position?: string
          category?: string
          chat_access?: boolean
          club_role?: string
          created_at?: string
          id?: string
          name: string
          number?: number | null
          photo?: string | null
          position?: string
          rating?: number
          sort_order?: number
          stats?: Json
          tactical_role?: string | null
        }
        Update: {
          attributes?: Json
          bio?: string | null
          card_image?: string | null
          card_position?: string
          category?: string
          chat_access?: boolean
          club_role?: string
          created_at?: string
          id?: string
          name?: string
          number?: number | null
          photo?: string | null
          position?: string
          rating?: number
          sort_order?: number
          stats?: Json
          tactical_role?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          callsign: string | null
          collaboration_note: string | null
          created_at: string
          department: string
          description: string | null
          icon_type: string | null
          id: string
          name: string
          photo: string | null
          role: string
          roles: Json
          sort_order: number
          tag: string
          tone: string
        }
        Insert: {
          callsign?: string | null
          collaboration_note?: string | null
          created_at?: string
          department?: string
          description?: string | null
          icon_type?: string | null
          id?: string
          name: string
          photo?: string | null
          role: string
          roles?: Json
          sort_order?: number
          tag?: string
          tone?: string
        }
        Update: {
          callsign?: string | null
          collaboration_note?: string | null
          created_at?: string
          department?: string
          description?: string | null
          icon_type?: string | null
          id?: string
          name?: string
          photo?: string | null
          role?: string
          roles?: Json
          sort_order?: number
          tag?: string
          tone?: string
        }
        Relationships: []
      }
      team_principles: {
        Row: {
          description: string
          num: number
          title: string
        }
        Insert: {
          description: string
          num: number
          title: string
        }
        Update: {
          description?: string
          num?: number
          title?: string
        }
        Relationships: []
      }
      transfers_news: {
        Row: {
          badge: string | null
          category: string
          created_at: string
          date: string
          id: string
          image: string | null
          text: string
          title: string
          type: string
        }
        Insert: {
          badge?: string | null
          category?: string
          created_at?: string
          date?: string
          id?: string
          image?: string | null
          text: string
          title: string
          type?: string
        }
        Update: {
          badge?: string | null
          category?: string
          created_at?: string
          date?: string
          id?: string
          image?: string | null
          text?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["club_rank"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["club_rank"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["club_rank"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_member: { Args: { _target: string }; Returns: undefined }
      assign_rank: {
        Args: {
          _new_role: Database["public"]["Enums"]["club_rank"]
          _target: string
        }
        Returns: undefined
      }
      can_manage_member: {
        Args: { _caller: string; _target: string }
        Returns: boolean
      }
      has_chat_access: { Args: { _user_id: string }; Returns: boolean }
      is_approved_member: { Args: { _user_id: string }; Returns: boolean }
      rank_label: {
        Args: { _role: Database["public"]["Enums"]["club_rank"] }
        Returns: string
      }
      rank_level: {
        Args: { _role: Database["public"]["Enums"]["club_rank"] }
        Returns: number
      }
      remove_member: { Args: { _target: string }; Returns: undefined }
      restore_member: { Args: { _target: string }; Returns: undefined }
      set_chat_access: {
        Args: { _access: boolean; _target: string }
        Returns: undefined
      }
      user_rank_level: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      club_rank: "web_handler" | "co_owner" | "admin" | "moderator" | "member"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      club_rank: ["web_handler", "co_owner", "admin", "moderator", "member"],
    },
  },
} as const
