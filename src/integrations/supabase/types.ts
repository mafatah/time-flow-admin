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
      app_logs: {
        Row: {
          app_name: string
          category: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          project_id: string | null
          started_at: string
          user_id: string
          window_title: string | null
        }
        Insert: {
          app_name: string
          category?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          project_id?: string | null
          started_at?: string
          user_id: string
          window_title?: string | null
        }
        Update: {
          app_name?: string
          category?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          project_id?: string | null
          started_at?: string
          user_id?: string
          window_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_project_assignments: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          delivered_via: string[] | null
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_via?: string[] | null
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_via?: string[] | null
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      screenshots: {
        Row: {
          activity_percent: number | null
          captured_at: string
          classification: string | null
          focus_percent: number | null
          id: string
          image_url: string
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          activity_percent?: number | null
          captured_at?: string
          classification?: string | null
          focus_percent?: number | null
          id?: string
          image_url: string
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          activity_percent?: number | null
          captured_at?: string
          classification?: string | null
          focus_percent?: number | null
          id?: string
          image_url?: string
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          blur_screenshots: boolean
          created_at: string
          id: string
          idle_threshold_seconds: number
          notification_rules: Json
          screenshot_interval_seconds: number
          updated_at: string
        }
        Insert: {
          blur_screenshots?: boolean
          created_at?: string
          id?: string
          idle_threshold_seconds?: number
          notification_rules?: Json
          screenshot_interval_seconds?: number
          updated_at?: string
        }
        Update: {
          blur_screenshots?: boolean
          created_at?: string
          id?: string
          idle_threshold_seconds?: number
          notification_rules?: Json
          screenshot_interval_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_projects"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tasks_users"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tasks_users"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          end_time: string | null
          id: string
          is_idle: boolean
          start_time: string
          task_id: string
          user_id: string
        }
        Insert: {
          end_time?: string | null
          id?: string
          is_idle?: boolean
          start_time?: string
          task_id: string
          user_id: string
        }
        Update: {
          end_time?: string | null
          id?: string
          is_idle?: boolean
          start_time?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_time_logs_tasks"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_time_logs_users"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_time_logs_users"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      unusual_activity: {
        Row: {
          confidence: number | null
          detected_at: string
          duration_hm: string | null
          id: string
          notes: string | null
          rule_triggered: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          detected_at?: string
          duration_hm?: string | null
          id?: string
          notes?: string | null
          rule_triggered: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          detected_at?: string
          duration_hm?: string | null
          id?: string
          notes?: string | null
          rule_triggered?: string
          user_id?: string
        }
        Relationships: []
      }
      url_logs: {
        Row: {
          category: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          project_id: string | null
          site_url: string
          started_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          project_id?: string | null
          site_url: string
          started_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          project_id?: string | null
          site_url?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "url_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          email: string
          full_name: string
          id: string
          role: string
        }
        Insert: {
          avatar_url?: string | null
          email: string
          full_name: string
          id: string
          role?: string
        }
        Update: {
          avatar_url?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_dashboard: {
        Row: {
          email: string | null
          full_name: string | null
          hours_this_week: number | null
          hours_today: number | null
          id: string | null
          low_activity: boolean | null
          recent_screenshot_url: string | null
          weekly_activity_percent: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_assigned_projects: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never> | { user_id: string }
        Returns: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
