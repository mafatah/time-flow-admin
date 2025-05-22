
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          name: string
          project_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          project_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          project_id?: string
          user_id?: string
          created_at?: string
        }
      }
      time_logs: {
        Row: {
          id: string
          user_id: string
          task_id: string
          start_time: string
          end_time: string | null
          is_idle: boolean
          status: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id: string
          start_time?: string
          end_time?: string | null
          is_idle?: boolean
          status?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string
          start_time?: string
          end_time?: string | null
          is_idle?: boolean
          status?: string
        }
      }
      screenshots: {
        Row: {
          id: string
          user_id: string
          task_id: string
          image_url: string
          captured_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id: string
          image_url: string
          captured_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string
          image_url?: string
          captured_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          avatar_url: string | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: string
          avatar_url?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          avatar_url?: string | null
        }
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
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
