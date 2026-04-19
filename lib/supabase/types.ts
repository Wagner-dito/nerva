// Types for the public schema.
// Regenerate from Supabase with:
//   npx supabase login
//   npx supabase gen types typescript --project-id jmnziwivxrttxddhjaoj --schema public > lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type OrgPlan = "free" | "starter" | "pro";
type ProfileRole = "owner" | "admin" | "member";
type BotNiche = "imobiliaria" | "contabilidade" | "hospedagem" | "outro";
type ConversationStatus = "active" | "qualified" | "closed" | "abandoned";
type MessageRole = "user" | "assistant" | "system";

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: OrgPlan;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string | null;
          current_period_end: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          plan?: OrgPlan;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
          current_period_end?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          org_id: string;
          role: ProfileRole;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          role?: ProfileRole;
          full_name?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      bots: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          persona: string | null;
          system_prompt: string | null;
          knowledge_base: string | null;
          qualification_questions: Json;
          niche: BotNiche;
          widget_color: string;
          widget_greeting: string | null;
          widget_position: "left" | "right";
          allowed_origins: string[];
          handoff_email: string | null;
          follow_up_enabled: boolean;
          whatsapp_phone_number_id: string | null;
          whatsapp_access_token: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          persona?: string | null;
          system_prompt?: string | null;
          knowledge_base?: string | null;
          qualification_questions?: Json;
          niche?: BotNiche;
          widget_color?: string;
          widget_greeting?: string | null;
          widget_position?: "left" | "right";
          allowed_origins?: string[];
          handoff_email?: string | null;
          follow_up_enabled?: boolean;
          whatsapp_phone_number_id?: string | null;
          whatsapp_access_token?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bots"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "bots_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          bot_id: string;
          visitor_id: string;
          status: ConversationStatus;
          temperature: number;
          lead_data: Json;
          last_message_at: string;
          follow_up_count: number;
          last_follow_up_at: string | null;
          source_url: string | null;
          referrer: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          channel: "web" | "whatsapp" | "instagram";
          created_at: string;
        };
        Insert: {
          id?: string;
          bot_id: string;
          visitor_id: string;
          status?: ConversationStatus;
          temperature?: number;
          lead_data?: Json;
          last_message_at?: string;
          follow_up_count?: number;
          last_follow_up_at?: string | null;
          source_url?: string | null;
          referrer?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          channel?: "web" | "whatsapp" | "instagram";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "conversations_bot_id_fkey";
            columns: ["bot_id"];
            referencedRelation: "bots";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: MessageRole;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: MessageRole;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          role: ProfileRole;
          token: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          email: string;
          role?: ProfileRole;
          token: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invitations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          id: string;
          conversation_id: string;
          name: string | null;
          phone: string | null;
          email: string | null;
          qualification_score: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          qualification_score?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "leads_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_org_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
    Enums: {
      bot_niche: BotNiche;
      org_plan: OrgPlan;
      profile_role: ProfileRole;
      conversation_status: ConversationStatus;
      message_role: MessageRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
