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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clubs: {
        Row: {
          bio: string | null
          city: string
          created_at: string
          gestionnaire_id: string | null
          id: string
          modules: string[]
          name: string
          open_to_network: boolean
          updated_at: string
        }
        Insert: {
          bio?: string | null
          city: string
          created_at?: string
          gestionnaire_id?: string | null
          id?: string
          modules?: string[]
          name: string
          open_to_network?: boolean
          updated_at?: string
        }
        Update: {
          bio?: string | null
          city?: string
          created_at?: string
          gestionnaire_id?: string | null
          id?: string
          modules?: string[]
          name?: string
          open_to_network?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      cotisation_payments: {
        Row: {
          amount_cents: number
          club_id: string
          created_at: string
          id: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_session_id: string | null
          subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          club_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_session_id?: string | null
          subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          club_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_session_id?: string | null
          subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotisation_payments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotisation_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "cotisation_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      cotisation_plans: {
        Row: {
          active: boolean
          amount_cents: number
          club_id: string
          created_at: string
          id: string
          interval: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_cents: number
          club_id: string
          created_at?: string
          id?: string
          interval: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          club_id?: string
          created_at?: string
          id?: string
          interval?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotisation_plans_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      cotisation_subscriptions: {
        Row: {
          club_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_reminded_at: string | null
          last_reminder_step: number
          next_due_at: string | null
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_reminded_at?: string | null
          last_reminder_step?: number
          next_due_at?: string | null
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_reminded_at?: string | null
          last_reminder_step?: number
          next_due_at?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotisation_subscriptions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotisation_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cotisation_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          attachment: Json | null
          body: string | null
          created_at: string
          id: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          attachment?: Json | null
          body?: string | null
          created_at?: string
          id?: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          attachment?: Json | null
          body?: string | null
          created_at?: string
          id?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      event_responses: {
        Row: {
          event_id: string
          id: string
          option_index: number
          responded_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          option_index: number
          responded_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          option_index?: number
          responded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendance_required: boolean
          club_id: string
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          is_paid: boolean
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          notified_new_at: string | null
          notify_on_create: boolean
          poll_options: Json
          poll_question: string | null
          poll_results_visible: boolean
          practical_info: string | null
          price_cents: number | null
          recurrence_parent_id: string | null
          remind_non_responders: boolean
          reminder_sent_at: string | null
          rrule: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attendance_required?: boolean
          club_id: string
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_paid?: boolean
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          notified_new_at?: string | null
          notify_on_create?: boolean
          poll_options?: Json
          poll_question?: string | null
          poll_results_visible?: boolean
          practical_info?: string | null
          price_cents?: number | null
          recurrence_parent_id?: string | null
          remind_non_responders?: boolean
          reminder_sent_at?: string | null
          rrule?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attendance_required?: boolean
          club_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_paid?: boolean
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          notified_new_at?: string | null
          notify_on_create?: boolean
          poll_options?: Json
          poll_question?: string | null
          poll_results_visible?: boolean
          practical_info?: string | null
          price_cents?: number | null
          recurrence_parent_id?: string | null
          remind_non_responders?: boolean
          reminder_sent_at?: string | null
          rrule?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          activated_at: string | null
          bio: string | null
          can_offer: string[] | null
          city: string | null
          club_id: string | null
          company: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          invited_at: string | null
          last_name: string
          linkedin_url: string | null
          looking_for: string[] | null
          office_address: string | null
          office_lat: number | null
          office_lng: number | null
          phone: string | null
          role: string | null
          sector: string | null
          share_office_location: boolean
          tags: string[] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          activated_at?: string | null
          bio?: string | null
          can_offer?: string[] | null
          city?: string | null
          club_id?: string | null
          company?: string | null
          created_at?: string
          email: string
          first_name: string
          id: string
          invited_at?: string | null
          last_name: string
          linkedin_url?: string | null
          looking_for?: string[] | null
          office_address?: string | null
          office_lat?: number | null
          office_lng?: number | null
          phone?: string | null
          role?: string | null
          sector?: string | null
          share_office_location?: boolean
          tags?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          activated_at?: string | null
          bio?: string | null
          can_offer?: string[] | null
          city?: string | null
          club_id?: string | null
          company?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          invited_at?: string | null
          last_name?: string
          linkedin_url?: string | null
          looking_for?: string[] | null
          office_address?: string | null
          office_lat?: number | null
          office_lng?: number | null
          phone?: string | null
          role?: string | null
          sector?: string | null
          share_office_location?: boolean
          tags?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          club_id: string | null
          created_at: string
          event_id: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          club_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          club_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      pot_participants: {
        Row: {
          id: string
          joined_at: string
          member_id: string
          pot_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          member_id: string
          pot_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          member_id?: string
          pot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pot_participants_pot_id_fkey"
            columns: ["pot_id"]
            isOneToOne: false
            referencedRelation: "pots"
            referencedColumns: ["id"]
          },
        ]
      }
      pot_payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          member_id: string
          paid_at: string | null
          pot_id: string
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          member_id: string
          paid_at?: string | null
          pot_id: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          member_id?: string
          paid_at?: string | null
          pot_id?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pot_payments_pot_id_fkey"
            columns: ["pot_id"]
            isOneToOne: false
            referencedRelation: "pots"
            referencedColumns: ["id"]
          },
        ]
      }
      pots: {
        Row: {
          club_id: string
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          event_id: string | null
          goal_cents: number
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          event_id?: string | null
          goal_cents: number
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          event_id?: string | null
          goal_cents?: number
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pots_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_permissions: {
        Row: {
          club_id: string
          created_at: string
          id: string
          module: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          module: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          module?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_permissions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_club_id: { Args: never; Returns: string }
      dispatch_event_notifications: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_of_club: { Args: { _club_id: string }; Returns: boolean }
      managed_club_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "superadmin" | "gestionnaire" | "membre"
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
      app_role: ["superadmin", "gestionnaire", "membre"],
    },
  },
} as const
