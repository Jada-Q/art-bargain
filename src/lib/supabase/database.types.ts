export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      artworks: {
        Row: {
          category: Database['public']['Enums']['artwork_category'];
          category_meta: Json;
          created_at: string;
          description: string;
          id: string;
          image_url: string | null;
          price_floor: number;
          price_start: number;
          seller_agent: Json;
          seller_id: string;
          status: Database['public']['Enums']['artwork_status'];
          thumb_url: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          category: Database['public']['Enums']['artwork_category'];
          category_meta?: Json;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          price_floor: number;
          price_start: number;
          seller_agent?: Json;
          seller_id: string;
          status?: Database['public']['Enums']['artwork_status'];
          thumb_url?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: Database['public']['Enums']['artwork_category'];
          category_meta?: Json;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          price_floor?: number;
          price_start?: number;
          seller_agent?: Json;
          seller_id?: string;
          status?: Database['public']['Enums']['artwork_status'];
          thumb_url?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comparable_sales: {
        Row: {
          category: Database['public']['Enums']['artwork_category'];
          id: string;
          meta: Json;
          notes: string;
          sold_at: string;
          sold_price: number;
        };
        Insert: {
          category: Database['public']['Enums']['artwork_category'];
          id?: string;
          meta?: Json;
          notes?: string;
          sold_at: string;
          sold_price: number;
        };
        Update: {
          category?: Database['public']['Enums']['artwork_category'];
          id?: string;
          meta?: Json;
          notes?: string;
          sold_at?: string;
          sold_price?: number;
        };
        Relationships: [];
      };
      negotiation_turns: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          negotiation_id: string;
          offer_price: number | null;
          reasoning: Json | null;
          speaker: Database['public']['Enums']['turn_speaker'];
          turn_no: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          negotiation_id: string;
          offer_price?: number | null;
          reasoning?: Json | null;
          speaker: Database['public']['Enums']['turn_speaker'];
          turn_no: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          negotiation_id?: string;
          offer_price?: number | null;
          reasoning?: Json | null;
          speaker?: Database['public']['Enums']['turn_speaker'];
          turn_no?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'negotiation_turns_negotiation_id_fkey';
            columns: ['negotiation_id'];
            isOneToOne: false;
            referencedRelation: 'negotiations';
            referencedColumns: ['id'];
          },
        ];
      };
      negotiations: {
        Row: {
          artwork_id: string;
          buyer_agent: Json | null;
          buyer_id: string;
          ended_at: string | null;
          final_price: number | null;
          id: string;
          mode: Database['public']['Enums']['nego_mode'];
          started_at: string;
          status: Database['public']['Enums']['nego_status'];
          turn_count: number;
        };
        Insert: {
          artwork_id: string;
          buyer_agent?: Json | null;
          buyer_id: string;
          ended_at?: string | null;
          final_price?: number | null;
          id?: string;
          mode: Database['public']['Enums']['nego_mode'];
          started_at?: string;
          status?: Database['public']['Enums']['nego_status'];
          turn_count?: number;
        };
        Update: {
          artwork_id?: string;
          buyer_agent?: Json | null;
          buyer_id?: string;
          ended_at?: string | null;
          final_price?: number | null;
          id?: string;
          mode?: Database['public']['Enums']['nego_mode'];
          started_at?: string;
          status?: Database['public']['Enums']['nego_status'];
          turn_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'negotiations_artwork_id_fkey';
            columns: ['artwork_id'];
            isOneToOne: false;
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          agreed_price: number;
          artwork_id: string;
          buyer_id: string;
          created_at: string;
          id: string;
          negotiation_id: string;
          seller_id: string;
          status: Database['public']['Enums']['order_status'];
          stripe_intent: string | null;
          updated_at: string;
        };
        Insert: {
          agreed_price: number;
          artwork_id: string;
          buyer_id: string;
          created_at?: string;
          id?: string;
          negotiation_id: string;
          seller_id: string;
          status?: Database['public']['Enums']['order_status'];
          stripe_intent?: string | null;
          updated_at?: string;
        };
        Update: {
          agreed_price?: number;
          artwork_id?: string;
          buyer_id?: string;
          created_at?: string;
          id?: string;
          negotiation_id?: string;
          seller_id?: string;
          status?: Database['public']['Enums']['order_status'];
          stripe_intent?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_artwork_id_fkey';
            columns: ['artwork_id'];
            isOneToOne: false;
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_negotiation_id_fkey';
            columns: ['negotiation_id'];
            isOneToOne: false;
            referencedRelation: 'negotiations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      artwork_category: 'poster' | 'painting' | 'photography';
      artwork_status: 'draft' | 'live' | 'sold' | 'withdrawn';
      nego_mode: 'human_vs_agent' | 'agent_vs_agent';
      nego_status: 'active' | 'accepted' | 'rejected' | 'stalled' | 'expired';
      order_status: 'pending' | 'paid' | 'cancelled';
      turn_speaker: 'seller_agent' | 'buyer_agent' | 'buyer_human' | 'system';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      artwork_category: ['poster', 'painting', 'photography'],
      artwork_status: ['draft', 'live', 'sold', 'withdrawn'],
      nego_mode: ['human_vs_agent', 'agent_vs_agent'],
      nego_status: ['active', 'accepted', 'rejected', 'stalled', 'expired'],
      order_status: ['pending', 'paid', 'cancelled'],
      turn_speaker: ['seller_agent', 'buyer_agent', 'buyer_human', 'system'],
    },
  },
} as const;
