export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      objects: {
        Row: {
          address: string;
          created_at: string;
          created_by: string;
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          address: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          name: string;
        };
        Update: {
          address?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "objects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
        };
        ComputedFields: never;
        Insert: {
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      task_history: {
        Row: {
          actor_id: string | null;
          comment: string | null;
          created_at: string;
          event: Database["public"]["Enums"]["task_event"];
          from_status: Database["public"]["Enums"]["task_status"] | null;
          id: number;
          object_name: string;
          task_id: string;
          task_title: string;
          to_status: Database["public"]["Enums"]["task_status"] | null;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          comment?: string | null;
          created_at?: string;
          event: Database["public"]["Enums"]["task_event"];
          from_status?: Database["public"]["Enums"]["task_status"] | null;
          id?: never;
          object_name: string;
          task_id: string;
          task_title: string;
          to_status?: Database["public"]["Enums"]["task_status"] | null;
        };
        Update: {
          actor_id?: string | null;
          comment?: string | null;
          created_at?: string;
          event?: Database["public"]["Enums"]["task_event"];
          from_status?: Database["public"]["Enums"]["task_status"] | null;
          id?: never;
          object_name?: string;
          task_id?: string;
          task_title?: string;
          to_status?: Database["public"]["Enums"]["task_status"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "task_history_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_status_transitions: {
        Row: {
          actor_role: Database["public"]["Enums"]["user_role"];
          comment_required: boolean;
          from_status: Database["public"]["Enums"]["task_status"];
          to_status: Database["public"]["Enums"]["task_status"];
        };
        ComputedFields: never;
        Insert: {
          actor_role: Database["public"]["Enums"]["user_role"];
          comment_required?: boolean;
          from_status: Database["public"]["Enums"]["task_status"];
          to_status: Database["public"]["Enums"]["task_status"];
        };
        Update: {
          actor_role?: Database["public"]["Enums"]["user_role"];
          comment_required?: boolean;
          from_status?: Database["public"]["Enums"]["task_status"];
          to_status?: Database["public"]["Enums"]["task_status"];
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          assignee_id: string;
          author_id: string;
          created_at: string;
          description: string;
          id: string;
          object_id: string;
          status: Database["public"]["Enums"]["task_status"];
          title: string;
        };
        ComputedFields: never;
        Insert: {
          assignee_id: string;
          author_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          object_id: string;
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
        };
        Update: {
          assignee_id?: string;
          author_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          object_id?: string;
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_object_id_fkey";
            columns: ["object_id"];
            isOneToOne: false;
            referencedRelation: "objects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      transition_task: {
        Args: {
          p_comment?: string;
          p_task_id: string;
          p_to_status: Database["public"]["Enums"]["task_status"];
        };
        Returns: undefined;
      };
    };
    Enums: {
      task_event: "created" | "status_changed" | "deleted";
      task_status: "new" | "in_progress" | "review" | "accepted" | "rework";
      user_role: "manager" | "executor";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      task_event: ["created", "status_changed", "deleted"],
      task_status: ["new", "in_progress", "review", "accepted", "rework"],
      user_role: ["manager", "executor"],
    },
  },
} as const;
