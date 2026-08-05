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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_generation_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          organization_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          organization_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jd_evidence: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          jd_section_id: string
          ncs_competency_unit_id: string | null
          snippet: string | null
          source: Database["public"]["Enums"]["evidence_source"]
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          jd_section_id: string
          ncs_competency_unit_id?: string | null
          snippet?: string | null
          source: Database["public"]["Enums"]["evidence_source"]
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          jd_section_id?: string
          ncs_competency_unit_id?: string | null
          snippet?: string | null
          source?: Database["public"]["Enums"]["evidence_source"]
        }
        Relationships: [
          {
            foreignKeyName: "jd_evidence_jd_section_id_fkey"
            columns: ["jd_section_id"]
            isOneToOne: false
            referencedRelation: "jd_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jd_evidence_ncs_competency_unit_id_fkey"
            columns: ["ncs_competency_unit_id"]
            isOneToOne: false
            referencedRelation: "ncs_competency_units"
            referencedColumns: ["id"]
          },
        ]
      }
      jd_sections: {
        Row: {
          content: string
          created_at: string
          id: string
          jd_version_id: string
          kind: Database["public"]["Enums"]["jd_section_kind"]
          metadata: Json
          position: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          jd_version_id: string
          kind: Database["public"]["Enums"]["jd_section_kind"]
          metadata?: Json
          position?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          jd_version_id?: string
          kind?: Database["public"]["Enums"]["jd_section_kind"]
          metadata?: Json
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "jd_sections_jd_version_id_fkey"
            columns: ["jd_version_id"]
            isOneToOne: false
            referencedRelation: "jd_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      jd_validation_runs: {
        Row: {
          coverage_score: number
          created_at: string
          findings: Json
          id: string
          jd_version_id: string
          model: string
          status: string
          summary: string
        }
        Insert: {
          coverage_score?: number
          created_at?: string
          findings?: Json
          id?: string
          jd_version_id: string
          model?: string
          status: string
          summary: string
        }
        Update: {
          coverage_score?: number
          created_at?: string
          findings?: Json
          id?: string
          jd_version_id?: string
          model?: string
          status?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "jd_validation_runs_jd_version_id_fkey"
            columns: ["jd_version_id"]
            isOneToOne: false
            referencedRelation: "jd_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      jd_versions: {
        Row: {
          created_at: string
          created_by: string | null
          design_snapshot: Json
          id: string
          organization_profile_id: string | null
          revision_kind: string
          source: Database["public"]["Enums"]["evidence_source"]
          status: Database["public"]["Enums"]["jd_status"]
          team_role_id: string
          version_major: number
          version_minor: number
          version_no: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          design_snapshot?: Json
          id?: string
          organization_profile_id?: string | null
          revision_kind?: string
          source?: Database["public"]["Enums"]["evidence_source"]
          status?: Database["public"]["Enums"]["jd_status"]
          team_role_id: string
          version_major?: number
          version_minor?: number
          version_no: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          design_snapshot?: Json
          id?: string
          organization_profile_id?: string | null
          revision_kind?: string
          source?: Database["public"]["Enums"]["evidence_source"]
          status?: Database["public"]["Enums"]["jd_status"]
          team_role_id?: string
          version_major?: number
          version_minor?: number
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "jd_versions_organization_profile_id_fkey"
            columns: ["organization_profile_id"]
            isOneToOne: false
            referencedRelation: "organization_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jd_versions_team_role_id_fkey"
            columns: ["team_role_id"]
            isOneToOne: false
            referencedRelation: "team_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      ncs_competency_units: {
        Row: {
          definition: string | null
          id: string
          lclas_name: string | null
          level: string | null
          mclas_name: string | null
          name: string
          ncs_code: string
          sclas_name: string | null
          subd_name: string | null
          synced_at: string
        }
        Insert: {
          definition?: string | null
          id?: string
          lclas_name?: string | null
          level?: string | null
          mclas_name?: string | null
          name: string
          ncs_code: string
          sclas_name?: string | null
          subd_name?: string | null
          synced_at?: string
        }
        Update: {
          definition?: string | null
          id?: string
          lclas_name?: string | null
          level?: string | null
          mclas_name?: string | null
          name?: string
          ncs_code?: string
          sclas_name?: string | null
          subd_name?: string | null
          synced_at?: string
        }
        Relationships: []
      }
      ncs_qualifications: {
        Row: {
          ablt_unit_typ_nm: string | null
          id: string
          jm_cd: string
          jm_nm: string
          min_edu_trng_tm: number | null
          ncs_competency_unit_id: string | null
          synced_at: string
        }
        Insert: {
          ablt_unit_typ_nm?: string | null
          id?: string
          jm_cd: string
          jm_nm: string
          min_edu_trng_tm?: number | null
          ncs_competency_unit_id?: string | null
          synced_at?: string
        }
        Update: {
          ablt_unit_typ_nm?: string | null
          id?: string
          jm_cd?: string
          jm_nm?: string
          min_edu_trng_tm?: number | null
          ncs_competency_unit_id?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ncs_qualifications_ncs_competency_unit_id_fkey"
            columns: ["ncs_competency_unit_id"]
            isOneToOne: false
            referencedRelation: "ncs_competency_units"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_revoked: boolean
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          model: string
          organization_id: string
          source_ids: string[]
          structured_context: Json
          summary: string
          version_no: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string
          organization_id: string
          source_ids?: string[]
          structured_context?: Json
          summary: string
          version_no: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string
          organization_id?: string
          source_ids?: string[]
          structured_context?: Json
          summary?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_sources: {
        Row: {
          created_at: string
          created_by: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          raw_text: string | null
          source_type: string
          storage_path: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          raw_text?: string | null
          source_type: string
          storage_path?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          raw_text?: string | null
          source_type?: string
          storage_path?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_ncs_mappings: {
        Row: {
          created_at: string
          id: string
          jd_version_id: string
          match_strength: string
          matched_inputs: Json
          model: string
          ncs_competency_unit_id: string
          rationale: string
          status: string
          team_role_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          jd_version_id: string
          match_strength?: string
          matched_inputs?: Json
          model?: string
          ncs_competency_unit_id: string
          rationale: string
          status?: string
          team_role_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          jd_version_id?: string
          match_strength?: string
          matched_inputs?: Json
          model?: string
          ncs_competency_unit_id?: string
          rationale?: string
          status?: string
          team_role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_ncs_mappings_jd_version_id_fkey"
            columns: ["jd_version_id"]
            isOneToOne: false
            referencedRelation: "jd_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_ncs_mappings_ncs_competency_unit_id_fkey"
            columns: ["ncs_competency_unit_id"]
            isOneToOne: false
            referencedRelation: "ncs_competency_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_ncs_mappings_team_role_id_fkey"
            columns: ["team_role_id"]
            isOneToOne: false
            referencedRelation: "team_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_roles: {
        Row: {
          created_at: string
          id: string
          intake: Json
          seniority_hint: string | null
          status: Database["public"]["Enums"]["jd_status"]
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intake?: Json
          seniority_hint?: string | null
          status?: Database["public"]["Enums"]["jd_status"]
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intake?: Json
          seniority_hint?: string | null
          status?: Database["public"]["Enums"]["jd_status"]
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_roles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          charter: Json
          created_at: string
          id: string
          mission: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          charter?: Json
          created_at?: string
          id?: string
          mission?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          charter?: Json
          created_at?: string
          id?: string
          mission?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_jds: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          raw_text: string
          suggestions: Json | null
          team_role_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          raw_text: string
          suggestions?: Json | null
          team_role_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          raw_text?: string
          suggestions?: Json | null
          team_role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_jds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_jds_team_role_id_fkey"
            columns: ["team_role_id"]
            isOneToOne: false
            referencedRelation: "team_roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { invite_token: string }; Returns: string }
      create_invite: {
        Args: {
          expires_in_days?: number
          invite_role?: Database["public"]["Enums"]["org_role"]
          target_org_id: string
        }
        Returns: {
          invite_id: string
          invite_token: string
        }[]
      }
      create_organization_as_admin: {
        Args: { org_name: string; org_slug: string }
        Returns: string
      }
      get_invite_info: {
        Args: { invite_token: string }
        Returns: {
          is_valid: boolean
          organization_name: string
          role: Database["public"]["Enums"]["org_role"]
        }[]
      }
      is_org_admin: { Args: { target_org_id: string }; Returns: boolean }
      is_org_member: { Args: { target_org_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      evidence_source: "ncs" | "user_input" | "uploaded_jd"
      jd_section_kind:
        | "mission"
        | "responsibility"
        | "qualification_required"
        | "qualification_preferred"
        | "kpi"
      jd_status: "draft" | "in_review" | "approved" | "archived"
      org_role: "owner" | "admin" | "member"
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
      evidence_source: ["ncs", "user_input", "uploaded_jd"],
      jd_section_kind: [
        "mission",
        "responsibility",
        "qualification_required",
        "qualification_preferred",
        "kpi",
      ],
      jd_status: ["draft", "in_review", "approved", "archived"],
      org_role: ["owner", "admin", "member"],
    },
  },
} as const
