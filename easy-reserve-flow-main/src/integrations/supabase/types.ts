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
      booking_extras: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          decided_at: string | null
          id: string
          image_paths: string[]
          reason: string
          status: string
          worker_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          decided_at?: string | null
          id?: string
          image_paths?: string[]
          reason: string
          status?: string
          worker_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          image_paths?: string[]
          reason?: string
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_extras_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          address: string
          approved_extras_total: number
          base_price: number
          booking_type: Database["public"]["Enums"]["booking_type"]
          created_at: string
          customer_lat: number | null
          customer_lng: number | null
          id: string
          item_price: number
          items: number
          problem_description: string | null
          service_category: string
          service_category_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          surcharge: number
          total_price: number
          user_id: string
          worker_id: string | null
          worker_lat: number | null
          worker_lng: number | null
          worker_location_updated_at: string | null
        }
        Insert: {
          address: string
          approved_extras_total?: number
          base_price: number
          booking_type?: Database["public"]["Enums"]["booking_type"]
          created_at?: string
          customer_lat?: number | null
          customer_lng?: number | null
          id?: string
          item_price: number
          items: number
          problem_description?: string | null
          service_category: string
          service_category_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          surcharge?: number
          total_price: number
          user_id: string
          worker_id?: string | null
          worker_lat?: number | null
          worker_lng?: number | null
          worker_location_updated_at?: string | null
        }
        Update: {
          address?: string
          approved_extras_total?: number
          base_price?: number
          booking_type?: Database["public"]["Enums"]["booking_type"]
          created_at?: string
          customer_lat?: number | null
          customer_lng?: number | null
          id?: string
          item_price?: number
          items?: number
          problem_description?: string | null
          service_category?: string
          service_category_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          surcharge?: number
          total_price?: number
          user_id?: string
          worker_id?: string | null
          worker_lat?: number | null
          worker_lng?: number | null
          worker_location_updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      worker_categories: {
        Row: {
          category: string
          created_at: string
          id: string
          worker_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          worker_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          worker_id?: string
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
      app_role: "user" | "worker"
      booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "accepted"
        | "in_progress"
      booking_type: "normal" | "emergency"
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
      app_role: ["user", "worker"],
      booking_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "accepted",
        "in_progress",
      ],
      booking_type: ["normal", "emergency"],
    },
  },
} as const
