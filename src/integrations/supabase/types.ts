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
      call_sessions: {
        Row: {
          answer_sdp: string | null
          call_type: string
          callee_heartbeat: string | null
          callee_id: string | null
          callee_name: string | null
          caller_heartbeat: string | null
          caller_id: string
          caller_name: string | null
          conversation_id: string | null
          created_at: string
          ended_at: string | null
          ice_candidates_callee: string | null
          ice_candidates_caller: string | null
          id: string
          offer_sdp: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          answer_sdp?: string | null
          call_type?: string
          callee_heartbeat?: string | null
          callee_id?: string | null
          callee_name?: string | null
          caller_heartbeat?: string | null
          caller_id: string
          caller_name?: string | null
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          ice_candidates_callee?: string | null
          ice_candidates_caller?: string | null
          id?: string
          offer_sdp?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          answer_sdp?: string | null
          call_type?: string
          callee_heartbeat?: string | null
          callee_id?: string | null
          callee_name?: string | null
          caller_heartbeat?: string | null
          caller_id?: string
          caller_name?: string | null
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          ice_candidates_callee?: string | null
          ice_candidates_caller?: string | null
          id?: string
          offer_sdp?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived: boolean
          created_at: string
          created_by: string | null
          group_name: string | null
          id: string
          invite_code: string | null
          invite_open: boolean
          is_group: boolean
          last_message_preview: string | null
          last_message_sender_id: string | null
          last_message_time: string | null
          last_seen: string | null
          muted: boolean
          online_user_ids: string | null
          participant_avatar: string | null
          participant_ids: string[]
          participant_languages: string | null
          participant_name: string | null
          participant_names: string[]
          pinned: boolean
          preferred_language: string | null
          typing_user_ids: string | null
          unread_counts: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          group_name?: string | null
          id?: string
          invite_code?: string | null
          invite_open?: boolean
          is_group?: boolean
          last_message_preview?: string | null
          last_message_sender_id?: string | null
          last_message_time?: string | null
          last_seen?: string | null
          muted?: boolean
          online_user_ids?: string | null
          participant_avatar?: string | null
          participant_ids?: string[]
          participant_languages?: string | null
          participant_name?: string | null
          participant_names?: string[]
          pinned?: boolean
          preferred_language?: string | null
          typing_user_ids?: string | null
          unread_counts?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          group_name?: string | null
          id?: string
          invite_code?: string | null
          invite_open?: boolean
          is_group?: boolean
          last_message_preview?: string | null
          last_message_sender_id?: string | null
          last_message_time?: string | null
          last_seen?: string | null
          muted?: boolean
          online_user_ids?: string | null
          participant_avatar?: string | null
          participant_ids?: string[]
          participant_languages?: string | null
          participant_name?: string | null
          participant_names?: string[]
          pinned?: boolean
          preferred_language?: string | null
          typing_user_ids?: string | null
          unread_counts?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          audio_url: string | null
          content: string | null
          conversation_id: string
          created_at: string
          deleted: boolean
          duration: string | null
          edited: boolean
          expires_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          image_url: string | null
          is_guide: boolean
          original_language: string | null
          reactions: string | null
          read_by: string | null
          reply_to_content: string | null
          reply_to_id: string | null
          reply_to_sender: string | null
          sender_id: string
          sender_name: string | null
          target_language: string | null
          transcript: string | null
          translated_content: string | null
          translated_transcript: string | null
          type: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          deleted?: boolean
          duration?: string | null
          edited?: boolean
          expires_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_guide?: boolean
          original_language?: string | null
          reactions?: string | null
          read_by?: string | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          sender_id: string
          sender_name?: string | null
          target_language?: string | null
          transcript?: string | null
          translated_content?: string | null
          translated_transcript?: string | null
          type?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          deleted?: boolean
          duration?: string | null
          edited?: boolean
          expires_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_guide?: boolean
          original_language?: string | null
          reactions?: string | null
          read_by?: string | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          sender_id?: string
          sender_name?: string | null
          target_language?: string | null
          transcript?: string | null
          translated_content?: string | null
          translated_transcript?: string | null
          type?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_sessions: Json
          avatar_url: string | null
          bio: string | null
          blocked_user_ids: string[]
          created_at: string
          default_language: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active_sessions?: Json
          avatar_url?: string | null
          bio?: string | null
          blocked_user_ids?: string[]
          created_at?: string
          default_language?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          active_sessions?: Json
          avatar_url?: string | null
          bio?: string | null
          blocked_user_ids?: string[]
          created_at?: string
          default_language?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          created_at: string
          id: string
          last_active: string | null
          status: string
          updated_at: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_active?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_active?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      shares_conversation: { Args: { _other: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
