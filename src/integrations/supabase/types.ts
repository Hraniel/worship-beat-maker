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
      admin_notifications: {
        Row: {
          channels: string[]
          created_at: string
          id: string
          message: string
          sent_by: string
          target: string
          target_user_id: string | null
          title: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          id?: string
          message: string
          sent_by: string
          target?: string
          target_user_id?: string | null
          title: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          id?: string
          message?: string
          sent_by?: string
          target?: string
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      cancellation_reasons: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          reason: string
          tier_at_cancellation: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          reason: string
          tier_at_cancellation?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          reason?: string
          tier_at_cancellation?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_suggestions: {
        Row: {
          created_at: string
          description: string
          id: string
          likes_count: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          likes_count?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          likes_count?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_gates: {
        Row: {
          created_at: string
          description: string | null
          gate_key: string
          gate_label: string
          id: string
          required_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gate_key: string
          gate_label: string
          id?: string
          required_tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gate_key?: string
          gate_label?: string
          id?: string
          required_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      granted_tiers: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string
          id: string
          note: string | null
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by: string
          id?: string
          note?: string | null
          tier?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string
          id?: string
          note?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      landing_config: {
        Row: {
          config_key: string
          config_value: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      landing_features: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          icon_name: string
          id: string
          image_url: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          enabled?: boolean
          icon_name?: string
          id?: string
          image_url?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          icon_name?: string
          id?: string
          image_url?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pack_sounds: {
        Row: {
          category: string
          created_at: string
          duration_ms: number
          file_path: string | null
          id: string
          name: string
          pack_id: string
          preview_path: string | null
          short_name: string
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          duration_ms?: number
          file_path?: string | null
          id?: string
          name: string
          pack_id: string
          preview_path?: string | null
          short_name: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          duration_ms?: number
          file_path?: string | null
          id?: string
          name?: string
          pack_id?: string
          preview_path?: string | null
          short_name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pack_sounds_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "store_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          feature_label: string
          id: string
          sort_order: number
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          feature_label: string
          id?: string
          sort_order?: number
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          feature_label?: string
          id?: string
          sort_order?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_pricing: {
        Row: {
          badge_text: string | null
          created_at: string
          cta_text: string
          highlight: boolean
          id: string
          max_imports: number
          max_pads: number
          name: string
          period: string
          price_brl: number
          tier: string
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          created_at?: string
          cta_text?: string
          highlight?: boolean
          id?: string
          max_imports?: number
          max_pads?: number
          name: string
          period?: string
          price_brl?: number
          tier: string
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          created_at?: string
          cta_text?: string
          highlight?: boolean
          id?: string
          max_imports?: number
          max_pads?: number
          name?: string
          period?: string
          price_brl?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      setlist_events: {
        Row: {
          created_at: string | null
          event_date: string
          id: string
          is_public: boolean | null
          name: string
          setlist_id: string | null
          share_token: string | null
          songs_data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_date: string
          id?: string
          is_public?: boolean | null
          name: string
          setlist_id?: string | null
          share_token?: string | null
          songs_data?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_date?: string
          id?: string
          is_public?: boolean | null
          name?: string
          setlist_id?: string | null
          share_token?: string | null
          songs_data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setlist_events_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
        ]
      }
      setlists: {
        Row: {
          created_at: string
          id: string
          is_public: boolean | null
          name: string
          share_token: string | null
          songs: Json
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean | null
          name: string
          share_token?: string | null
          songs?: Json
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean | null
          name?: string
          share_token?: string | null
          songs?: Json
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_packs: {
        Row: {
          banner_url: string | null
          category: string
          color: string
          created_at: string
          description: string
          icon_name: string
          id: string
          is_available: boolean
          name: string
          price_cents: number
          publish_at: string | null
          tag: string | null
        }
        Insert: {
          banner_url?: string | null
          category: string
          color?: string
          created_at?: string
          description: string
          icon_name?: string
          id?: string
          is_available?: boolean
          name: string
          price_cents?: number
          publish_at?: string | null
          tag?: string | null
        }
        Update: {
          banner_url?: string | null
          category?: string
          color?: string
          created_at?: string
          description?: string
          icon_name?: string
          id?: string
          is_available?: boolean
          name?: string
          price_cents?: number
          publish_at?: string | null
          tag?: string | null
        }
        Relationships: []
      }
      suggestion_likes: {
        Row: {
          created_at: string
          id: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_likes_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "community_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bans: {
        Row: {
          ban_type: string
          banned_by: string
          created_at: string
          email: string
          expires_at: string | null
          id: string
          ip_address: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          ban_type?: string
          banned_by: string
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          ban_type?: string
          banned_by?: string
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "admin_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_purchases: {
        Row: {
          id: string
          pack_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          pack_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          pack_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "store_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
