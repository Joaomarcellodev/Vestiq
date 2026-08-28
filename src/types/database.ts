export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          archived_at: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_networks: {
        Row: {
          created_at: string
          factory_id: string
          id: string
          name: string
          status: Database["public"]["Enums"]["organization_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          factory_id: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          factory_id?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_networks_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          organization_id: string
          product_variant_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["inventory_movement_type"]
        }
        Insert: {
          balance_after: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          organization_id: string
          product_variant_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["inventory_movement_type"]
        }
        Update: {
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          organization_id?: string
          product_variant_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["inventory_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_events: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          negotiation_id: string
          payload: Json | null
          type: Database["public"]["Enums"]["negotiation_event_type"]
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          negotiation_id: string
          payload?: Json | null
          type: Database["public"]["Enums"]["negotiation_event_type"]
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          negotiation_id?: string
          payload?: Json | null
          type?: Database["public"]["Enums"]["negotiation_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_events_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          amount: number
          buyer_org_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          network_id: string
          offer_id: string
          quantity: number
          seller_org_id: string
          status: Database["public"]["Enums"]["negotiation_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_org_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          network_id: string
          offer_id: string
          quantity: number
          seller_org_id: string
          status?: Database["public"]["Enums"]["negotiation_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_org_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          network_id?: string
          offer_id?: string
          quantity?: number
          seller_org_id?: string
          status?: Database["public"]["Enums"]["negotiation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "factory_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_seller_org_id_fkey"
            columns: ["seller_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      network_members: {
        Row: {
          created_at: string
          id: string
          invite_expires_at: string
          invite_token: string
          invited_email: string
          joined_at: string | null
          network_id: string
          reseller_id: string | null
          status: Database["public"]["Enums"]["network_member_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_expires_at?: string
          invite_token?: string
          invited_email: string
          joined_at?: string | null
          network_id: string
          reseller_id?: string | null
          status?: Database["public"]["Enums"]["network_member_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_expires_at?: string
          invite_token?: string
          invited_email?: string
          joined_at?: string | null
          network_id?: string
          reseller_id?: string | null
          status?: Database["public"]["Enums"]["network_member_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_members_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "factory_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_members_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          id: string
          network_id: string
          note: string | null
          organization_id: string
          product_variant_id: string
          quantity_offered: number
          quantity_remaining: number
          status: Database["public"]["Enums"]["offer_status"]
          transfer_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          network_id: string
          note?: string | null
          organization_id: string
          product_variant_id: string
          quantity_offered: number
          quantity_remaining: number
          status?: Database["public"]["Enums"]["offer_status"]
          transfer_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          network_id?: string
          note?: string | null
          organization_id?: string
          product_variant_id?: string
          quantity_offered?: number
          quantity_remaining?: number
          status?: Database["public"]["Enums"]["offer_status"]
          transfer_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "factory_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
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
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["organization_status"]
          type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["organization_status"]
          type: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["organization_status"]
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          archived_at: string | null
          color: string | null
          cost_price: number
          created_at: string
          id: string
          organization_id: string
          product_id: string
          retail_price: number
          size: string | null
          sku: string | null
          stock_on_hand: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          organization_id: string
          product_id: string
          retail_price?: number
          size?: string | null
          sku?: string | null
          stock_on_hand?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          organization_id?: string
          product_id?: string
          retail_price?: number
          size?: string | null
          sku?: string | null
          stock_on_hand?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          brand: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_urls: string[]
          internal_sku: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          internal_sku?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          internal_sku?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          line_total: number
          organization_id: string
          product_variant_id: string
          quantity: number
          sale_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          line_total: number
          organization_id: string
          product_variant_id: string
          quantity: number
          sale_id: string
          unit_price: number
        }
        Update: {
          id?: string
          line_total?: number
          organization_id?: string
          product_variant_id?: string
          quantity?: number
          sale_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          sold_by: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          sold_by?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          organization_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sold_by?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_network_invite: {
        Args: { p_reseller_name?: string; p_token: string }
        Returns: string
      }
      adjust_inventory: {
        Args: { p_delta: number; p_note: string; p_variant_id: string }
        Returns: {
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          organization_id: string
          product_variant_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["inventory_movement_type"]
        }
        SetofOptions: {
          from: "*"
          to: "inventory_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_inventory_movement: {
        Args: {
          p_note: string
          p_quantity: number
          p_reference_id: string
          p_reference_type: string
          p_type: Database["public"]["Enums"]["inventory_movement_type"]
          p_variant_id: string
        }
        Returns: {
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          organization_id: string
          product_variant_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["inventory_movement_type"]
        }
        SetofOptions: {
          from: "*"
          to: "inventory_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auth_network_ids: { Args: never; Returns: string[] }
      auth_org_ids: { Args: never; Returns: string[] }
      can_access_negotiation: { Args: { neg_id: string }; Returns: boolean }
      cancel_sale: {
        Args: { p_reason: string; p_sale_id: string }
        Returns: {
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          sold_by: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_negotiation: {
        Args: { p_negotiation_id: string }
        Returns: {
          amount: number
          buyer_org_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          network_id: string
          offer_id: string
          quantity: number
          seller_org_id: string
          status: Database["public"]["Enums"]["negotiation_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "negotiations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_sale: {
        Args: {
          p_customer_id?: string
          p_discount?: number
          p_items: Json
          p_payment_method: Database["public"]["Enums"]["payment_method"]
        }
        Returns: {
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          sold_by: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_org_role: {
        Args: {
          org: string
          roles: Database["public"]["Enums"]["member_role"][]
        }
        Returns: boolean
      }
      is_org_member: { Args: { org: string }; Returns: boolean }
      negotiation_transition: {
        Args: { p_action: string; p_message?: string; p_negotiation_id: string }
        Returns: {
          amount: number
          buyer_org_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          network_id: string
          offer_id: string
          quantity: number
          seller_org_id: string
          status: Database["public"]["Enums"]["negotiation_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "negotiations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      open_negotiation: {
        Args: {
          p_amount: number
          p_message?: string
          p_offer_id: string
          p_quantity: number
        }
        Returns: {
          amount: number
          buyer_org_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          network_id: string
          offer_id: string
          quantity: number
          seller_org_id: string
          status: Database["public"]["Enums"]["negotiation_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "negotiations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_offer: {
        Args: {
          p_network_id: string
          p_note?: string
          p_quantity: number
          p_transfer_price: number
          p_variant_id: string
        }
        Returns: {
          created_at: string
          id: string
          network_id: string
          note: string | null
          organization_id: string
          product_variant_id: string
          quantity_offered: number
          quantity_remaining: number
          status: Database["public"]["Enums"]["offer_status"]
          transfer_price: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_inventory_entry: {
        Args: { p_note?: string; p_quantity: number; p_variant_id: string }
        Returns: {
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          organization_id: string
          product_variant_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["inventory_movement_type"]
        }
        SetofOptions: {
          from: "*"
          to: "inventory_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      shares_network: {
        Args: { org_a: string; org_b: string }
        Returns: boolean
      }
    }
    Enums: {
      inventory_movement_type:
        | "ENTRADA"
        | "SAIDA"
        | "AJUSTE"
        | "VENDA"
        | "CANCELAMENTO"
        | "TRANSFERENCIA_ENTRADA"
        | "TRANSFERENCIA_SAIDA"
      member_role: "PLATFORM_ADMIN" | "FACTORY_ADMIN" | "RESELLER"
      member_status: "ACTIVE" | "INVITED" | "DISABLED"
      negotiation_event_type:
        | "CREATED"
        | "MESSAGE"
        | "ACCEPTED"
        | "REJECTED"
        | "CANCELLED"
        | "COMPLETED"
      negotiation_status:
        | "PENDING"
        | "ACCEPTED"
        | "REJECTED"
        | "CANCELLED"
        | "COMPLETED"
      network_member_status: "INVITED" | "ACTIVE" | "DISABLED"
      offer_status:
        | "ACTIVE"
        | "PARTIALLY_NEGOTIATED"
        | "FULFILLED"
        | "CANCELLED"
      organization_status: "ACTIVE" | "SUSPENDED"
      organization_type: "FACTORY" | "RESELLER" | "PLATFORM"
      payment_method: "PIX" | "CARTAO" | "DINHEIRO"
      sale_status: "CONFIRMED" | "CANCELLED"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      inventory_movement_type: [
        "ENTRADA",
        "SAIDA",
        "AJUSTE",
        "VENDA",
        "CANCELAMENTO",
        "TRANSFERENCIA_ENTRADA",
        "TRANSFERENCIA_SAIDA",
      ],
      member_role: ["PLATFORM_ADMIN", "FACTORY_ADMIN", "RESELLER"],
      member_status: ["ACTIVE", "INVITED", "DISABLED"],
      negotiation_event_type: [
        "CREATED",
        "MESSAGE",
        "ACCEPTED",
        "REJECTED",
        "CANCELLED",
        "COMPLETED",
      ],
      negotiation_status: [
        "PENDING",
        "ACCEPTED",
        "REJECTED",
        "CANCELLED",
        "COMPLETED",
      ],
      network_member_status: ["INVITED", "ACTIVE", "DISABLED"],
      offer_status: [
        "ACTIVE",
        "PARTIALLY_NEGOTIATED",
        "FULFILLED",
        "CANCELLED",
      ],
      organization_status: ["ACTIVE", "SUSPENDED"],
      organization_type: ["FACTORY", "RESELLER", "PLATFORM"],
      payment_method: ["PIX", "CARTAO", "DINHEIRO"],
      sale_status: ["CONFIRMED", "CANCELLED"],
    },
  },
} as const

