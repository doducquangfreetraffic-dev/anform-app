// Database types — hand-written to mirror supabase/migrations/001_initial.sql
// Regenerate via Supabase CLI when schema changes.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      forms: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          slug: string;
          brief: Json;
          current_html: string | null;
          status: 'draft' | 'deployed' | 'archived';
          deployment_status:
            | 'pending'
            | 'deployed'
            | 'apps_script_failed'
            | 'verify_failed';
          apps_script_id: string | null;
          apps_script_url: string | null;
          sheet_tab_name: string | null;
          form_url: string | null;
          submission_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          slug: string;
          brief?: Json;
          current_html?: string | null;
          status?: 'draft' | 'deployed' | 'archived';
          deployment_status?:
            | 'pending'
            | 'deployed'
            | 'apps_script_failed'
            | 'verify_failed';
          apps_script_id?: string | null;
          apps_script_url?: string | null;
          sheet_tab_name?: string | null;
          form_url?: string | null;
          submission_count?: number;
        };
        Update: Partial<Database['public']['Tables']['forms']['Insert']>;
      };
      form_versions: {
        Row: {
          id: string;
          form_id: string;
          version_number: number;
          brief: Json;
          html: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          version_number: number;
          brief: Json;
          html?: string | null;
        };
        Update: Partial<Database['public']['Tables']['form_versions']['Insert']>;
      };
      submissions: {
        Row: {
          id: string;
          form_id: string;
          data: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          data: Json;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: Partial<Database['public']['Tables']['submissions']['Insert']>;
      };
      deploy_logs: {
        Row: {
          id: string;
          form_id: string | null;
          step: string;
          status: 'success' | 'failed' | 'retrying';
          message: string | null;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          form_id?: string | null;
          step: string;
          status: 'success' | 'failed' | 'retrying';
          message?: string | null;
          payload?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['deploy_logs']['Insert']>;
      };
    };
    Functions: {
      increment_submission_count: {
        Args: { form_id_in: string };
        Returns: void;
      };
    };
  };
}
