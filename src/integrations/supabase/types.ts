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
      alert_recipients: {
        Row: {
          active: boolean
          block: string
          created_at: string
          designation: string
          district: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          block?: string
          created_at?: string
          designation?: string
          district?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          block?: string
          created_at?: string
          designation?: string
          district?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          block: string
          containment_radius_m: number
          created_at: string
          detail: string
          district: string
          id: string
          lat: number | null
          lon: number | null
          severity: Database["public"]["Enums"]["risk_band"]
          source: string
          status: string
          tag_id: string | null
          title: string
          village: string
        }
        Insert: {
          block?: string
          containment_radius_m?: number
          created_at?: string
          detail?: string
          district?: string
          id?: string
          lat?: number | null
          lon?: number | null
          severity?: Database["public"]["Enums"]["risk_band"]
          source?: string
          status?: string
          tag_id?: string | null
          title: string
          village: string
        }
        Update: {
          block?: string
          containment_radius_m?: number
          created_at?: string
          detail?: string
          district?: string
          id?: string
          lat?: number | null
          lon?: number | null
          severity?: Database["public"]["Enums"]["risk_band"]
          source?: string
          status?: string
          tag_id?: string | null
          title?: string
          village?: string
        }
        Relationships: []
      }
      animals: {
        Row: {
          block: string
          breed: string
          collar_node_id: string | null
          created_at: string
          date_of_birth: string | null
          district: string
          id: string
          lat: number
          lon: number
          owner_name: string
          owner_phone: string | null
          sex: string
          species: string
          tag_id: string
          village: string
        }
        Insert: {
          block: string
          breed: string
          collar_node_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          district: string
          id?: string
          lat: number
          lon: number
          owner_name: string
          owner_phone?: string | null
          sex?: string
          species: string
          tag_id: string
          village: string
        }
        Update: {
          block?: string
          breed?: string
          collar_node_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          district?: string
          id?: string
          lat?: number
          lon?: number
          owner_name?: string
          owner_phone?: string | null
          sex?: string
          species?: string
          tag_id?: string
          village?: string
        }
        Relationships: []
      }
      field_reports: {
        Row: {
          affected_count: number
          block: string
          channel: string
          created_at: string
          district: string
          id: string
          language: string
          lat: number | null
          lon: number | null
          mortality_count: number
          notes: string | null
          reported_by: string | null
          reporter_name: string
          species: string
          status: string
          symptoms: string[]
          tag_id: string | null
          village: string
          voice_transcript: string | null
        }
        Insert: {
          affected_count?: number
          block?: string
          channel?: string
          created_at?: string
          district?: string
          id?: string
          language?: string
          lat?: number | null
          lon?: number | null
          mortality_count?: number
          notes?: string | null
          reported_by?: string | null
          reporter_name?: string
          species?: string
          status?: string
          symptoms?: string[]
          tag_id?: string | null
          village: string
          voice_transcript?: string | null
        }
        Update: {
          affected_count?: number
          block?: string
          channel?: string
          created_at?: string
          district?: string
          id?: string
          language?: string
          lat?: number | null
          lon?: number | null
          mortality_count?: number
          notes?: string | null
          reported_by?: string | null
          reporter_name?: string
          species?: string
          status?: string
          symptoms?: string[]
          tag_id?: string | null
          village?: string
          voice_transcript?: string | null
        }
        Relationships: []
      }
      gateways: {
        Row: {
          block: string
          district: string
          id: string
          label: string
          last_seen_at: string
          lat: number
          lon: number
          node_id: string
          online: boolean
          village: string
        }
        Insert: {
          block: string
          district: string
          id?: string
          label: string
          last_seen_at?: string
          lat: number
          lon: number
          node_id: string
          online?: boolean
          village: string
        }
        Update: {
          block?: string
          district?: string
          id?: string
          label?: string
          last_seen_at?: string
          lat?: number
          lon?: number
          node_id?: string
          online?: boolean
          village?: string
        }
        Relationships: []
      }
      lab_requisitions: {
        Row: {
          alert_id: string | null
          collected_by: string | null
          created_at: string
          findings: string | null
          id: string
          laboratory: string
          pathogen: string | null
          reference: string
          reported_at: string | null
          reported_by: string | null
          result_status: string
          sample_type: string
          scan_token: string
          status: string
          tag_id: string | null
        }
        Insert: {
          alert_id?: string | null
          collected_by?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          laboratory?: string
          pathogen?: string | null
          reference: string
          reported_at?: string | null
          reported_by?: string | null
          result_status?: string
          sample_type: string
          scan_token?: string
          status?: string
          tag_id?: string | null
        }
        Update: {
          alert_id?: string | null
          collected_by?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          laboratory?: string
          pathogen?: string | null
          reference?: string
          reported_at?: string | null
          reported_by?: string | null
          result_status?: string
          sample_type?: string
          scan_token?: string
          status?: string
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_requisitions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          alert_id: string | null
          body: string
          channel: string
          created_at: string
          error: string | null
          id: string
          recipient: string
          report_id: string | null
          status: string
          subject: string
        }
        Insert: {
          alert_id?: string | null
          body?: string
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          recipient: string
          report_id?: string | null
          status?: string
          subject?: string
        }
        Update: {
          alert_id?: string | null
          body?: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          recipient?: string
          report_id?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "field_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          block: string
          created_at: string
          designation: string
          district: string
          full_name: string
          id: string
          language: string
          phone: string | null
        }
        Insert: {
          block?: string
          created_at?: string
          designation?: string
          district?: string
          full_name?: string
          id: string
          language?: string
          phone?: string | null
        }
        Update: {
          block?: string
          created_at?: string
          designation?: string
          district?: string
          full_name?: string
          id?: string
          language?: string
          phone?: string | null
        }
        Relationships: []
      }
      telemetry: {
        Row: {
          band: Database["public"]["Enums"]["risk_band"]
          bdi: number
          heart_rate: number
          id: number
          lat: number | null
          lon: number | null
          node_id: string | null
          recorded_at: string
          speed_kmh: number
          tag_id: string
          temp_c: number
          thi: number | null
          vedba: number
        }
        Insert: {
          band?: Database["public"]["Enums"]["risk_band"]
          bdi?: number
          heart_rate: number
          id?: number
          lat?: number | null
          lon?: number | null
          node_id?: string | null
          recorded_at?: string
          speed_kmh?: number
          tag_id: string
          temp_c: number
          thi?: number | null
          vedba?: number
        }
        Update: {
          band?: Database["public"]["Enums"]["risk_band"]
          bdi?: number
          heart_rate?: number
          id?: number
          lat?: number | null
          lon?: number | null
          node_id?: string | null
          recorded_at?: string
          speed_kmh?: number
          tag_id?: string
          temp_c?: number
          thi?: number | null
          vedba?: number
        }
        Relationships: []
      }
      treatments: {
        Row: {
          attending_vet: string | null
          diagnosis: string
          id: string
          medicine: string | null
          notes: string | null
          tag_id: string
          treated_on: string
        }
        Insert: {
          attending_vet?: string | null
          diagnosis: string
          id?: string
          medicine?: string | null
          notes?: string | null
          tag_id: string
          treated_on: string
        }
        Update: {
          attending_vet?: string | null
          diagnosis?: string
          id?: string
          medicine?: string | null
          notes?: string | null
          tag_id?: string
          treated_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["tag_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vaccinations: {
        Row: {
          administered_by: string | null
          administered_on: string
          batch_no: string | null
          id: string
          next_due_on: string | null
          tag_id: string
          vaccine: string
        }
        Insert: {
          administered_by?: string | null
          administered_on: string
          batch_no?: string | null
          id?: string
          next_due_on?: string | null
          tag_id: string
          vaccine: string
        }
        Update: {
          administered_by?: string | null
          administered_on?: string
          batch_no?: string | null
          id?: string
          next_due_on?: string | null
          tag_id?: string
          vaccine?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccinations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["tag_id"]
          },
        ]
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
      app_role: "district_officer" | "block_vet_officer" | "para_vet" | "farmer"
      risk_band: "low" | "medium" | "critical"
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
      app_role: ["district_officer", "block_vet_officer", "para_vet", "farmer"],
      risk_band: ["low", "medium", "critical"],
    },
  },
} as const
