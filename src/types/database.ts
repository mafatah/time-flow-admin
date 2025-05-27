export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          id: string
          admin_user_id: string
          action: string
          target_user_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          action: string
          target_user_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          action?: string
          target_user_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      app_logs: {
        Row: {
          id: string
          user_id: string
          app_name: string
          window_title: string | null
          started_at: string
          ended_at: string | null
          duration_seconds: number | null
          category: string | null
          project_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          app_name: string
          window_title?: string | null
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          category?: string | null
          project_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          app_name?: string
          window_title?: string | null
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          category?: string | null
          project_id?: string | null
        }
        Relationships: []
      }
      employee_project_assignments: {
        Row: {
          id: string
          user_id: string
          project_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          created_at?: string
        }
        Relationships: []
      }
      idle_logs: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          idle_start: string
          idle_end: string | null
          duration_minutes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          idle_start: string
          idle_end?: string | null
          duration_minutes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          idle_start?: string
          idle_end?: string | null
          duration_minutes?: number | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          payload: Json
          read_at: string | null
          created_at: string
          delivered_via: string[]
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          payload?: Json
          read_at?: string | null
          created_at?: string
          delivered_via?: string[]
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          payload?: Json
          read_at?: string | null
          created_at?: string
          delivered_via?: string[]
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      screenshot_categorization: {
        Row: {
          id: string
          screenshot_id: string
          category: string
          confidence_score: number | null
          assigned_by: string | null
          timestamp: string
          notes: string | null
        }
        Insert: {
          id?: string
          screenshot_id: string
          category: string
          confidence_score?: number | null
          assigned_by?: string | null
          timestamp?: string
          notes?: string | null
        }
        Update: {
          id?: string
          screenshot_id?: string
          category?: string
          confidence_score?: number | null
          assigned_by?: string | null
          timestamp?: string
          notes?: string | null
        }
        Relationships: []
      }
      screenshots: {
        Row: {
          id: string
          user_id: string | null
          project_id: string | null
          image_url: string
          captured_at: string
          activity_percent: number | null
          focus_percent: number | null
          classification: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          project_id?: string | null
          image_url: string
          captured_at?: string
          activity_percent?: number | null
          focus_percent?: number | null
          classification?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          project_id?: string | null
          image_url?: string
          captured_at?: string
          activity_percent?: number | null
          focus_percent?: number | null
          classification?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          screenshot_interval_seconds: number
          idle_threshold_seconds: number
          notification_rules: Json
          blur_screenshots: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          screenshot_interval_seconds?: number
          idle_threshold_seconds?: number
          notification_rules?: Json
          blur_screenshots?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          screenshot_interval_seconds?: number
          idle_threshold_seconds?: number
          notification_rules?: Json
          blur_screenshots?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_logs: {
        Row: {
          id: string
          user_id: string
          project_id: string
          start_time: string
          end_time: string | null
          is_idle: boolean
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          start_time?: string
          end_time?: string | null
          is_idle?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          start_time?: string
          end_time?: string | null
          is_idle?: boolean
        }
        Relationships: []
      }
      tracking_overlay_settings: {
        Row: {
          id: string
          user_id: string
          overlay_enabled: boolean
          position: string | null
          transparency_level: number | null
          custom_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          overlay_enabled?: boolean
          position?: string | null
          transparency_level?: number | null
          custom_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          overlay_enabled?: boolean
          position?: string | null
          transparency_level?: number | null
          custom_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tracking_status_logs: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          status: string
          metadata: Json
          timestamp: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          status: string
          metadata?: Json
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          status?: string
          metadata?: Json
          timestamp?: string
        }
        Relationships: []
      }
      unusual_activity: {
        Row: {
          id: string
          user_id: string
          rule_triggered: string
          confidence: number | null
          detected_at: string
          duration_hm: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          rule_triggered: string
          confidence?: number | null
          detected_at?: string
          duration_hm?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          rule_triggered?: string
          confidence?: number | null
          detected_at?: string
          duration_hm?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      url_logs: {
        Row: {
          id: string
          user_id: string
          site_url: string
          started_at: string
          ended_at: string | null
          duration_seconds: number | null
          category: string | null
          project_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          site_url: string
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          category?: string | null
          project_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          site_url?: string
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          category?: string | null
          project_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          avatar_url: string | null
          idle_timeout_minutes: number | null
          pause_allowed: boolean | null
          custom_screenshot_interval_seconds: number | null
          offline_tracking_enabled: boolean | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: string
          avatar_url?: string | null
          idle_timeout_minutes?: number | null
          pause_allowed?: boolean | null
          custom_screenshot_interval_seconds?: number | null
          offline_tracking_enabled?: boolean | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          avatar_url?: string | null
          idle_timeout_minutes?: number | null
          pause_allowed?: boolean | null
          custom_screenshot_interval_seconds?: number | null
          offline_tracking_enabled?: boolean | null
        }
        Relationships: []
      }
      v_dashboard: {
        Row: {
          id: string | null
          email: string | null
          full_name: string | null
          hours_today: number | null
          hours_this_week: number | null
          weekly_activity_percent: number | null
          recent_screenshot_url: string | null
          low_activity: boolean | null
        }
        Insert: {
          id?: string | null
          email?: string | null
          full_name?: string | null
          hours_today?: number | null
          hours_this_week?: number | null
          weekly_activity_percent?: number | null
          recent_screenshot_url?: string | null
          low_activity?: boolean | null
        }
        Update: {
          id?: string | null
          email?: string | null
          full_name?: string | null
          hours_today?: number | null
          hours_this_week?: number | null
          weekly_activity_percent?: number | null
          recent_screenshot_url?: string | null
          low_activity?: boolean | null
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof Database["public"]["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"]
    ? Database["public"]["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
