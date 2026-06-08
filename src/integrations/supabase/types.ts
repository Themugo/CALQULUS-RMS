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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_activations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          admin_level: Database["public"]["Enums"]["admin_level"]
          can_create_webhosts: boolean
          can_manage_billing: boolean
          can_manage_managers: boolean
          can_manage_properties: boolean
          can_view_activity_logs: boolean
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_level?: Database["public"]["Enums"]["admin_level"]
          can_create_webhosts?: boolean
          can_manage_billing?: boolean
          can_manage_managers?: boolean
          can_manage_properties?: boolean
          can_view_activity_logs?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_level?: Database["public"]["Enums"]["admin_level"]
          can_create_webhosts?: boolean
          can_manage_billing?: boolean
          can_manage_managers?: boolean
          can_manage_properties?: boolean
          can_view_activity_logs?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agencies: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          manager_id: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          manager_id?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          manager_id?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bank_details: {
        Row: {
          account_label: string | null
          account_name: string
          account_number: string
          bank_name: string
          branch_name: string | null
          created_at: string
          id: string
          is_default: boolean | null
          manager_id: string
          paybill_number: string | null
          property_id: string | null
          swift_code: string | null
          till_number: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          account_label?: string | null
          account_name: string
          account_number: string
          bank_name: string
          branch_name?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          manager_id: string
          paybill_number?: string | null
          property_id?: string | null
          swift_code?: string | null
          till_number?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          account_label?: string | null
          account_name?: string
          account_number?: string
          bank_name?: string
          branch_name?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          manager_id?: string
          paybill_number?: string | null
          property_id?: string | null
          swift_code?: string | null
          till_number?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_details_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_details_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          manager_user_id: string | null
          phone: string | null
          state: string | null
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          manager_user_id?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          manager_user_id?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          manager_user_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          manager_user_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          manager_user_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_confirmed_at: string | null
          deletion_confirmed_by: string | null
          deletion_reason: string | null
          id: string
          lease_id: string | null
          manager_signature: string | null
          manager_signed_at: string | null
          pending_approval: boolean
          property_id: string | null
          rejection_reason: string | null
          status: string
          template_id: string | null
          tenant_id: string | null
          tenant_ip_address: string | null
          tenant_signature: string | null
          tenant_signed_at: string | null
          title: string
          unit_id: string | null
          updated_at: string
          uploaded_contract_url: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_confirmed_at?: string | null
          deletion_confirmed_by?: string | null
          deletion_reason?: string | null
          id?: string
          lease_id?: string | null
          manager_signature?: string | null
          manager_signed_at?: string | null
          pending_approval?: boolean
          property_id?: string | null
          rejection_reason?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string | null
          tenant_ip_address?: string | null
          tenant_signature?: string | null
          tenant_signed_at?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
          uploaded_contract_url?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_confirmed_at?: string | null
          deletion_confirmed_by?: string | null
          deletion_reason?: string | null
          id?: string
          lease_id?: string | null
          manager_signature?: string | null
          manager_signed_at?: string | null
          pending_approval?: boolean
          property_id?: string | null
          rejection_reason?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string | null
          tenant_ip_address?: string | null
          tenant_signature?: string | null
          tenant_signed_at?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
          uploaded_contract_url?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_deductions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          deduction_type: string
          description: string
          id: string
          maintenance_request_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          deduction_type?: string
          description: string
          id?: string
          maintenance_request_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          deduction_type?: string
          description?: string
          id?: string
          maintenance_request_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_deductions_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_deductions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_refunds: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          final_balance: number
          id: string
          move_out_date: string
          mpesa_number: string | null
          notes: string | null
          original_deposit: number
          processed_at: string | null
          processed_by: string | null
          refund_amount: number
          refund_method: string
          refund_reference: string | null
          status: string
          tenant_id: string
          total_deductions: number
          updated_at: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          final_balance: number
          id?: string
          move_out_date: string
          mpesa_number?: string | null
          notes?: string | null
          original_deposit: number
          processed_at?: string | null
          processed_by?: string | null
          refund_amount: number
          refund_method?: string
          refund_reference?: string | null
          status?: string
          tenant_id: string
          total_deductions?: number
          updated_at?: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          final_balance?: number
          id?: string
          move_out_date?: string
          mpesa_number?: string | null
          notes?: string | null
          original_deposit?: number
          processed_at?: string | null
          processed_by?: string | null
          refund_amount?: number
          refund_method?: string
          refund_reference?: string | null
          status?: string
          tenant_id?: string
          total_deductions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_refunds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenditures: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          manager_id: string
          month: string
          property_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          manager_id: string
          month?: string
          property_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string
          month?: string
          property_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenditures_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string
          id: string
          invoice_number: string
          lease_id: string | null
          manager_id: string | null
          paid_date: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          invoice_number: string
          lease_id?: string | null
          manager_id?: string | null
          paid_date?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          lease_id?: string | null
          manager_id?: string | null
          paid_date?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          created_at: string
          deposit: number | null
          document_url: string | null
          end_date: string
          id: string
          monthly_rent: number
          property: string
          property_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["lease_status"]
          tenant_id: string | null
          terms: string | null
          unit: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit?: number | null
          document_url?: string | null
          end_date: string
          id?: string
          monthly_rent: number
          property: string
          property_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["lease_status"]
          tenant_id?: string | null
          terms?: string | null
          unit: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit?: number | null
          document_url?: string | null
          end_date?: string
          id?: string
          monthly_rent?: number
          property?: string
          property_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["lease_status"]
          tenant_id?: string | null
          terms?: string | null
          unit?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_to: string | null
          budget: number | null
          category: string | null
          completion_date: string | null
          created_at: string
          created_by_role: string | null
          deduct_from_deposit: boolean | null
          deposit_deducted_at: string | null
          deposit_deduction_amount: number | null
          description: string
          expected_completion_date: string | null
          id: string
          manager_id: string | null
          priority: Database["public"]["Enums"]["request_priority"]
          property_name: string
          requested_date: string
          status: Database["public"]["Enums"]["request_status"]
          tenant_email: string
          tenant_name: string
          title: string
          unit_id: string | null
          unit_number: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget?: number | null
          category?: string | null
          completion_date?: string | null
          created_at?: string
          created_by_role?: string | null
          deduct_from_deposit?: boolean | null
          deposit_deducted_at?: string | null
          deposit_deduction_amount?: number | null
          description: string
          expected_completion_date?: string | null
          id?: string
          manager_id?: string | null
          priority?: Database["public"]["Enums"]["request_priority"]
          property_name: string
          requested_date?: string
          status?: Database["public"]["Enums"]["request_status"]
          tenant_email: string
          tenant_name: string
          title: string
          unit_id?: string | null
          unit_number?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget?: number | null
          category?: string | null
          completion_date?: string | null
          created_at?: string
          created_by_role?: string | null
          deduct_from_deposit?: boolean | null
          deposit_deducted_at?: string | null
          deposit_deduction_amount?: number | null
          description?: string
          expected_completion_date?: string | null
          id?: string
          manager_id?: string | null
          priority?: Database["public"]["Enums"]["request_priority"]
          property_name?: string
          requested_date?: string
          status?: Database["public"]["Enums"]["request_status"]
          tenant_email?: string
          tenant_name?: string
          title?: string
          unit_id?: string | null
          unit_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_contracts: {
        Row: {
          contract_type: string | null
          created_at: string
          description: string | null
          id: string
          manager_email: string
          manager_name: string | null
          manager_user_id: string
          parsed_content: Json | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          signature_url: string | null
          signed_at: string | null
          status: string | null
          title: string
          updated_at: string
          uploaded_contract_url: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          contract_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manager_email: string
          manager_name?: string | null
          manager_user_id: string
          parsed_content?: Json | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_url?: string | null
          signed_at?: string | null
          status?: string | null
          title: string
          updated_at?: string
          uploaded_contract_url?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          contract_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manager_email?: string
          manager_name?: string | null
          manager_user_id?: string
          parsed_content?: Json | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_url?: string | null
          signed_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          uploaded_contract_url?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      manager_ewallet_settings: {
        Row: {
          created_at: string
          id: string
          instructions: string | null
          is_enabled: boolean
          manager_user_id: string
          property_id: string | null
          provider: string
          unit_id: string | null
          updated_at: string
          wallet_id: string | null
          wallet_name: string | null
          wallet_phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string | null
          is_enabled?: boolean
          manager_user_id: string
          property_id?: string | null
          provider?: string
          unit_id?: string | null
          updated_at?: string
          wallet_id?: string | null
          wallet_name?: string | null
          wallet_phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string | null
          is_enabled?: boolean
          manager_user_id?: string
          property_id?: string | null
          provider?: string
          unit_id?: string | null
          updated_at?: string
          wallet_id?: string | null
          wallet_name?: string | null
          wallet_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_ewallet_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_ewallet_settings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_invoices: {
        Row: {
          amount: number
          commission_rate: number | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          invoice_number: string
          invoice_type: string | null
          manager_user_id: string
          net_collection: number | null
          paid_date: string | null
          property_count: number | null
          rate_per_property: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          invoice_number: string
          invoice_type?: string | null
          manager_user_id: string
          net_collection?: number | null
          paid_date?: string | null
          property_count?: number | null
          rate_per_property?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          invoice_type?: string | null
          manager_user_id?: string
          net_collection?: number | null
          paid_date?: string | null
          property_count?: number | null
          rate_per_property?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      manager_mpesa_settings: {
        Row: {
          consumer_key: string | null
          consumer_secret: string | null
          created_at: string
          id: string
          is_live: boolean
          manager_user_id: string
          paybill_account_reference: string | null
          paybill_enabled: boolean
          paybill_passkey: string | null
          paybill_shortcode: string | null
          property_id: string | null
          till_enabled: boolean
          till_passkey: string | null
          till_shortcode: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string
          id?: string
          is_live?: boolean
          manager_user_id: string
          paybill_account_reference?: string | null
          paybill_enabled?: boolean
          paybill_passkey?: string | null
          paybill_shortcode?: string | null
          property_id?: string | null
          till_enabled?: boolean
          till_passkey?: string | null
          till_shortcode?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string
          id?: string
          is_live?: boolean
          manager_user_id?: string
          paybill_account_reference?: string | null
          paybill_enabled?: boolean
          paybill_passkey?: string | null
          paybill_shortcode?: string | null
          property_id?: string | null
          till_enabled?: boolean
          till_passkey?: string | null
          till_shortcode?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_mpesa_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_mpesa_settings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_submanagers: {
        Row: {
          created_at: string
          id: string
          manager_id: string
          submanager_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_id: string
          submanager_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_id?: string
          submanager_user_id?: string
        }
        Relationships: []
      }
      manager_subscriptions: {
        Row: {
          amount: number
          created_at: string
          id: string
          manager_user_id: string
          payment_method: string | null
          payment_reference: string | null
          phone_number: string | null
          property_count: number
          status: string
          stripe_subscription_id: string | null
          subscription_end: string | null
          subscription_start: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          manager_user_id: string
          payment_method?: string | null
          payment_reference?: string | null
          phone_number?: string | null
          property_count?: number
          status?: string
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          tier: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          manager_user_id?: string
          payment_method?: string | null
          payment_reference?: string | null
          phone_number?: string | null
          property_count?: number
          status?: string
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_receipts: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          receipt_url: string
          reference_number: string | null
          rejection_reason: string | null
          status: string
          tenant_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date: string
          payment_method: string
          receipt_url: string
          reference_number?: string | null
          rejection_reason?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          receipt_url?: string
          reference_number?: string | null
          rejection_reason?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          callback_secret: string | null
          checkout_request_id: string | null
          completed_at: string | null
          created_at: string
          failure_reason: string | null
          id: string
          initiated_at: string
          invoice_id: string | null
          manager_id: string | null
          merchant_request_id: string | null
          mpesa_receipt_number: string | null
          payment_type: string
          phone_number: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          callback_secret?: string | null
          checkout_request_id?: string | null
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          initiated_at?: string
          invoice_id?: string | null
          manager_id?: string | null
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          payment_type: string
          phone_number: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          callback_secret?: string | null
          checkout_request_id?: string | null
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          initiated_at?: string
          invoice_id?: string | null
          manager_id?: string | null
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          payment_type?: string
          phone_number?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          currency: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          created_at: string
          house_label_prefix: string | null
          house_number: string | null
          id: string
          image_url: string | null
          manager_id: string | null
          name: string
          number_of_floors: number | null
          occupied: number
          payment_details: string | null
          property_type: string | null
          rent_per_house: number | null
          revenue: number
          status: string
          units: number
          updated_at: string
        }
        Insert: {
          address: string
          agency_id?: string | null
          created_at?: string
          house_label_prefix?: string | null
          house_number?: string | null
          id?: string
          image_url?: string | null
          manager_id?: string | null
          name: string
          number_of_floors?: number | null
          occupied?: number
          payment_details?: string | null
          property_type?: string | null
          rent_per_house?: number | null
          revenue?: number
          status?: string
          units?: number
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          house_label_prefix?: string | null
          house_number?: string | null
          id?: string
          image_url?: string | null
          manager_id?: string | null
          name?: string
          number_of_floors?: number | null
          occupied?: number
          payment_details?: string | null
          property_type?: string | null
          rent_per_house?: number | null
          revenue?: number
          status?: string
          units?: number
          updated_at?: string
        }
        Relationships: []
      }
      property_amenity_charges: {
        Row: {
          amount: number
          charge_label: string
          charge_type: string
          created_at: string
          id: string
          is_active: boolean
          manager_id: string
          property_id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          charge_label: string
          charge_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id: string
          property_id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          charge_label?: string
          charge_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id?: string
          property_id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_amenity_charges_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_amenity_charges_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      property_deductions: {
        Row: {
          amount: number
          created_at: string
          deduction_name: string
          deduction_type: string
          id: string
          is_active: boolean
          is_recurring: boolean
          manager_id: string
          property_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          deduction_name: string
          deduction_type?: string
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          manager_id: string
          property_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deduction_name?: string
          deduction_type?: string
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          manager_id?: string
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_deductions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          description: string
          details: Json | null
          id: string
          property_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          description: string
          details?: Json | null
          id?: string
          property_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          description?: string
          details?: Json | null
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receipt_settings: {
        Row: {
          auto_send_receipts: boolean
          created_at: string
          footer_message: string | null
          id: string
          include_logo: boolean | null
          manager_user_id: string
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          auto_send_receipts?: boolean
          created_at?: string
          footer_message?: string | null
          id?: string
          include_logo?: boolean | null
          manager_user_id: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          auto_send_receipts?: boolean
          created_at?: string
          footer_message?: string | null
          id?: string
          include_logo?: boolean | null
          manager_user_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      submanager_permissions: {
        Row: {
          can_view_activity_logs: boolean
          can_view_contracts: boolean
          can_view_invoices: boolean
          can_view_leases: boolean
          can_view_maintenance: boolean
          can_view_properties: boolean
          can_view_tenants: boolean
          created_at: string
          id: string
          manager_id: string
          restrict_to_assigned_properties: boolean | null
          submanager_user_id: string
          updated_at: string
        }
        Insert: {
          can_view_activity_logs?: boolean
          can_view_contracts?: boolean
          can_view_invoices?: boolean
          can_view_leases?: boolean
          can_view_maintenance?: boolean
          can_view_properties?: boolean
          can_view_tenants?: boolean
          created_at?: string
          id?: string
          manager_id: string
          restrict_to_assigned_properties?: boolean | null
          submanager_user_id: string
          updated_at?: string
        }
        Update: {
          can_view_activity_logs?: boolean
          can_view_contracts?: boolean
          can_view_invoices?: boolean
          can_view_leases?: boolean
          can_view_maintenance?: boolean
          can_view_properties?: boolean
          can_view_tenants?: boolean
          created_at?: string
          id?: string
          manager_id?: string
          restrict_to_assigned_properties?: boolean | null
          submanager_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      submanager_property_assignments: {
        Row: {
          created_at: string
          id: string
          manager_id: string
          property_id: string
          submanager_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_id: string
          property_id: string
          submanager_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_id?: string
          property_id?: string
          submanager_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submanager_property_assignments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_history: {
        Row: {
          action: string
          created_at: string
          description: string
          id: string
          tenant_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          id?: string
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          property_id: string | null
          property_name: string
          status: string
          tenant_name: string
          token: string
          unit: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          property_id?: string | null
          property_name: string
          status?: string
          tenant_name: string
          token?: string
          unit?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          property_id?: string | null
          property_name?: string
          status?: string
          tenant_name?: string
          token?: string
          unit?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          account_number: string | null
          created_at: string
          deposit_amount: number | null
          deposit_balance: number | null
          deposit_months: number | null
          email: string
          id: string
          manager_id: string | null
          monthly_rent: number | null
          move_in_date: string | null
          name: string
          other_charges: number | null
          other_charges_description: string | null
          phone: string | null
          photo_url: string | null
          property: string | null
          property_id: string | null
          statement_history_months: number | null
          status: string
          unit: string | null
          unit_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_balance?: number | null
          deposit_months?: number | null
          email: string
          id?: string
          manager_id?: string | null
          monthly_rent?: number | null
          move_in_date?: string | null
          name: string
          other_charges?: number | null
          other_charges_description?: string | null
          phone?: string | null
          photo_url?: string | null
          property?: string | null
          property_id?: string | null
          statement_history_months?: number | null
          status?: string
          unit?: string | null
          unit_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          account_number?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_balance?: number | null
          deposit_months?: number | null
          email?: string
          id?: string
          manager_id?: string | null
          monthly_rent?: number | null
          move_in_date?: string | null
          name?: string
          other_charges?: number | null
          other_charges_description?: string | null
          phone?: string | null
          photo_url?: string | null
          property?: string | null
          property_id?: string | null
          statement_history_months?: number | null
          status?: string
          unit?: string | null
          unit_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_water_config: {
        Row: {
          created_at: string
          flat_rate_override: number | null
          has_meter: boolean
          id: string
          meter_number: string | null
          property_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          flat_rate_override?: number | null
          has_meter?: boolean
          id?: string
          meter_number?: string | null
          property_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          flat_rate_override?: number | null
          has_meter?: boolean
          id?: string
          meter_number?: string | null
          property_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_water_config_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_water_config_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: true
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          description: string | null
          id: string
          monthly_rent: number | null
          property_id: string
          square_feet: number | null
          status: string
          unit_number: string
          updated_at: string
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          description?: string | null
          id?: string
          monthly_rent?: number | null
          property_id: string
          square_feet?: number | null
          status?: string
          unit_number: string
          updated_at?: string
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          description?: string | null
          id?: string
          monthly_rent?: number | null
          property_id?: string
          square_feet?: number | null
          status?: string
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_documents: {
        Row: {
          contract_id: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          manager_id: string
          uploaded_at: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          manager_id: string
          uploaded_at?: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          manager_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          approval_status: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          approval_status?: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          approval_status?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_notices: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          forwarding_address: string | null
          id: string
          intended_move_out_date: string
          manager_id: string | null
          manager_notes: string | null
          notice_date: string
          phone_number: string | null
          property_id: string | null
          property_name: string
          reason: string | null
          status: string
          tenant_email: string
          tenant_id: string
          tenant_name: string
          tenant_signature: string | null
          tenant_signed_at: string | null
          unit_number: string | null
          updated_at: string
          uploaded_document_url: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          forwarding_address?: string | null
          id?: string
          intended_move_out_date: string
          manager_id?: string | null
          manager_notes?: string | null
          notice_date?: string
          phone_number?: string | null
          property_id?: string | null
          property_name: string
          reason?: string | null
          status?: string
          tenant_email: string
          tenant_id: string
          tenant_name: string
          tenant_signature?: string | null
          tenant_signed_at?: string | null
          unit_number?: string | null
          updated_at?: string
          uploaded_document_url?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          forwarding_address?: string | null
          id?: string
          intended_move_out_date?: string
          manager_id?: string | null
          manager_notes?: string | null
          notice_date?: string
          phone_number?: string | null
          property_id?: string | null
          property_name?: string
          reason?: string | null
          status?: string
          tenant_email?: string
          tenant_id?: string
          tenant_name?: string
          tenant_signature?: string | null
          tenant_signed_at?: string | null
          unit_number?: string | null
          updated_at?: string
          uploaded_document_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vacation_notices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_notices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      water_billing_config: {
        Row: {
          billing_cycle_day: number | null
          billing_method: string
          created_at: string
          flat_rate_amount: number | null
          id: string
          invoice_mode: string
          is_active: boolean
          manager_id: string
          meter_number: string | null
          property_id: string
          rate_per_unit: number | null
          updated_at: string
          water_provider: string | null
        }
        Insert: {
          billing_cycle_day?: number | null
          billing_method?: string
          created_at?: string
          flat_rate_amount?: number | null
          id?: string
          invoice_mode?: string
          is_active?: boolean
          manager_id: string
          meter_number?: string | null
          property_id: string
          rate_per_unit?: number | null
          updated_at?: string
          water_provider?: string | null
        }
        Update: {
          billing_cycle_day?: number | null
          billing_method?: string
          created_at?: string
          flat_rate_amount?: number | null
          id?: string
          invoice_mode?: string
          is_active?: boolean
          manager_id?: string
          meter_number?: string | null
          property_id?: string
          rate_per_unit?: number | null
          updated_at?: string
          water_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "water_billing_config_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      water_meter_readings: {
        Row: {
          billing_period_end: string | null
          billing_period_start: string | null
          consumption: number | null
          created_at: string
          current_reading: number
          id: string
          invoice_id: string | null
          manager_id: string
          notes: string | null
          previous_reading: number
          property_id: string
          rate_per_unit: number
          reading_date: string
          status: string
          total_amount: number | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          consumption?: number | null
          created_at?: string
          current_reading?: number
          id?: string
          invoice_id?: string | null
          manager_id: string
          notes?: string | null
          previous_reading?: number
          property_id: string
          rate_per_unit?: number
          reading_date?: string
          status?: string
          total_amount?: number | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          consumption?: number | null
          created_at?: string
          current_reading?: number
          id?: string
          invoice_id?: string | null
          manager_id?: string
          notes?: string | null
          previous_reading?: number
          property_id?: string
          rate_per_unit?: number
          reading_date?: string
          status?: string
          total_amount?: number | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_meter_readings_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_meter_readings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_meter_readings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      webhost_payment_settings: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_swift_code: string | null
          created_at: string
          id: string
          mpesa_paybill_account: string | null
          mpesa_paybill_number: string | null
          mpesa_phone_number: string | null
          mpesa_till_number: string | null
          payment_instructions: string | null
          registration_fee: number
          subscription_rate: number
          updated_at: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          created_at?: string
          id?: string
          mpesa_paybill_account?: string | null
          mpesa_paybill_number?: string | null
          mpesa_phone_number?: string | null
          mpesa_till_number?: string | null
          payment_instructions?: string | null
          registration_fee?: number
          subscription_rate?: number
          updated_at?: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          created_at?: string
          id?: string
          mpesa_paybill_account?: string | null
          mpesa_paybill_number?: string | null
          mpesa_phone_number?: string | null
          mpesa_till_number?: string | null
          payment_instructions?: string | null
          registration_fee?: number
          subscription_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      agency_members: {
        Row: {
          id: string | null
          agency_id: string
          manager_id: string
          member_user_id: string
          role_in_agency: string
          joined_at: string
          is_active: boolean
        }
        Insert: {
          id?: string | null
          agency_id: string
          manager_id: string
          member_user_id: string
          role_in_agency?: string
          joined_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string | null
          agency_id?: string
          manager_id?: string
          member_user_id?: string
          role_in_agency?: string
          joined_at?: string
          is_active?: boolean
        }
      }
      arrears_schedule: {
        Row: {
          id: string | null
          tenant_id: string
          manager_id: string | null
          invoice_id: string | null
          total_owed: number
          instalment_count: number
          instalment_amount: number
          paid_count: number
          total_paid: number
          status: string
          start_date: string
          next_due_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          tenant_id: string
          manager_id?: string | null
          invoice_id?: string | null
          total_owed: number
          instalment_count: number
          instalment_amount: number
          paid_count?: number
          total_paid?: number
          status?: string
          start_date?: string
          next_due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          tenant_id?: string
          manager_id?: string | null
          invoice_id?: string | null
          total_owed?: number
          instalment_count?: number
          instalment_amount?: number
          paid_count?: number
          total_paid?: number
          status?: string
          start_date?: string
          next_due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bank_integration_settings: {
        Row: {
          id: string | null
          manager_id: string
          property_id: string | null
          bank_name: string
          account_number: string | null
          account_name: string | null
          paybill_number: string | null
          bank_code: string | null
          branch_code: string | null
          api_key_encrypted: string | null
          webhook_secret: string | null
          is_active: boolean
          auto_reconcile: boolean
          match_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          manager_id: string
          property_id?: string | null
          bank_name: string
          account_number?: string | null
          account_name?: string | null
          paybill_number?: string | null
          bank_code?: string | null
          branch_code?: string | null
          api_key_encrypted?: string | null
          webhook_secret?: string | null
          is_active?: boolean
          auto_reconcile?: boolean
          match_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          manager_id?: string
          property_id?: string | null
          bank_name?: string
          account_number?: string | null
          account_name?: string | null
          paybill_number?: string | null
          bank_code?: string | null
          branch_code?: string | null
          api_key_encrypted?: string | null
          webhook_secret?: string | null
          is_active?: boolean
          auto_reconcile?: boolean
          match_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      bank_transactions: {
        Row: {
          id: string | null
          manager_id: string
          bank_integration_id: string | null
          external_id: string | null
          reference: string | null
          description: string | null
          amount: number
          transaction_date: string
          bank_name: string | null
          account_number: string | null
          payer_name: string | null
          payer_phone: string | null
          matched: boolean
          matched_invoice_id: string | null
          matched_tenant_id: string | null
          match_confidence: number | null
          match_method: string | null
          source: string
          raw_payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string | null
          manager_id: string
          bank_integration_id?: string | null
          external_id?: string | null
          reference?: string | null
          description?: string | null
          amount: number
          transaction_date: string
          bank_name?: string | null
          account_number?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          matched?: boolean
          matched_invoice_id?: string | null
          matched_tenant_id?: string | null
          match_confidence?: number | null
          match_method?: string | null
          source?: string
          raw_payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: string | null
          manager_id?: string
          bank_integration_id?: string | null
          external_id?: string | null
          reference?: string | null
          description?: string | null
          amount?: number
          transaction_date?: string
          bank_name?: string | null
          account_number?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          matched?: boolean
          matched_invoice_id?: string | null
          matched_tenant_id?: string | null
          match_confidence?: number | null
          match_method?: string | null
          source?: string
          raw_payload?: Json | null
          created_at?: string
        }
      }
      broadcast_campaigns: {
        Row: {
          id: string | null
          manager_id: string
          property_id: string | null
          name: string
          subject: string | null
          body: string
          message_type: string
          audience_type: string
          audience_filter: Json | null
          send_sms: boolean | null
          send_email: boolean | null
          send_whatsapp: boolean | null
          send_push: boolean | null
          send_app: boolean | null
          total_recipients: number | null
          sms_sent: number | null
          sms_failed: number | null
          email_sent: number | null
          email_failed: number | null
          whatsapp_sent: number | null
          push_sent: number | null
          status: string
          scheduled_at: string | null
          sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          manager_id: string
          property_id?: string | null
          name: string
          subject?: string | null
          body: string
          message_type?: string
          audience_type?: string
          audience_filter?: Json | null
          send_sms?: boolean | null
          send_email?: boolean | null
          send_whatsapp?: boolean | null
          send_push?: boolean | null
          send_app?: boolean | null
          total_recipients?: number | null
          sms_sent?: number | null
          sms_failed?: number | null
          email_sent?: number | null
          email_failed?: number | null
          whatsapp_sent?: number | null
          push_sent?: number | null
          status?: string
          scheduled_at?: string | null
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          manager_id?: string
          property_id?: string | null
          name?: string
          subject?: string | null
          body?: string
          message_type?: string
          audience_type?: string
          audience_filter?: Json | null
          send_sms?: boolean | null
          send_email?: boolean | null
          send_whatsapp?: boolean | null
          send_push?: boolean | null
          send_app?: boolean | null
          total_recipients?: number | null
          sms_sent?: number | null
          sms_failed?: number | null
          email_sent?: number | null
          email_failed?: number | null
          whatsapp_sent?: number | null
          push_sent?: number | null
          status?: string
          scheduled_at?: string | null
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      in_app_notifications: {
        Row: {
          id: string | null
          user_id: string
          manager_id: string | null
          title: string
          body: string
          type: string
          action_url: string | null
          action_label: string | null
          reference_id: string | null
          reference_type: string | null
          is_read: boolean
          read_at: string | null
          is_dismissed: boolean
          dismissed_at: string | null
          source: string | null
          priority: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string | null
          user_id: string
          manager_id?: string | null
          title: string
          body: string
          type?: string
          action_url?: string | null
          action_label?: string | null
          reference_id?: string | null
          reference_type?: string | null
          is_read?: boolean
          read_at?: string | null
          is_dismissed?: boolean
          dismissed_at?: string | null
          source?: string | null
          priority?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          user_id?: string
          manager_id?: string | null
          title?: string
          body?: string
          type?: string
          action_url?: string | null
          action_label?: string | null
          reference_id?: string | null
          reference_type?: string | null
          is_read?: boolean
          read_at?: string | null
          is_dismissed?: boolean
          dismissed_at?: string | null
          source?: string | null
          priority?: string | null
          expires_at?: string | null
          created_at?: string
        }
      }
      kenya_water_companies: {
        Row: {
          id: string | null
          county: string
          county_code: number
          company_name: string
          short_code: string
          paybill_number: string | null
          domestic_rate: number | null
          min_charge: number | null
          standing_charge: number | null
          sewerage_pct: number | null
          block_tariff: Json | null
          website: string | null
          phone: string | null
          active: boolean | null
        }
        Insert: {
          id?: string | null
          county: string
          county_code: number
          company_name: string
          short_code: string
          paybill_number?: string | null
          domestic_rate?: number | null
          min_charge?: number | null
          standing_charge?: number | null
          sewerage_pct?: number | null
          block_tariff?: Json | null
          website?: string | null
          phone?: string | null
          active?: boolean | null
        }
        Update: {
          id?: string | null
          county?: string
          county_code?: number
          company_name?: string
          short_code?: string
          paybill_number?: string | null
          domestic_rate?: number | null
          min_charge?: number | null
          standing_charge?: number | null
          sewerage_pct?: number | null
          block_tariff?: Json | null
          website?: string | null
          phone?: string | null
          active?: boolean | null
        }
      }
      landlord_bank_details: {
        Row: {
          id: string | null
          landlord_user_id: string
          mpesa_number: string | null
          mpesa_name: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_account_name: string | null
          bank_branch: string | null
          bank_code: string | null
          swift_code: string | null
          preferred_method: string
          minimum_payout: number | null
          auto_request: boolean | null
          auto_request_day: number | null
          kra_pin: string | null
          vat_registered: boolean | null
          vat_number: string | null
          verified: boolean | null
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          landlord_user_id: string
          mpesa_number?: string | null
          mpesa_name?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          swift_code?: string | null
          preferred_method?: string
          minimum_payout?: number | null
          auto_request?: boolean | null
          auto_request_day?: number | null
          kra_pin?: string | null
          vat_registered?: boolean | null
          vat_number?: string | null
          verified?: boolean | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          landlord_user_id?: string
          mpesa_number?: string | null
          mpesa_name?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          swift_code?: string | null
          preferred_method?: string
          minimum_payout?: number | null
          auto_request?: boolean | null
          auto_request_day?: number | null
          kra_pin?: string | null
          vat_registered?: boolean | null
          vat_number?: string | null
          verified?: boolean | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      landlord_documents: {
        Row: {
          id: string | null
          landlord_user_id: string
          manager_id: string | null
          property_id: string | null
          unit_id: string | null
          document_type: string
          title: string
          description: string | null
          document_url: string | null
          period_start: string | null
          period_end: string | null
          is_visible: boolean | null
          created_at: string
        }
        Insert: {
          id?: string | null
          landlord_user_id: string
          manager_id?: string | null
          property_id?: string | null
          unit_id?: string | null
          document_type: string
          title: string
          description?: string | null
          document_url?: string | null
          period_start?: string | null
          period_end?: string | null
          is_visible?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string | null
          landlord_user_id?: string
          manager_id?: string | null
          property_id?: string | null
          unit_id?: string | null
          document_type?: string
          title?: string
          description?: string | null
          document_url?: string | null
          period_start?: string | null
          period_end?: string | null
          is_visible?: boolean | null
          created_at?: string
        }
      }
      landlord_invitations: {
        Row: {
          id: string | null
          property_id: string
          manager_id: string
          email: string
          token: string
          status: string
          expires_at: string
          created_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string | null
          property_id: string
          manager_id: string
          email: string
          token?: string
          status?: string
          expires_at?: string
          created_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string | null
          property_id?: string
          manager_id?: string
          email?: string
          token?: string
          status?: string
          expires_at?: string
          created_at?: string
          accepted_at?: string | null
        }
      }
      landlord_invoices: {
        Row: {
          id: string | null
          landlord_user_id: string
          webhost_user_id: string | null
          invoice_number: string
          invoice_type: string
          amount: number
          description: string | null
          status: string
          due_date: string
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          period_start: string | null
          period_end: string | null
          manager_user_id: string | null
          property_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          landlord_user_id: string
          webhost_user_id?: string | null
          invoice_number: string
          invoice_type?: string
          amount: number
          description?: string | null
          status?: string
          due_date: string
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_start?: string | null
          period_end?: string | null
          manager_user_id?: string | null
          property_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          landlord_user_id?: string
          webhost_user_id?: string | null
          invoice_number?: string
          invoice_type?: string
          amount?: number
          description?: string | null
          status?: string
          due_date?: string
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_start?: string | null
          period_end?: string | null
          manager_user_id?: string | null
          property_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      landlord_messages: {
        Row: {
          id: string | null
          property_id: string | null
          sender_id: string
          sender_role: string
          recipient_id: string
          subject: string | null
          body: string
          is_read: boolean | null
          read_at: string | null
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string | null
          property_id?: string | null
          sender_id: string
          sender_role: string
          recipient_id: string
          subject?: string | null
          body: string
          is_read?: boolean | null
          read_at?: string | null
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          property_id?: string | null
          sender_id?: string
          sender_role?: string
          recipient_id?: string
          subject?: string | null
          body?: string
          is_read?: boolean | null
          read_at?: string | null
          parent_id?: string | null
          created_at?: string
        }
      }
      landlord_notification_preferences: {
        Row: {
          id: string | null
          landlord_user_id: string
          email_enabled: boolean | null
          sms_enabled: boolean | null
          whatsapp_enabled: boolean | null
          payout_approved: boolean | null
          payout_paid: boolean | null
          monthly_statement: boolean | null
          new_tenant_moved_in: boolean | null
          tenant_moved_out: boolean | null
          maintenance_completed: boolean | null
          vacancy_alert: boolean | null
          arrears_alert: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          landlord_user_id: string
          email_enabled?: boolean | null
          sms_enabled?: boolean | null
          whatsapp_enabled?: boolean | null
          payout_approved?: boolean | null
          payout_paid?: boolean | null
          monthly_statement?: boolean | null
          new_tenant_moved_in?: boolean | null
          tenant_moved_out?: boolean | null
          maintenance_completed?: boolean | null
          vacancy_alert?: boolean | null
          arrears_alert?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          landlord_user_id?: string
          email_enabled?: boolean | null
          sms_enabled?: boolean | null
          whatsapp_enabled?: boolean | null
          payout_approved?: boolean | null
          payout_paid?: boolean | null
          monthly_statement?: boolean | null
          new_tenant_moved_in?: boolean | null
          tenant_moved_out?: boolean | null
          maintenance_completed?: boolean | null
          vacancy_alert?: boolean | null
          arrears_alert?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      manager_profiles: {
        Row: {
          id: string | null
          manager_user_id: string
          agency_id: string | null
          status: string
          approval_notes: string | null
          rejection_reason: string | null
          suspension_reason: string | null
          suspended_at: string | null
          suspended_by: string | null
          approved_at: string | null
          approved_by: string | null
          subscription_tier: string
          max_properties: number
          max_units: number
          billing_day: number
          platform_rate: number
          billing_method: string
          property_count: number
          unit_count: number
          tenant_count: number
          last_active_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          manager_user_id: string
          agency_id?: string | null
          status?: string
          approval_notes?: string | null
          rejection_reason?: string | null
          suspension_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          subscription_tier?: string
          max_properties?: number
          max_units?: number
          billing_day?: number
          platform_rate?: number
          billing_method?: string
          property_count?: number
          unit_count?: number
          tenant_count?: number
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          manager_user_id?: string
          agency_id?: string | null
          status?: string
          approval_notes?: string | null
          rejection_reason?: string | null
          suspension_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          subscription_tier?: string
          max_properties?: number
          max_units?: number
          billing_day?: number
          platform_rate?: number
          billing_method?: string
          property_count?: number
          unit_count?: number
          tenant_count?: number
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      manager_status_log: {
        Row: {
          id: string | null
          manager_user_id: string
          changed_by: string | null
          changed_by_role: string | null
          old_status: string | null
          new_status: string
          reason: string | null
          internal_note: string | null
          notify_manager: boolean | null
          created_at: string
        }
        Insert: {
          id?: string | null
          manager_user_id: string
          changed_by?: string | null
          changed_by_role?: string | null
          old_status?: string | null
          new_status: string
          reason?: string | null
          internal_note?: string | null
          notify_manager?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string | null
          manager_user_id?: string
          changed_by?: string | null
          changed_by_role?: string | null
          old_status?: string | null
          new_status?: string
          reason?: string | null
          internal_note?: string | null
          notify_manager?: boolean | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string | null
          manager_id: string | null
          property_id: string | null
          unit_id: string | null
          sender_id: string
          sender_role: string
          recipient_type: string
          recipient_id: string | null
          tenant_id: string | null
          subject: string | null
          body: string
          message_type: string
          sent_via_sms: boolean | null
          sent_via_email: boolean | null
          sent_via_whatsapp: boolean | null
          sent_via_push: boolean | null
          sent_via_app: boolean | null
          sms_status: string | null
          email_status: string | null
          whatsapp_status: string | null
          push_status: string | null
          is_read: boolean | null
          read_at: string | null
          parent_message_id: string | null
          campaign_id: string | null
          attachments: string | null
          metadata: Json | null
          scheduled_at: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string | null
          manager_id?: string | null
          property_id?: string | null
          unit_id?: string | null
          sender_id: string
          sender_role?: string
          recipient_type?: string
          recipient_id?: string | null
          tenant_id?: string | null
          subject?: string | null
          body: string
          message_type?: string
          sent_via_sms?: boolean | null
          sent_via_email?: boolean | null
          sent_via_whatsapp?: boolean | null
          sent_via_push?: boolean | null
          sent_via_app?: boolean | null
          sms_status?: string | null
          email_status?: string | null
          whatsapp_status?: string | null
          push_status?: string | null
          is_read?: boolean | null
          read_at?: string | null
          parent_message_id?: string | null
          campaign_id?: string | null
          attachments?: string | null
          metadata?: Json | null
          scheduled_at?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          manager_id?: string | null
          property_id?: string | null
          unit_id?: string | null
          sender_id?: string
          sender_role?: string
          recipient_type?: string
          recipient_id?: string | null
          tenant_id?: string | null
          subject?: string | null
          body?: string
          message_type?: string
          sent_via_sms?: boolean | null
          sent_via_email?: boolean | null
          sent_via_whatsapp?: boolean | null
          sent_via_push?: boolean | null
          sent_via_app?: boolean | null
          sms_status?: string | null
          email_status?: string | null
          whatsapp_status?: string | null
          push_status?: string | null
          is_read?: boolean | null
          read_at?: string | null
          parent_message_id?: string | null
          campaign_id?: string | null
          attachments?: string | null
          metadata?: Json | null
          scheduled_at?: string | null
          sent_at?: string | null
          created_at?: string
        }
      }
      move_condition_photos: {
        Row: {
          id: string | null
          user_id: string
          tenant_id: string | null
          phase: string
          room: string | null
          photo_url: string
          description: string | null
          condition_rating: string | null
          taken_at: string
          location_note: string | null
          is_disputed: boolean | null
          dispute_note: string | null
          created_at: string
        }
        Insert: {
          id?: string | null
          user_id: string
          tenant_id?: string | null
          phase?: string
          room?: string | null
          photo_url: string
          description?: string | null
          condition_rating?: string | null
          taken_at?: string
          location_note?: string | null
          is_disputed?: boolean | null
          dispute_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          user_id?: string
          tenant_id?: string | null
          phase?: string
          room?: string | null
          photo_url?: string
          description?: string | null
          condition_rating?: string | null
          taken_at?: string
          location_note?: string | null
          is_disputed?: boolean | null
          dispute_note?: string | null
          created_at?: string
        }
      }
      orphan_payment_entries: {
        Row: {
          id: string | null
          user_id: string
          record_id: string | null
          payment_date: string
          amount: number
          payment_method: string | null
          reference: string | null
          description: string | null
          receipt_photo: string | null
          is_confirmed: boolean | null
          created_at: string
        }
        Insert: {
          id?: string | null
          user_id: string
          record_id?: string | null
          payment_date?: string
          amount: number
          payment_method?: string | null
          reference?: string | null
          description?: string | null
          receipt_photo?: string | null
          is_confirmed?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string | null
          user_id?: string
          record_id?: string | null
          payment_date?: string
          amount?: number
          payment_method?: string | null
          reference?: string | null
          description?: string | null
          receipt_photo?: string | null
          is_confirmed?: boolean | null
          created_at?: string
        }
      }
      orphan_tenant_records: {
        Row: {
          id: string | null
          user_id: string
          property_name: string | null
          unit_label: string | null
          landlord_name: string | null
          landlord_phone: string | null
          county: string | null
          address: string | null
          move_in_date: string | null
          monthly_rent: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          user_id: string
          property_name?: string | null
          unit_label?: string | null
          landlord_name?: string | null
          landlord_phone?: string | null
          county?: string | null
          address?: string | null
          move_in_date?: string | null
          monthly_rent?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          user_id?: string
          property_name?: string | null
          unit_label?: string | null
          landlord_name?: string | null
          landlord_phone?: string | null
          county?: string | null
          address?: string | null
          move_in_date?: string | null
          monthly_rent?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      payment_payers: {
        Row: {
          id: string | null
          tenant_id: string
          manager_id: string | null
          property_id: string | null
          unit_id: string | null
          payer_type: string
          payer_name: string | null
          payer_email: string | null
          payer_phone: string | null
          payer_organisation: string | null
          payer_address: string | null
          national_id: string | null
          pays_amount: number | null
          pays_percentage: number | null
          payment_day: number | null
          preferred_method: string | null
          mpesa_number: string | null
          bank_account: string | null
          bank_name: string | null
          standing_order_ref: string | null
          letter_of_undertaking_url: string | null
          contract_url: string | null
          is_active: boolean
          start_date: string | null
          end_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          tenant_id: string
          manager_id?: string | null
          property_id?: string | null
          unit_id?: string | null
          payer_type?: string
          payer_name?: string | null
          payer_email?: string | null
          payer_phone?: string | null
          payer_organisation?: string | null
          payer_address?: string | null
          national_id?: string | null
          pays_amount?: number | null
          pays_percentage?: number | null
          payment_day?: number | null
          preferred_method?: string | null
          mpesa_number?: string | null
          bank_account?: string | null
          bank_name?: string | null
          standing_order_ref?: string | null
          letter_of_undertaking_url?: string | null
          contract_url?: string | null
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          tenant_id?: string
          manager_id?: string | null
          property_id?: string | null
          unit_id?: string | null
          payer_type?: string
          payer_name?: string | null
          payer_email?: string | null
          payer_phone?: string | null
          payer_organisation?: string | null
          payer_address?: string | null
          national_id?: string | null
          pays_amount?: number | null
          pays_percentage?: number | null
          payment_day?: number | null
          preferred_method?: string | null
          mpesa_number?: string | null
          bank_account?: string | null
          bank_name?: string | null
          standing_order_ref?: string | null
          letter_of_undertaking_url?: string | null
          contract_url?: string | null
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payout_requests: {
        Row: {
          id: string | null
          property_id: string
          landlord_user_id: string
          manager_id: string | null
          amount: number
          period_start: string
          period_end: string
          notes: string | null
          status: string
          approved_at: string | null
          approved_by: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          property_id: string
          landlord_user_id: string
          manager_id?: string | null
          amount: number
          period_start: string
          period_end: string
          notes?: string | null
          status?: string
          approved_at?: string | null
          approved_by?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          property_id?: string
          landlord_user_id?: string
          manager_id?: string | null
          amount?: number
          period_start?: string
          period_end?: string
          notes?: string | null
          status?: string
          approved_at?: string | null
          approved_by?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      physical_invoices: {
        Row: {
          id: string | null
          manager_id: string
          tenant_id: string | null
          unit_id: string | null
          property_id: string | null
          invoice_number: string
          invoice_date: string
          due_date: string | null
          description: string
          amount: number
          tax_amount: number | null
          total_amount: number
          line_items: Json | null
          status: string
          paid_amount: number | null
          paid_date: string | null
          document_url: string | null
          notes: string | null
          linked_invoice_id: string | null
          recorded_by: string | null
          entered_at: string
          created_at: string
        }
        Insert: {
          id?: string | null
          manager_id: string
          tenant_id?: string | null
          unit_id?: string | null
          property_id?: string | null
          invoice_number: string
          invoice_date?: string
          due_date?: string | null
          description: string
          amount: number
          tax_amount?: number | null
          total_amount: number
          line_items?: Json | null
          status?: string
          paid_amount?: number | null
          paid_date?: string | null
          document_url?: string | null
          notes?: string | null
          linked_invoice_id?: string | null
          recorded_by?: string | null
          entered_at?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          manager_id?: string
          tenant_id?: string | null
          unit_id?: string | null
          property_id?: string | null
          invoice_number?: string
          invoice_date?: string
          due_date?: string | null
          description?: string
          amount?: number
          tax_amount?: number | null
          total_amount?: number
          line_items?: Json | null
          status?: string
          paid_amount?: number | null
          paid_date?: string | null
          document_url?: string | null
          notes?: string | null
          linked_invoice_id?: string | null
          recorded_by?: string | null
          entered_at?: string
          created_at?: string
        }
      }
      physical_receipts: {
        Row: {
          id: string | null
          manager_id: string
          tenant_id: string | null
          unit_id: string | null
          property_id: string | null
          receipt_number: string
          receipt_date: string
          amount: number
          payment_method: string
          reference: string | null
          description: string
          received_by: string | null
          line_items: Json | null
          document_url: string | null
          linked_transaction_id: string | null
          linked_invoice_id: string | null
          digital_receipt_sent: boolean | null
          digital_sent_at: string | null
          sent_via: string | null
          notes: string | null
          recorded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string | null
          manager_id: string
          tenant_id?: string | null
          unit_id?: string | null
          property_id?: string | null
          receipt_number: string
          receipt_date?: string
          amount: number
          payment_method?: string
          reference?: string | null
          description: string
          received_by?: string | null
          line_items?: Json | null
          document_url?: string | null
          linked_transaction_id?: string | null
          linked_invoice_id?: string | null
          digital_receipt_sent?: boolean | null
          digital_sent_at?: string | null
          sent_via?: string | null
          notes?: string | null
          recorded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          manager_id?: string
          tenant_id?: string | null
          unit_id?: string | null
          property_id?: string | null
          receipt_number?: string
          receipt_date?: string
          amount?: number
          payment_method?: string
          reference?: string | null
          description?: string
          received_by?: string | null
          line_items?: Json | null
          document_url?: string | null
          linked_transaction_id?: string | null
          linked_invoice_id?: string | null
          digital_receipt_sent?: boolean | null
          digital_sent_at?: string | null
          sent_via?: string | null
          notes?: string | null
          recorded_by?: string | null
          created_at?: string
        }
      }
      property_billing_config: {
        Row: {
          id: string | null
          property_id: string
          manager_id: string
          invoice_mode: string
          due_day_of_month: number
          grace_period_days: number
          late_penalty_enabled: boolean
          late_penalty_type: string | null
          late_penalty_amount: number | null
          late_penalty_pct: number | null
          auto_generate_monthly: boolean
          auto_generate_day: number
          notify_before_days: number
          invoice_prefix: string
          receipt_prefix: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          property_id: string
          manager_id: string
          invoice_mode?: string
          due_day_of_month?: number
          grace_period_days?: number
          late_penalty_enabled?: boolean
          late_penalty_type?: string | null
          late_penalty_amount?: number | null
          late_penalty_pct?: number | null
          auto_generate_monthly?: boolean
          auto_generate_day?: number
          notify_before_days?: number
          invoice_prefix?: string
          receipt_prefix?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          property_id?: string
          manager_id?: string
          invoice_mode?: string
          due_day_of_month?: number
          grace_period_days?: number
          late_penalty_enabled?: boolean
          late_penalty_type?: string | null
          late_penalty_amount?: number | null
          late_penalty_pct?: number | null
          auto_generate_monthly?: boolean
          auto_generate_day?: number
          notify_before_days?: number
          invoice_prefix?: string
          receipt_prefix?: string
          created_at?: string
          updated_at?: string
        }
      }
      property_categories: {
        Row: {
          id: string | null
          key: string
          name: string
          description: string | null
          icon: string | null
          color: string | null
          billing_multiplier: number
          requires_tier: string | null
          is_active: boolean
          display_order: number
        }
        Insert: {
          id?: string | null
          key: string
          name: string
          description?: string | null
          icon?: string | null
          color?: string | null
          billing_multiplier?: number
          requires_tier?: string | null
          is_active?: boolean
          display_order?: number
        }
        Update: {
          id?: string | null
          key?: string
          name?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          billing_multiplier?: number
          requires_tier?: string | null
          is_active?: boolean
          display_order?: number
        }
      }
      property_landlords: {
        Row: {
          id: string | null
          property_id: string
          landlord_user_id: string
          manager_id: string | null
          revenue_share_pct: number
          notes: string | null
          assigned_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          property_id: string
          landlord_user_id: string
          manager_id?: string | null
          revenue_share_pct?: number
          notes?: string | null
          assigned_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          property_id?: string
          landlord_user_id?: string
          manager_id?: string | null
          revenue_share_pct?: number
          notes?: string | null
          assigned_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      property_tier_limits: {
        Row: {
          id: string | null
          tier_key: string
          category_group: string
          max_properties: number
          price_multiplier: number
        }
        Insert: {
          id?: string | null
          tier_key: string
          category_group: string
          max_properties?: number
          price_multiplier?: number
        }
        Update: {
          id?: string | null
          tier_key?: string
          category_group?: string
          max_properties?: number
          price_multiplier?: number
        }
      }
      provider_services: {
        Row: {
          id: string | null
          provider_id: string
          category_key: string
          rate_type: string
          rate_min: number | null
          rate_max: number | null
          currency: string | null
          rate_notes: string | null
          is_active: boolean
        }
        Insert: {
          id?: string | null
          provider_id: string
          category_key: string
          rate_type?: string
          rate_min?: number | null
          rate_max?: number | null
          currency?: string | null
          rate_notes?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string | null
          provider_id?: string
          category_key?: string
          rate_type?: string
          rate_min?: number | null
          rate_max?: number | null
          currency?: string | null
          rate_notes?: string | null
          is_active?: boolean
        }
      }
      service_categories: {
        Row: {
          id: string | null
          key: string
          name: string
          description: string | null
          icon: string | null
          group_name: string | null
          display_order: number | null
          is_active: boolean
        }
        Insert: {
          id?: string | null
          key: string
          name: string
          description?: string | null
          icon?: string | null
          group_name?: string | null
          display_order?: number | null
          is_active?: boolean
        }
        Update: {
          id?: string | null
          key?: string
          name?: string
          description?: string | null
          icon?: string | null
          group_name?: string | null
          display_order?: number | null
          is_active?: boolean
        }
      }
      service_providers: {
        Row: {
          id: string | null
          user_id: string | null
          business_name: string
          contact_name: string | null
          phone: string | null
          whatsapp: string | null
          email: string | null
          profile_photo: string | null
          bio: string | null
          years_experience: number | null
          county: string | null
          town: string | null
          service_radius_km: number | null
          is_verified: boolean
          verified_by: string | null
          verified_at: string | null
          id_number: string | null
          kra_pin: string | null
          registration_no: string | null
          is_available: boolean
          response_time_hrs: number | null
          rating_avg: number | null
          rating_count: number | null
          jobs_completed: number | null
          added_by: string | null
          added_by_role: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          user_id?: string | null
          business_name: string
          contact_name?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          profile_photo?: string | null
          bio?: string | null
          years_experience?: number | null
          county?: string | null
          town?: string | null
          service_radius_km?: number | null
          is_verified?: boolean
          verified_by?: string | null
          verified_at?: string | null
          id_number?: string | null
          kra_pin?: string | null
          registration_no?: string | null
          is_available?: boolean
          response_time_hrs?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          jobs_completed?: number | null
          added_by?: string | null
          added_by_role?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          user_id?: string | null
          business_name?: string
          contact_name?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          profile_photo?: string | null
          bio?: string | null
          years_experience?: number | null
          county?: string | null
          town?: string | null
          service_radius_km?: number | null
          is_verified?: boolean
          verified_by?: string | null
          verified_at?: string | null
          id_number?: string | null
          kra_pin?: string | null
          registration_no?: string | null
          is_available?: boolean
          response_time_hrs?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          jobs_completed?: number | null
          added_by?: string | null
          added_by_role?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      subscription_tiers: {
        Row: {
          id: string | null
          tier_key: string
          name: string
          description: string | null
          max_properties: number
          max_units: number
          price_per_property: number
          price_flat: number | null
          features: Json | null
          is_active: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string | null
          tier_key: string
          name: string
          description?: string | null
          max_properties: number
          max_units: number
          price_per_property?: number
          price_flat?: number | null
          features?: Json | null
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string | null
          tier_key?: string
          name?: string
          description?: string | null
          max_properties?: number
          max_units?: number
          price_per_property?: number
          price_flat?: number | null
          features?: Json | null
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
      }
      tenant_credit_ledger: {
        Row: {
          id: string | null
          tenant_id: string
          manager_id: string | null
          property_id: string | null
          transaction_id: string | null
          invoice_id: string | null
          entry_type: string
          amount: number
          balance_after: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string | null
          tenant_id: string
          manager_id?: string | null
          property_id?: string | null
          transaction_id?: string | null
          invoice_id?: string | null
          entry_type: string
          amount: number
          balance_after: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          tenant_id?: string
          manager_id?: string | null
          property_id?: string | null
          transaction_id?: string | null
          invoice_id?: string | null
          entry_type?: string
          amount?: number
          balance_after?: number
          description?: string | null
          created_at?: string
        }
      }
      tenant_guarantors: {
        Row: {
          id: string | null
          tenant_id: string
          unit_id: string | null
          manager_id: string | null
          name: string
          email: string | null
          phone: string
          national_id: string | null
          relationship: string | null
          employer_name: string | null
          employer_phone: string | null
          address: string | null
          monthly_income: number | null
          guarantee_amount: number | null
          guarantee_type: string | null
          id_document_url: string | null
          letter_url: string | null
          signature_url: string | null
          is_active: boolean
          activated_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string | null
          tenant_id: string
          unit_id?: string | null
          manager_id?: string | null
          name: string
          email?: string | null
          phone: string
          national_id?: string | null
          relationship?: string | null
          employer_name?: string | null
          employer_phone?: string | null
          address?: string | null
          monthly_income?: number | null
          guarantee_amount?: number | null
          guarantee_type?: string | null
          id_document_url?: string | null
          letter_url?: string | null
          signature_url?: string | null
          is_active?: boolean
          activated_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          tenant_id?: string
          unit_id?: string | null
          manager_id?: string | null
          name?: string
          email?: string | null
          phone?: string
          national_id?: string | null
          relationship?: string | null
          employer_name?: string | null
          employer_phone?: string | null
          address?: string | null
          monthly_income?: number | null
          guarantee_amount?: number | null
          guarantee_type?: string | null
          id_document_url?: string | null
          letter_url?: string | null
          signature_url?: string | null
          is_active?: boolean
          activated_at?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      tenant_lease_renewal_responses: {
        Row: {
          id: string | null
          tenant_id: string
          tenant_user_id: string
          manager_id: string | null
          lease_id: string | null
          notice_id: string | null
          decision: string
          counter_rent: number | null
          counter_term: number | null
          message: string | null
          signed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string | null
          tenant_id: string
          tenant_user_id: string
          manager_id?: string | null
          lease_id?: string | null
          notice_id?: string | null
          decision: string
          counter_rent?: number | null
          counter_term?: number | null
          message?: string | null
          signed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          tenant_id?: string
          tenant_user_id?: string
          manager_id?: string | null
          lease_id?: string | null
          notice_id?: string | null
          decision?: string
          counter_rent?: number | null
          counter_term?: number | null
          message?: string | null
          signed_at?: string | null
          created_at?: string
        }
      }
      tenant_notices: {
        Row: {
          id: string | null
          tenant_id: string
          unit_id: string | null
          property_id: string | null
          manager_id: string | null
          tenancy_id: string | null
          notice_type: string
          title: string
          body: string
          current_rent: number | null
          new_rent: number | null
          effective_date: string | null
          notice_period_days: number | null
          delivery_method: string | null
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          tenant_acknowledged: boolean | null
          tenant_ack_at: string | null
          tenant_response: string | null
          document_url: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string | null
          tenant_id: string
          unit_id?: string | null
          property_id?: string | null
          manager_id?: string | null
          tenancy_id?: string | null
          notice_type: string
          title: string
          body: string
          current_rent?: number | null
          new_rent?: number | null
          effective_date?: string | null
          notice_period_days?: number | null
          delivery_method?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          tenant_acknowledged?: boolean | null
          tenant_ack_at?: string | null
          tenant_response?: string | null
          document_url?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          tenant_id?: string
          unit_id?: string | null
          property_id?: string | null
          manager_id?: string | null
          tenancy_id?: string | null
          notice_type?: string
          title?: string
          body?: string
          current_rent?: number | null
          new_rent?: number | null
          effective_date?: string | null
          notice_period_days?: number | null
          delivery_method?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          tenant_acknowledged?: boolean | null
          tenant_ack_at?: string | null
          tenant_response?: string | null
          document_url?: string | null
          status?: string
          created_at?: string
        }
      }
      tenant_notification_preferences: {
        Row: {
          id: string | null
          tenant_user_id: string
          tenant_id: string | null
          email_enabled: boolean
          sms_enabled: boolean
          whatsapp_enabled: boolean
          push_enabled: boolean
          payment_reminders: boolean
          invoice_due: boolean
          payment_confirmed: boolean
          maintenance_updates: boolean
          lease_alerts: boolean
          manager_messages: boolean
          announcements: boolean
          rent_increase: boolean
          reminder_days_before: number
          quiet_hours_start: string | null
          quiet_hours_end: string | null
          language: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          tenant_user_id: string
          tenant_id?: string | null
          email_enabled?: boolean
          sms_enabled?: boolean
          whatsapp_enabled?: boolean
          push_enabled?: boolean
          payment_reminders?: boolean
          invoice_due?: boolean
          payment_confirmed?: boolean
          maintenance_updates?: boolean
          lease_alerts?: boolean
          manager_messages?: boolean
          announcements?: boolean
          rent_increase?: boolean
          reminder_days_before?: number
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          language?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          tenant_user_id?: string
          tenant_id?: string | null
          email_enabled?: boolean
          sms_enabled?: boolean
          whatsapp_enabled?: boolean
          push_enabled?: boolean
          payment_reminders?: boolean
          invoice_due?: boolean
          payment_confirmed?: boolean
          maintenance_updates?: boolean
          lease_alerts?: boolean
          manager_messages?: boolean
          announcements?: boolean
          rent_increase?: boolean
          reminder_days_before?: number
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          language?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tenant_payment_details: {
        Row: {
          id: string | null
          tenant_id: string
          manager_id: string | null
          property_id: string | null
          unit_id: string | null
          monthly_rent: number | null
          house_deposit: number | null
          water_deposit: number | null
          other_charges: number | null
          other_charges_desc: string | null
          total_deposit: number | null
          deposit_paid: number | null
          deposit_balance: number | null
          payment_day: number | null
          grace_period_days: number | null
          payment_method: string | null
          tenancy_type: string | null
          paybill_number: string | null
          till_number: string | null
          account_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          tenant_id: string
          manager_id?: string | null
          property_id?: string | null
          unit_id?: string | null
          monthly_rent?: number | null
          house_deposit?: number | null
          water_deposit?: number | null
          other_charges?: number | null
          other_charges_desc?: string | null
          deposit_paid?: number | null
          deposit_balance?: number | null
          payment_day?: number | null
          grace_period_days?: number | null
          payment_method?: string | null
          tenancy_type?: string | null
          paybill_number?: string | null
          till_number?: string | null
          account_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          tenant_id?: string
          manager_id?: string | null
          property_id?: string | null
          unit_id?: string | null
          monthly_rent?: number | null
          house_deposit?: number | null
          water_deposit?: number | null
          other_charges?: number | null
          other_charges_desc?: string | null
          deposit_paid?: number | null
          deposit_balance?: number | null
          payment_day?: number | null
          grace_period_days?: number | null
          payment_method?: string | null
          tenancy_type?: string | null
          paybill_number?: string | null
          till_number?: string | null
          account_reference?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tenant_pets: {
        Row: {
          id: string | null
          tenant_id: string
          unit_id: string | null
          manager_id: string | null
          pet_type: string
          breed: string | null
          name: string | null
          pet_deposit: number | null
          is_approved: boolean
          approved_by: string | null
          approved_at: string | null
          notes: string | null
          photo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string | null
          tenant_id: string
          unit_id?: string | null
          manager_id?: string | null
          pet_type: string
          breed?: string | null
          name?: string | null
          pet_deposit?: number | null
          is_approved?: boolean
          approved_by?: string | null
          approved_at?: string | null
          notes?: string | null
          photo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          tenant_id?: string
          unit_id?: string | null
          manager_id?: string | null
          pet_type?: string
          breed?: string | null
          name?: string | null
          pet_deposit?: number | null
          is_approved?: boolean
          approved_by?: string | null
          approved_at?: string | null
          notes?: string | null
          photo_url?: string | null
          created_at?: string
        }
      }
      tenant_reference_requests: {
        Row: {
          id: string | null
          tenant_id: string
          tenant_user_id: string
          manager_id: string | null
          issued_to: string | null
          issued_to_email: string | null
          purpose: string | null
          message: string | null
          status: string
          reference_id: string | null
          responded_at: string | null
          created_at: string
        }
        Insert: {
          id?: string | null
          tenant_id: string
          tenant_user_id: string
          manager_id?: string | null
          issued_to?: string | null
          issued_to_email?: string | null
          purpose?: string | null
          message?: string | null
          status?: string
          reference_id?: string | null
          responded_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          tenant_id?: string
          tenant_user_id?: string
          manager_id?: string | null
          issued_to?: string | null
          issued_to_email?: string | null
          purpose?: string | null
          message?: string | null
          status?: string
          reference_id?: string | null
          responded_at?: string | null
          created_at?: string
        }
      }
      tenant_references: {
        Row: {
          id: string | null
          tenant_id: string
          manager_id: string
          unit_id: string | null
          tenancy_id: string | null
          reference_type: string | null
          issued_to: string | null
          issued_to_email: string | null
          tenancy_period: string | null
          payment_record: string | null
          property_care: string | null
          overall_rating: number | null
          body: string | null
          recommend: boolean | null
          document_url: string | null
          sent_at: string | null
          expires_at: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string | null
          tenant_id: string
          manager_id: string
          unit_id?: string | null
          tenancy_id?: string | null
          reference_type?: string | null
          issued_to?: string | null
          issued_to_email?: string | null
          tenancy_period?: string | null
          payment_record?: string | null
          property_care?: string | null
          overall_rating?: number | null
          body?: string | null
          recommend?: boolean | null
          document_url?: string | null
          sent_at?: string | null
          expires_at?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          tenant_id?: string
          manager_id?: string
          unit_id?: string | null
          tenancy_id?: string | null
          reference_type?: string | null
          issued_to?: string | null
          issued_to_email?: string | null
          tenancy_period?: string | null
          payment_record?: string | null
          property_care?: string | null
          overall_rating?: number | null
          body?: string | null
          recommend?: boolean | null
          document_url?: string | null
          sent_at?: string | null
          expires_at?: string | null
          status?: string
          created_at?: string
        }
      }
      tenant_unit_links: {
        Row: {
          id: string | null
          tenant_id: string
          unit_id: string
          property_id: string
          manager_id: string | null
          link_type: string
          monthly_rent: number | null
          move_in_date: string | null
          move_out_date: string | null
          is_active: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string | null
          tenant_id: string
          unit_id: string
          property_id: string
          manager_id?: string | null
          link_type?: string
          monthly_rent?: number | null
          move_in_date?: string | null
          move_out_date?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          tenant_id?: string
          unit_id?: string
          property_id?: string
          manager_id?: string | null
          link_type?: string
          monthly_rent?: number | null
          move_in_date?: string | null
          move_out_date?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
        }
      }
      tenant_vehicles: {
        Row: {
          id: string | null
          tenant_id: string
          unit_id: string | null
          manager_id: string | null
          make: string | null
          model: string | null
          colour: string | null
          plate_number: string
          parking_bay: string | null
          parking_fee: number | null
          is_approved: boolean
          created_at: string
        }
        Insert: {
          id?: string | null
          tenant_id: string
          unit_id?: string | null
          manager_id?: string | null
          make?: string | null
          model?: string | null
          colour?: string | null
          plate_number: string
          parking_bay?: string | null
          parking_fee?: number | null
          is_approved?: boolean
          created_at?: string
        }
        Update: {
          id?: string | null
          tenant_id?: string
          unit_id?: string | null
          manager_id?: string | null
          make?: string | null
          model?: string | null
          colour?: string | null
          plate_number?: string
          parking_bay?: string | null
          parking_fee?: number | null
          is_approved?: boolean
          created_at?: string
        }
      }
      unit_activity_log: {
        Row: {
          id: string | null
          unit_id: string
          property_id: string | null
          tenancy_id: string | null
          tenant_id: string | null
          triggered_by: string | null
          triggered_by_role: string | null
          event_type: string
          title: string
          description: string | null
          reference_id: string | null
          reference_type: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string | null
          unit_id: string
          property_id?: string | null
          tenancy_id?: string | null
          tenant_id?: string | null
          triggered_by?: string | null
          triggered_by_role?: string | null
          event_type: string
          title: string
          description?: string | null
          reference_id?: string | null
          reference_type?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string | null
          unit_id?: string
          property_id?: string | null
          tenancy_id?: string | null
          tenant_id?: string | null
          triggered_by?: string | null
          triggered_by_role?: string | null
          event_type?: string
          title?: string
          description?: string | null
          reference_id?: string | null
          reference_type?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      unit_charge_configs: {
        Row: {
          id: string | null
          unit_id: string
          property_id: string
          manager_id: string
          charge_type: string
          charge_label: string
          amount: number
          is_active: boolean
          is_metered: boolean
          billing_cycle: string
          auto_generate: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          unit_id: string
          property_id: string
          manager_id: string
          charge_type: string
          charge_label: string
          amount?: number
          is_active?: boolean
          is_metered?: boolean
          billing_cycle?: string
          auto_generate?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          unit_id?: string
          property_id?: string
          manager_id?: string
          charge_type?: string
          charge_label?: string
          amount?: number
          is_active?: boolean
          is_metered?: boolean
          billing_cycle?: string
          auto_generate?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      unit_inspections: {
        Row: {
          id: string | null
          unit_id: string
          property_id: string | null
          manager_id: string | null
          tenant_id: string | null
          tenancy_id: string | null
          inspection_type: string
          inspection_date: string
          conducted_by: string | null
          conducted_by_name: string | null
          overall_condition: string | null
          cleanliness: string | null
          walls_condition: string | null
          floor_condition: string | null
          ceiling_condition: string | null
          bathroom_condition: string | null
          kitchen_condition: string | null
          windows_condition: string | null
          doors_condition: string | null
          notes: string | null
          photos_urls: string | null
          damage_found: boolean | null
          damage_description: string | null
          estimated_repair_cost: number | null
          tenant_present: boolean | null
          tenant_signature_url: string | null
          tenant_agreed: boolean | null
          tenant_comments: string | null
          manager_signature_url: string | null
          manager_signed_at: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          unit_id: string
          property_id?: string | null
          manager_id?: string | null
          tenant_id?: string | null
          tenancy_id?: string | null
          inspection_type?: string
          inspection_date?: string
          conducted_by?: string | null
          conducted_by_name?: string | null
          overall_condition?: string | null
          cleanliness?: string | null
          walls_condition?: string | null
          floor_condition?: string | null
          ceiling_condition?: string | null
          bathroom_condition?: string | null
          kitchen_condition?: string | null
          windows_condition?: string | null
          doors_condition?: string | null
          notes?: string | null
          photos_urls?: string | null
          damage_found?: boolean | null
          damage_description?: string | null
          estimated_repair_cost?: number | null
          tenant_present?: boolean | null
          tenant_signature_url?: string | null
          tenant_agreed?: boolean | null
          tenant_comments?: string | null
          manager_signature_url?: string | null
          manager_signed_at?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          unit_id?: string
          property_id?: string | null
          manager_id?: string | null
          tenant_id?: string | null
          tenancy_id?: string | null
          inspection_type?: string
          inspection_date?: string
          conducted_by?: string | null
          conducted_by_name?: string | null
          overall_condition?: string | null
          cleanliness?: string | null
          walls_condition?: string | null
          floor_condition?: string | null
          ceiling_condition?: string | null
          bathroom_condition?: string | null
          kitchen_condition?: string | null
          windows_condition?: string | null
          doors_condition?: string | null
          notes?: string | null
          photos_urls?: string | null
          damage_found?: boolean | null
          damage_description?: string | null
          estimated_repair_cost?: number | null
          tenant_present?: boolean | null
          tenant_signature_url?: string | null
          tenant_agreed?: boolean | null
          tenant_comments?: string | null
          manager_signature_url?: string | null
          manager_signed_at?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      unit_key_records: {
        Row: {
          id: string | null
          unit_id: string
          property_id: string | null
          manager_id: string | null
          tenant_id: string | null
          tenancy_id: string | null
          key_type: string
          key_label: string | null
          serial_number: string | null
          issued_date: string | null
          issued_by: string | null
          issued_to_name: string | null
          tenant_signature_url: string | null
          returned_date: string | null
          returned_to: string | null
          return_condition: string | null
          replacement_cost: number | null
          deducted_from_deposit: boolean | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          unit_id: string
          property_id?: string | null
          manager_id?: string | null
          tenant_id?: string | null
          tenancy_id?: string | null
          key_type?: string
          key_label?: string | null
          serial_number?: string | null
          issued_date?: string | null
          issued_by?: string | null
          issued_to_name?: string | null
          tenant_signature_url?: string | null
          returned_date?: string | null
          returned_to?: string | null
          return_condition?: string | null
          replacement_cost?: number | null
          deducted_from_deposit?: boolean | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          unit_id?: string
          property_id?: string | null
          manager_id?: string | null
          tenant_id?: string | null
          tenancy_id?: string | null
          key_type?: string
          key_label?: string | null
          serial_number?: string | null
          issued_date?: string | null
          issued_by?: string | null
          issued_to_name?: string | null
          tenant_signature_url?: string | null
          returned_date?: string | null
          returned_to?: string | null
          return_condition?: string | null
          replacement_cost?: number | null
          deducted_from_deposit?: boolean | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      unit_tenancy_history: {
        Row: {
          id: string | null
          unit_id: string
          property_id: string
          manager_id: string | null
          tenant_id: string
          tenant_name: string
          tenant_email: string
          tenant_phone: string | null
          move_in_date: string
          move_out_date: string | null
          booking_date: string | null
          monthly_rent: number | null
          deposit_paid: number | null
          water_deposit_paid: number | null
          total_paid: number | null
          arrears_at_moveout: number | null
          status: string
          move_out_reason: string | null
          move_out_notes: string | null
          notice_id: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          unit_id: string
          property_id: string
          manager_id?: string | null
          tenant_id: string
          tenant_name: string
          tenant_email: string
          tenant_phone?: string | null
          move_in_date: string
          move_out_date?: string | null
          booking_date?: string | null
          monthly_rent?: number | null
          deposit_paid?: number | null
          water_deposit_paid?: number | null
          total_paid?: number | null
          arrears_at_moveout?: number | null
          status?: string
          move_out_reason?: string | null
          move_out_notes?: string | null
          notice_id?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          unit_id?: string
          property_id?: string
          manager_id?: string | null
          tenant_id?: string
          tenant_name?: string
          tenant_email?: string
          tenant_phone?: string | null
          move_in_date?: string
          move_out_date?: string | null
          booking_date?: string | null
          monthly_rent?: number | null
          deposit_paid?: number | null
          water_deposit_paid?: number | null
          total_paid?: number | null
          arrears_at_moveout?: number | null
          status?: string
          move_out_reason?: string | null
          move_out_notes?: string | null
          notice_id?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_level: { Args: { _user_id: string }; Returns: string }
      get_auth_user_email: { Args: { _user_id: string }; Returns: string }
      get_manager_property_count: {
        Args: { _user_id: string }
        Returns: number
      }
      get_submanager_manager_id: { Args: { _user_id: string }; Returns: string }
      get_tenant_property_id: { Args: { _user_id: string }; Returns: string }
      get_user_maintenance_email: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_tenant_email: { Args: { _user_id: string }; Returns: string }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invitation_email_matches_user: {
        Args: { invitation_email: string }
        Returns: boolean
      }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          _action: string
          _details?: Json
          _ip_address?: string
          _resource_id?: string
          _resource_type: string
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      manual_generate_invoices_for_month: { Args: never; Returns: Json }
      property_belongs_to_manager: {
        Args: { _manager_user_id: string; _property_id: string }
        Returns: boolean
      }
      recalculate_all_property_occupancy: { Args: never; Returns: undefined }
      recalculate_all_property_stats: { Args: never; Returns: undefined }
      submanager_has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      submanager_has_property_access: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      trigger_auto_generate_invoices: { Args: never; Returns: undefined }
      use_activation_token: { Args: { token_value: string }; Returns: boolean }
      user_owns_agency: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      validate_activation_token: {
        Args: { token_value: string }
        Returns: {
          email: string
          expires_at: string
          user_id: string
        }[]
      }
      validate_invitation_token: {
        Args: { token_value: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          invited_by: string
          property_id: string
          property_name: string
          status: string
          tenant_name: string
          unit: string
        }[]
      }
    }
    Enums: {
      admin_level: "super_admin" | "admin" | "limited_admin"
      app_role:
        | "manager"
        | "tenant"
        | "webhost"
        | "submanager"
        | "landlord"
        | "agency"

      invoice_status: "paid" | "pending" | "overdue" | "cancelled"
      lease_status: "active" | "expiring" | "expired" | "pending" | "terminated"
      request_priority: "low" | "medium" | "high" | "urgent"
      request_status: "open" | "in_progress" | "completed" | "cancelled"
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
      admin_level: ["super_admin", "admin", "limited_admin"],
      app_role: ["manager", "tenant", "webhost", "submanager", "landlord", "agency"],
      invoice_status: ["paid", "pending", "overdue", "cancelled"],
      lease_status: ["active", "expiring", "expired", "pending", "terminated"],
      request_priority: ["low", "medium", "high", "urgent"],
      request_status: ["open", "in_progress", "completed", "cancelled"],
    },
  },
} as const
