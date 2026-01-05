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
      branding_settings: {
        Row: {
          created_at: string | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      broadcasts: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          message: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      config_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          ai_summary_enabled: boolean
          created_at: string
          enabled: boolean
          features: Json
          id: string
          max_categories: number
          max_screenshots_per_user: number | null
          max_videos_per_category: number
          name: string
          price_monthly: number
          price_yearly: number
          storage_quota_mb: number | null
          stripe_monthly_price_id: string | null
          stripe_yearly_price_id: string | null
          updated_at: string
        }
        Insert: {
          ai_summary_enabled?: boolean
          created_at?: string
          enabled?: boolean
          features?: Json
          id?: string
          max_categories?: number
          max_screenshots_per_user?: number | null
          max_videos_per_category?: number
          name: string
          price_monthly?: number
          price_yearly?: number
          storage_quota_mb?: number | null
          stripe_monthly_price_id?: string | null
          stripe_yearly_price_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary_enabled?: boolean
          created_at?: string
          enabled?: boolean
          features?: Json
          id?: string
          max_categories?: number
          max_screenshots_per_user?: number | null
          max_videos_per_category?: number
          name?: string
          price_monthly?: number
          price_yearly?: number
          storage_quota_mb?: number | null
          stripe_monthly_price_id?: string | null
          stripe_yearly_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          email_confirmed: boolean
          first_name: string | null
          id: string
          last_login_at: string | null
          last_name: string | null
          mobile: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          email_confirmed?: boolean
          first_name?: string | null
          id: string
          last_login_at?: string | null
          last_name?: string | null
          mobile?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          email_confirmed?: boolean
          first_name?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          mobile?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          id: string
          max_uses: number | null
          plan_id: string
          single_use_per_user: boolean | null
          status: string
          updated_at: string
          validity_days: number
          validity_period: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          id?: string
          max_uses?: number | null
          plan_id: string
          single_use_per_user?: boolean | null
          status?: string
          updated_at?: string
          validity_days: number
          validity_period: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          id?: string
          max_uses?: number | null
          plan_id?: string
          single_use_per_user?: boolean | null
          status?: string
          updated_at?: string
          validity_days?: number
          validity_period?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription_data: Json
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription_data: Json
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription_data?: Json
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      screenshots: {
        Row: {
          ai_status: string | null
          category_id: string
          created_at: string
          format: string
          id: string
          image_1600_url: string | null
          labels: Json | null
          note: string | null
          ocr_text: string | null
          original_url: string
          size_bytes: number
          thumb_320_url: string | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          ai_status?: string | null
          category_id: string
          created_at?: string
          format: string
          id?: string
          image_1600_url?: string | null
          labels?: Json | null
          note?: string | null
          ocr_text?: string | null
          original_url: string
          size_bytes: number
          thumb_320_url?: string | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          ai_status?: string | null
          category_id?: string
          created_at?: string
          format?: string
          id?: string
          image_1600_url?: string | null
          labels?: Json | null
          note?: string | null
          ocr_text?: string | null
          original_url?: string
          size_bytes?: number
          thumb_320_url?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenshots_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshots_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string
          details: Json
          event_type: string
          id: string
          ip_address: unknown
          session_id: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          severity: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          severity?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      storage_policy: {
        Row: {
          compression_quality: number
          default_quota_free_mb: number
          default_quota_gold_mb: number | null
          default_quota_premium_mb: number
          enforce_webp: boolean
          id: string
          max_longest_edge_px: number
          max_upload_mb: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          compression_quality?: number
          default_quota_free_mb?: number
          default_quota_gold_mb?: number | null
          default_quota_premium_mb?: number
          enforce_webp?: boolean
          id?: string
          max_longest_edge_px?: number
          max_upload_mb?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          compression_quality?: number
          default_quota_free_mb?: number
          default_quota_gold_mb?: number | null
          default_quota_premium_mb?: number
          enforce_webp?: boolean
          id?: string
          max_longest_edge_px?: number
          max_upload_mb?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: boolean
          updated_at?: string
        }
        Relationships: []
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
      user_storage_usage: {
        Row: {
          updated_at: string
          used_bytes: number
          user_id: string
        }
        Insert: {
          updated_at?: string
          used_bytes?: number
          user_id: string
        }
        Update: {
          updated_at?: string
          used_bytes?: number
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_interval: string | null
          created_at: string
          end_date: string | null
          id: string
          plan_id: string
          promo_code: string | null
          start_date: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          plan_id: string
          promo_code?: string | null
          start_date?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          plan_id?: string
          promo_code?: string | null
          start_date?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      video_summaries: {
        Row: {
          action_items: Json | null
          cost_cents: number | null
          created_at: string
          error_message: string | null
          id: string
          key_points: Json | null
          model_name: string | null
          platform: string | null
          prompt_version: string | null
          regeneration_count: number | null
          runtime_ms: number | null
          status: Database["public"]["Enums"]["video_summary_status"] | null
          suggested_tags: Json | null
          tags: Json | null
          timestamps: Json | null
          tldr: string | null
          transcript: string | null
          transcript_hash: string | null
          transcript_source: string | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          action_items?: Json | null
          cost_cents?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          key_points?: Json | null
          model_name?: string | null
          platform?: string | null
          prompt_version?: string | null
          regeneration_count?: number | null
          runtime_ms?: number | null
          status?: Database["public"]["Enums"]["video_summary_status"] | null
          suggested_tags?: Json | null
          tags?: Json | null
          timestamps?: Json | null
          tldr?: string | null
          transcript?: string | null
          transcript_hash?: string | null
          transcript_source?: string | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          action_items?: Json | null
          cost_cents?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          key_points?: Json | null
          model_name?: string | null
          platform?: string | null
          prompt_version?: string | null
          regeneration_count?: number | null
          runtime_ms?: number | null
          status?: Database["public"]["Enums"]["video_summary_status"] | null
          suggested_tags?: Json | null
          tags?: Json | null
          timestamps?: Json | null
          tldr?: string | null
          transcript?: string | null
          transcript_hash?: string | null
          transcript_source?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_video_summaries_video_id"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_summaries_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          ai_summary: string | null
          category_id: string
          created_at: string
          creator: string | null
          description: string | null
          duration: number | null
          id: string
          meta_error: string | null
          meta_status: string | null
          platform: string | null
          published_at: string | null
          reminder_date: string | null
          tags: string[] | null
          thumbnail_160_url: string | null
          thumbnail_320_url: string | null
          thumbnail_640_url: string | null
          thumbnail_last_checked_at: string | null
          thumbnail_source: string | null
          thumbnail_url: string | null
          title: string
          transcript: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          category_id: string
          created_at?: string
          creator?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          meta_error?: string | null
          meta_status?: string | null
          platform?: string | null
          published_at?: string | null
          reminder_date?: string | null
          tags?: string[] | null
          thumbnail_160_url?: string | null
          thumbnail_320_url?: string | null
          thumbnail_640_url?: string | null
          thumbnail_last_checked_at?: string | null
          thumbnail_source?: string | null
          thumbnail_url?: string | null
          title: string
          transcript?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          category_id?: string
          created_at?: string
          creator?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          meta_error?: string | null
          meta_status?: string | null
          platform?: string | null
          published_at?: string | null
          reminder_date?: string | null
          tags?: string[] | null
          thumbnail_160_url?: string | null
          thumbnail_320_url?: string | null
          thumbnail_640_url?: string | null
          thumbnail_last_checked_at?: string | null
          thumbnail_source?: string | null
          thumbnail_url?: string | null
          title?: string
          transcript?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          plan: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          plan: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          plan?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_promotion: {
        Args: { promo_code_input: string; user_uuid: string }
        Returns: {
          message: string
          plan_name: string
          success: boolean
        }[]
      }
      can_add_video_to_category: {
        Args: { category_uuid: string; user_uuid: string }
        Returns: boolean
      }
      can_create_category: { Args: { user_uuid: string }; Returns: boolean }
      check_user_limits: { Args: { check_user_id: string }; Returns: Json }
      clear_rate_limits: { Args: { p_identifier: string }; Returns: number }
      get_google_oauth_settings: {
        Args: never
        Returns: {
          client_id: string
          client_secret: string
          enabled: boolean
        }[]
      }
      get_openai_settings: {
        Args: never
        Returns: {
          api_key: string
          enabled: boolean
        }[]
      }
      get_public_branding: {
        Args: never
        Returns: {
          favicon_url: string
          logo_url: string
        }[]
      }
      get_public_plans: {
        Args: never
        Returns: {
          ai_summary_enabled: boolean
          display_features: Json
          id: string
          max_categories: number
          max_videos_per_category: number
          name: string
          price_monthly: number
          price_yearly: number
        }[]
      }
      get_public_pricing: {
        Args: never
        Returns: {
          display_features: Json
          id: string
          name: string
          price_monthly: number
          price_yearly: number
        }[]
      }
      get_push_notification_settings: {
        Args: never
        Returns: {
          enabled: boolean
          vapid_private_key: string
          vapid_public_key: string
        }[]
      }
      get_resend_settings: {
        Args: never
        Returns: {
          api_key: string
          enabled: boolean
          from_domain: string
        }[]
      }
      get_safe_branding: { Args: never; Returns: Json }
      get_safe_plans: { Args: never; Returns: Json }
      get_stripe_configuration: {
        Args: never
        Returns: {
          enabled: boolean
          publishable_key: string
          secret_key: string
          webhook_secret: string
        }[]
      }
      get_stripe_settings: {
        Args: never
        Returns: {
          enabled: boolean
          publishable_key: string
          secret_key: string
        }[]
      }
      get_system_setting_bool: { Args: { _key: string }; Returns: boolean }
      get_total_categories_count: { Args: never; Returns: number }
      get_total_videos_count: { Args: never; Returns: number }
      get_twilio_settings: {
        Args: never
        Returns: {
          account_sid: string
          auth_token: string
          enabled: boolean
          phone_number: string
        }[]
      }
      get_user_plan_limits: {
        Args: { user_uuid: string }
        Returns: {
          ai_summary_enabled: boolean
          current_categories: number
          features: Json
          max_categories: number
          max_screenshots_per_user: number
          max_videos_per_category: number
          plan_name: string
          storage_quota_mb: number
        }[]
      }
      get_user_screenshot_limits: {
        Args: { user_uuid: string }
        Returns: {
          can_upload: boolean
          current_screenshots: number
          max_screenshots: number
        }[]
      }
      get_user_storage_quota: {
        Args: { user_uuid: string }
        Returns: {
          quota_bytes: number
          remaining_bytes: number
          used_bytes: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_ip_address?: unknown
          p_severity?: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: string
      }
      secure_promote_to_admin: {
        Args: { current_admin_password: string; target_user_id: string }
        Returns: Json
      }
      test_security_logging: { Args: never; Returns: string }
      update_google_oauth_settings: {
        Args: {
          p_client_id: string
          p_client_secret: string
          p_enabled: boolean
        }
        Returns: undefined
      }
      update_openai_settings: {
        Args: { p_api_key: string; p_enabled: boolean }
        Returns: undefined
      }
      update_push_notification_settings: {
        Args: {
          p_enabled: boolean
          p_vapid_private_key: string
          p_vapid_public_key: string
        }
        Returns: undefined
      }
      update_resend_settings: {
        Args: { p_api_key: string; p_enabled: boolean; p_from_domain: string }
        Returns: undefined
      }
      update_stripe_configuration: {
        Args: {
          p_enabled: boolean
          p_publishable_key: string
          p_secret_key: string
          p_webhook_secret: string
        }
        Returns: undefined
      }
      update_stripe_settings: {
        Args: {
          p_enabled: boolean
          p_publishable_key: string
          p_secret_key: string
        }
        Returns: undefined
      }
      update_twilio_settings: {
        Args: {
          p_account_sid: string
          p_auth_token: string
          p_enabled: boolean
          p_phone_number: string
        }
        Returns: undefined
      }
      validate_admin_operation: {
        Args: {
          additional_data?: Json
          operation_type: string
          target_user_id?: string
        }
        Returns: Json
      }
      validate_promo_code: {
        Args: { promo_code_input: string }
        Returns: {
          message: string
          plan_id: string
          plan_name: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      video_summary_status: "queued" | "processing" | "ready" | "failed"
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
      video_summary_status: ["queued", "processing", "ready", "failed"],
    },
  },
} as const
