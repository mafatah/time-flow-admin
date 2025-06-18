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
          action: string
          admin_user_id: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          target_user_id: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          target_user_id?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          target_user_id?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      app_logs: {
        Row: {
          app_name: string
          app_path: string | null
          category: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          project_id: string | null
          started_at: string
          time_log_id: string | null
          timestamp: string | null
          user_id: string
          window_title: string | null
        }
        Insert: {
          app_name: string
          app_path?: string | null
          category?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          project_id?: string | null
          started_at?: string
          time_log_id?: string | null
          timestamp?: string | null
          user_id: string
          window_title?: string | null
        }
        Update: {
          app_name?: string
          app_path?: string | null
          category?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          project_id?: string | null
          started_at?: string
          time_log_id?: string | null
          timestamp?: string | null
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
          {
            foreignKeyName: "app_logs_time_log_id_fkey"
            columns: ["time_log_id"]
            isOneToOne: false
            referencedRelation: "time_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_deductions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string
          deduction_type: string
          id: string
          is_active: boolean | null
          month_year: string
          reason: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by: string
          deduction_type: string
          id?: string
          is_active?: boolean | null
          month_year: string
          reason: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string
          deduction_type?: string
          id?: string
          is_active?: boolean | null
          month_year?: string
          reason?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_deductions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_deductions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_deductions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_deductions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_payroll: {
        Row: {
          base_salary: number | null
          created_at: string | null
          deductions: number | null
          final_salary: number | null
          id: string
          is_paid: boolean | null
          month_year: string
          notes: string | null
          overtime_hours: number | null
          overtime_pay: number | null
          paid_at: string | null
          regular_hours: number | null
          total_hours_worked: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_salary?: number | null
          created_at?: string | null
          deductions?: number | null
          final_salary?: number | null
          id?: string
          is_paid?: boolean | null
          month_year: string
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          paid_at?: string | null
          regular_hours?: number | null
          total_hours_worked?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_salary?: number | null
          created_at?: string | null
          deductions?: number | null
          final_salary?: number | null
          id?: string
          is_paid?: boolean | null
          month_year?: string
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          paid_at?: string | null
          regular_hours?: number | null
          total_hours_worked?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_payroll_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_payroll_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
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
      employee_salary_settings: {
        Row: {
          created_at: string | null
          effective_from: string | null
          hourly_rate: number | null
          id: string
          minimum_hours_monthly: number | null
          monthly_salary: number | null
          notes: string | null
          overtime_rate: number | null
          salary_type: string
          screenshot_frequency_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          effective_from?: string | null
          hourly_rate?: number | null
          id?: string
          minimum_hours_monthly?: number | null
          monthly_salary?: number | null
          notes?: string | null
          overtime_rate?: number | null
          salary_type?: string
          screenshot_frequency_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          effective_from?: string | null
          hourly_rate?: number | null
          id?: string
          minimum_hours_monthly?: number | null
          monthly_salary?: number | null
          notes?: string | null
          overtime_rate?: number | null
          salary_type?: string
          screenshot_frequency_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_suspicious_activity: {
        Row: {
          analysis_date: string
          created_at: string | null
          entertainment_apps: number | null
          flags: string[] | null
          id: string
          idle_time_hours: number | null
          low_focus_periods: number | null
          news_consumption: number | null
          productivity_metrics: Json | null
          raw_data: Json | null
          risk_score: number | null
          screenshot_analysis: Json | null
          social_media_usage: number | null
          unproductive_websites: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_date?: string
          created_at?: string | null
          entertainment_apps?: number | null
          flags?: string[] | null
          id?: string
          idle_time_hours?: number | null
          low_focus_periods?: number | null
          news_consumption?: number | null
          productivity_metrics?: Json | null
          raw_data?: Json | null
          risk_score?: number | null
          screenshot_analysis?: Json | null
          social_media_usage?: number | null
          unproductive_websites?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_date?: string
          created_at?: string | null
          entertainment_apps?: number | null
          flags?: string[] | null
          id?: string
          idle_time_hours?: number | null
          low_focus_periods?: number | null
          news_consumption?: number | null
          productivity_metrics?: Json | null
          raw_data?: Json | null
          risk_score?: number | null
          screenshot_analysis?: Json | null
          social_media_usage?: number | null
          unproductive_websites?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_suspicious_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_suspicious_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_warnings: {
        Row: {
          actual_value: number | null
          created_at: string | null
          gap_percentage: number | null
          id: string
          is_reviewed: boolean | null
          message: string
          month_year: string
          required_value: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string | null
          updated_at: string | null
          user_id: string
          warning_type: string
        }
        Insert: {
          actual_value?: number | null
          created_at?: string | null
          gap_percentage?: number | null
          id?: string
          is_reviewed?: boolean | null
          message: string
          month_year: string
          required_value?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string | null
          updated_at?: string | null
          user_id: string
          warning_type: string
        }
        Update: {
          actual_value?: number | null
          created_at?: string | null
          gap_percentage?: number | null
          id?: string
          is_reviewed?: boolean | null
          message?: string
          month_year?: string
          required_value?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string | null
          updated_at?: string | null
          user_id?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_warnings_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_warnings_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_working_standards: {
        Row: {
          created_at: string | null
          employment_type: string
          id: string
          is_active: boolean | null
          minimum_hours_daily: number | null
          overtime_threshold: number | null
          required_days_monthly: number | null
          required_hours_monthly: number | null
          updated_at: string | null
          user_id: string
          warning_threshold_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          employment_type: string
          id?: string
          is_active?: boolean | null
          minimum_hours_daily?: number | null
          overtime_threshold?: number | null
          required_days_monthly?: number | null
          required_hours_monthly?: number | null
          updated_at?: string | null
          user_id: string
          warning_threshold_percentage?: number | null
        }
        Update: {
          created_at?: string | null
          employment_type?: string
          id?: string
          is_active?: boolean | null
          minimum_hours_daily?: number | null
          overtime_threshold?: number | null
          required_days_monthly?: number | null
          required_hours_monthly?: number | null
          updated_at?: string | null
          user_id?: string
          warning_threshold_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_working_standards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_working_standards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      idle_logs: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          duration_seconds: number | null
          id: string
          idle_end: string | null
          idle_start: string
          project_id: string | null
          time_log_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          duration_seconds?: number | null
          id?: string
          idle_end?: string | null
          idle_start?: string
          project_id?: string | null
          time_log_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          duration_seconds?: number | null
          id?: string
          idle_end?: string | null
          idle_start?: string
          project_id?: string | null
          time_log_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_idle_logs_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_idle_logs_time_log_id"
            columns: ["time_log_id"]
            isOneToOne: false
            referencedRelation: "time_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_idle_logs_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_idle_logs_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
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
      report_configurations: {
        Row: {
          alert_settings: Json | null
          created_at: string | null
          description: string | null
          filters: Json | null
          id: string
          include_alerts: boolean | null
          include_employee_details: boolean | null
          include_projects: boolean | null
          include_summary: boolean | null
          is_active: boolean | null
          name: string
          report_type_id: string | null
          schedule_cron: string | null
          schedule_description: string | null
          subject_template: string
          updated_at: string | null
        }
        Insert: {
          alert_settings?: Json | null
          created_at?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          include_alerts?: boolean | null
          include_employee_details?: boolean | null
          include_projects?: boolean | null
          include_summary?: boolean | null
          is_active?: boolean | null
          name: string
          report_type_id?: string | null
          schedule_cron?: string | null
          schedule_description?: string | null
          subject_template: string
          updated_at?: string | null
        }
        Update: {
          alert_settings?: Json | null
          created_at?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          include_alerts?: boolean | null
          include_employee_details?: boolean | null
          include_projects?: boolean | null
          include_summary?: boolean | null
          is_active?: boolean | null
          name?: string
          report_type_id?: string | null
          schedule_cron?: string | null
          schedule_description?: string | null
          subject_template?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_configurations_report_type_id_fkey"
            columns: ["report_type_id"]
            isOneToOne: false
            referencedRelation: "report_types"
            referencedColumns: ["id"]
          },
        ]
      }
      report_history: {
        Row: {
          email_service_id: string | null
          error_message: string | null
          id: string
          recipient_count: number | null
          report_config_id: string | null
          report_data: Json | null
          sent_at: string | null
          status: string
        }
        Insert: {
          email_service_id?: string | null
          error_message?: string | null
          id?: string
          recipient_count?: number | null
          report_config_id?: string | null
          report_data?: Json | null
          sent_at?: string | null
          status: string
        }
        Update: {
          email_service_id?: string | null
          error_message?: string | null
          id?: string
          recipient_count?: number | null
          report_config_id?: string | null
          report_data?: Json | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_history_report_config_id_fkey"
            columns: ["report_config_id"]
            isOneToOne: false
            referencedRelation: "report_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_recipients: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          report_config_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          report_config_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          report_config_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_recipients_report_config_id_fkey"
            columns: ["report_config_id"]
            isOneToOne: false
            referencedRelation: "report_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      report_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template_type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_type?: string
        }
        Relationships: []
      }
      screenshot_categorization: {
        Row: {
          assigned_by: string | null
          category: string
          confidence_score: number | null
          id: string
          notes: string | null
          screenshot_id: string
          timestamp: string
        }
        Insert: {
          assigned_by?: string | null
          category: string
          confidence_score?: number | null
          id?: string
          notes?: string | null
          screenshot_id: string
          timestamp?: string
        }
        Update: {
          assigned_by?: string | null
          category?: string
          confidence_score?: number | null
          id?: string
          notes?: string | null
          screenshot_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenshot_categorization_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshot_categorization_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshot_categorization_screenshot_id_fkey"
            columns: ["screenshot_id"]
            isOneToOne: false
            referencedRelation: "screenshots"
            referencedColumns: ["id"]
          },
        ]
      }
      screenshots: {
        Row: {
          activity_percent: number | null
          app_name: string | null
          captured_at: string
          classification: string | null
          file_path: string | null
          focus_percent: number | null
          id: string
          image_url: string
          is_blurred: boolean | null
          keystrokes: number | null
          mouse_clicks: number | null
          mouse_movements: number | null
          project_id: string | null
          task_id: string | null
          time_log_id: string | null
          url: string | null
          user_id: string | null
          window_title: string | null
        }
        Insert: {
          activity_percent?: number | null
          app_name?: string | null
          captured_at?: string
          classification?: string | null
          file_path?: string | null
          focus_percent?: number | null
          id?: string
          image_url: string
          is_blurred?: boolean | null
          keystrokes?: number | null
          mouse_clicks?: number | null
          mouse_movements?: number | null
          project_id?: string | null
          task_id?: string | null
          time_log_id?: string | null
          url?: string | null
          user_id?: string | null
          window_title?: string | null
        }
        Update: {
          activity_percent?: number | null
          app_name?: string | null
          captured_at?: string
          classification?: string | null
          file_path?: string | null
          focus_percent?: number | null
          id?: string
          image_url?: string
          is_blurred?: boolean | null
          keystrokes?: number | null
          mouse_clicks?: number | null
          mouse_movements?: number | null
          project_id?: string | null
          task_id?: string | null
          time_log_id?: string | null
          url?: string | null
          user_id?: string | null
          window_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_screenshots_users"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_screenshots_users"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshots_time_log_id_fkey"
            columns: ["time_log_id"]
            isOneToOne: false
            referencedRelation: "time_logs"
            referencedColumns: ["id"]
          },
        ]
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
      suspicious_activity_detection: {
        Row: {
          activity_score: number | null
          created_at: string | null
          detection_date: string
          entertainment_time_minutes: number | null
          flags: Json | null
          focus_score: number | null
          id: string
          idle_time_minutes: number | null
          news_time_minutes: number | null
          notes: string | null
          productivity_score: number | null
          risk_level: string | null
          social_media_time_minutes: number | null
          total_work_time_minutes: number | null
          user_id: string
        }
        Insert: {
          activity_score?: number | null
          created_at?: string | null
          detection_date: string
          entertainment_time_minutes?: number | null
          flags?: Json | null
          focus_score?: number | null
          id?: string
          idle_time_minutes?: number | null
          news_time_minutes?: number | null
          notes?: string | null
          productivity_score?: number | null
          risk_level?: string | null
          social_media_time_minutes?: number | null
          total_work_time_minutes?: number | null
          user_id: string
        }
        Update: {
          activity_score?: number | null
          created_at?: string | null
          detection_date?: string
          entertainment_time_minutes?: number | null
          flags?: Json | null
          focus_score?: number | null
          id?: string
          idle_time_minutes?: number | null
          news_time_minutes?: number | null
          notes?: string | null
          productivity_score?: number | null
          risk_level?: string | null
          social_media_time_minutes?: number | null
          total_work_time_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suspicious_activity_detection_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspicious_activity_detection_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string | null
          description: string | null
          end_time: string | null
          id: string
          is_idle: boolean
          is_manual: boolean | null
          project_id: string | null
          start_time: string
          status: string | null
          task_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_idle?: boolean
          is_manual?: boolean | null
          project_id?: string | null
          start_time?: string
          status?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_idle?: boolean
          is_manual?: boolean | null
          project_id?: string | null
          start_time?: string
          status?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_time_logs_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_time_logs_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_time_logs_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_overlay_settings: {
        Row: {
          created_at: string
          custom_text: string | null
          id: string
          overlay_enabled: boolean
          position: string | null
          transparency_level: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_text?: string | null
          id?: string
          overlay_enabled?: boolean
          position?: string | null
          transparency_level?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_text?: string | null
          id?: string
          overlay_enabled?: boolean
          position?: string | null
          transparency_level?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_overlay_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_overlay_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_status_logs: {
        Row: {
          id: string
          metadata: Json | null
          session_id: string | null
          status: string
          timestamp: string
          user_id: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          session_id?: string | null
          status: string
          timestamp?: string
          user_id: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          session_id?: string | null
          status?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_status_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_status_logs_user_id_fkey"
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
          browser: string | null
          category: string | null
          domain: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          project_id: string | null
          site_url: string
          started_at: string
          time_log_id: string | null
          timestamp: string | null
          title: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          category?: string | null
          domain?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          project_id?: string | null
          site_url: string
          started_at?: string
          time_log_id?: string | null
          timestamp?: string | null
          title?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          category?: string | null
          domain?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          project_id?: string | null
          site_url?: string
          started_at?: string
          time_log_id?: string | null
          timestamp?: string | null
          title?: string | null
          url?: string | null
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
          {
            foreignKeyName: "url_logs_time_log_id_fkey"
            columns: ["time_log_id"]
            isOneToOne: false
            referencedRelation: "time_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          custom_screenshot_interval_seconds: number | null
          email: string
          full_name: string
          id: string
          idle_timeout_minutes: number | null
          is_active: boolean | null
          last_activity: string | null
          minimum_hours_monthly: number | null
          offline_tracking_enabled: boolean | null
          pause_allowed: boolean | null
          pause_reason: string | null
          paused_at: string | null
          paused_by: string | null
          role: string
          salary_amount: number | null
          salary_type: string | null
          screenshot_frequency_seconds: number | null
        }
        Insert: {
          avatar_url?: string | null
          custom_screenshot_interval_seconds?: number | null
          email: string
          full_name: string
          id: string
          idle_timeout_minutes?: number | null
          is_active?: boolean | null
          last_activity?: string | null
          minimum_hours_monthly?: number | null
          offline_tracking_enabled?: boolean | null
          pause_allowed?: boolean | null
          pause_reason?: string | null
          paused_at?: string | null
          paused_by?: string | null
          role?: string
          salary_amount?: number | null
          salary_type?: string | null
          screenshot_frequency_seconds?: number | null
        }
        Update: {
          avatar_url?: string | null
          custom_screenshot_interval_seconds?: number | null
          email?: string
          full_name?: string
          id?: string
          idle_timeout_minutes?: number | null
          is_active?: boolean | null
          last_activity?: string | null
          minimum_hours_monthly?: number | null
          offline_tracking_enabled?: boolean | null
          pause_allowed?: boolean | null
          pause_reason?: string | null
          paused_at?: string | null
          paused_by?: string | null
          role?: string
          salary_amount?: number | null
          salary_type?: string | null
          screenshot_frequency_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_paused_by_fkey"
            columns: ["paused_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_paused_by_fkey"
            columns: ["paused_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["id"]
          },
        ]
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
      log_admin_change: {
        Args: {
          admin_id: string
          action_type: string
          target_id?: string
          old_data?: Json
          new_data?: Json
        }
        Returns: undefined
      }
      pause_user: {
        Args: { target_user_id: string; admin_user_id: string; reason?: string }
        Returns: boolean
      }
      unpause_user: {
        Args: { target_user_id: string; admin_user_id: string }
        Returns: boolean
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
