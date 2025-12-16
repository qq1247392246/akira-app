export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          password_hash: string;
          avatar_url: string | null;
          signature: string | null;
          role: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          display_name: string;
          password_hash: string;
          avatar_url?: string | null;
          signature?: string | null;
          role?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          password_hash?: string;
          avatar_url?: string | null;
          signature?: string | null;
          role?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      registration_requests: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          password_hash: string;
          avatar_url: string | null;
          signature: string | null;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          rejection_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          display_name: string;
          password_hash: string;
          avatar_url?: string | null;
          signature?: string | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          password_hash?: string;
          avatar_url?: string | null;
          signature?: string | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "registration_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      cards: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          type: string;
          target_url: string | null;
          route_path: string | null;
          background_url: string | null;
          order_index: number;
          is_admin_only: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          type?: string;
          target_url?: string | null;
          route_path?: string | null;
          background_url?: string | null;
          order_index?: number;
          is_admin_only?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          type?: string;
          target_url?: string | null;
          route_path?: string | null;
          background_url?: string | null;
          order_index?: number;
          is_admin_only?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cards_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cards_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      card_assets: {
        Row: {
          id: string;
          card_id: string;
          asset_url: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          asset_url: string;
          type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          asset_url?: string;
          type?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "card_assets_card_id_fkey";
            columns: ["card_id"];
            referencedRelation: "cards";
            referencedColumns: ["id"];
          }
        ];
      };
      journal_posts: {
        Row: {
          id: string;
          author_id: string;
          title: string | null;
          content: string;
          visibility: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title?: string | null;
          content: string;
          visibility?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string | null;
          content?: string;
          visibility?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journal_posts_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      journal_media: {
        Row: {
          id: string;
          post_id: string;
          asset_url: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          asset_url: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          asset_url?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journal_media_post_id_fkey";
            columns: ["post_id"];
            referencedRelation: "journal_posts";
            referencedColumns: ["id"];
          }
        ];
      };
      journal_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journal_likes_post_id_fkey";
            columns: ["post_id"];
            referencedRelation: "journal_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_likes_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      journal_comments: {
        Row: {
          id: string;
          post_id: string;
          parent_comment_id: string | null;
          author_id: string;
          target_user_id: string | null;
          content: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          parent_comment_id?: string | null;
          author_id: string;
          target_user_id?: string | null;
          content: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          post_id?: string;
          parent_comment_id?: string | null;
          author_id?: string;
          target_user_id?: string | null;
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "journal_comments_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_comments_parent_comment_id_fkey";
            columns: ["parent_comment_id"];
            referencedRelation: "journal_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_comments_post_id_fkey";
            columns: ["post_id"];
            referencedRelation: "journal_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_comments_target_user_id_fkey";
            columns: ["target_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
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
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
