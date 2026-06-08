import { supabase } from '@/integrations/supabase/client';

// Types for Insurance Marketplace
export interface InsuranceProvider {
  id: string;
  name: string;
  type: 'property' | 'liability' | 'health' | 'comprehensive';
  rating: number;
  reviewCount: number;
  totalPolicies: number;
  activePolicies: number;
  location: string;
  premiumRange: string;
  coverageRange: string;
  claimApprovalRate: number;
  averageClaimTime: string;
  verified: boolean;
  coverageTypes: string[];
}

export interface InsurancePolicy {
  id: string;
  providerId: string;
  providerName: string;
  propertyId: string;
  propertyName: string;
  unit: string;
  policyType: string;
  coverageType: string;
  coverageAmount: number;
  premium: number;
  deductible: number;
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  startDate: Date;
  endDate: Date;
  renewalDate: Date;
}

export interface InsuranceClaim {
  id: string;
  policyId: string;
  policyNumber: string;
  providerId: string;
  providerName: string;
  propertyId: string;
  propertyName: string;
  claimType: string;
  description: string;
  claimAmount: number;
  approvedAmount?: number;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
  submittedDate: Date;
  approvedDate?: Date;
  paidDate?: Date;
  documents: string[];
}

export interface ProviderPerformance {
  providerId: string;
  providerName: string;
  claimApprovalRate: number;
  averageClaimTime: string;
  customerSatisfaction: number;
  totalClaims: number;
  totalPayout: number;
  responseTime: string;
}

// Insurance Marketplace API Service
export const insuranceMarketplaceService = {
  /**
   * Fetch all insurance providers with optional filtering
   */
  async getInsuranceProviders(filters?: {
    type?: string;
    location?: string;
  }): Promise<InsuranceProvider[]> {
    let query = supabase
      .from('insurance_providers')
      .select('*');

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching insurance providers:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Fetch a single insurance provider by ID
   */
  async getInsuranceProviderById(id: string): Promise<InsuranceProvider | null> {
    const { data, error } = await supabase
      .from('insurance_providers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching insurance provider:', error);
      return null;
    }

    return data;
  },

  /**
   * Fetch all insurance policies with optional filtering
   */
  async getInsurancePolicies(filters?: {
    status?: string;
    providerId?: string;
    propertyId?: string;
  }): Promise<InsurancePolicy[]> {
    let query = supabase
      .from('insurance_policies')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.providerId) {
      query = query.eq('provider_id', filters.providerId);
    }
    if (filters?.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }

    const { data, error } = await query.order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching insurance policies:', error);
      return [];
    }

    return (data || []).map(policy => ({
      ...policy,
      providerId: policy.provider_id,
      propertyId: policy.property_id,
      startDate: new Date(policy.start_date),
      endDate: new Date(policy.end_date),
      renewalDate: new Date(policy.renewal_date),
    }));
  },

  /**
   * Create a new insurance policy
   */
  async createInsurancePolicy(policy: Omit<InsurancePolicy, 'id'>): Promise<InsurancePolicy | null> {
    const { data, error } = await supabase
      .from('insurance_policies')
      .insert({
        provider_id: policy.providerId,
        property_id: policy.propertyId,
        unit: policy.unit,
        policy_type: policy.policyType,
        coverage_type: policy.coverageType,
        coverage_amount: policy.coverageAmount,
        premium: policy.premium,
        deductible: policy.deductible,
        status: policy.status,
        start_date: policy.startDate.toISOString(),
        end_date: policy.endDate.toISOString(),
        renewal_date: policy.renewalDate.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating insurance policy:', error);
      return null;
    }

    return data ? {
      ...data,
      providerId: data.provider_id,
      propertyId: data.property_id,
      startDate: new Date(data.start_date),
      endDate: new Date(data.end_date),
      renewalDate: new Date(data.renewal_date),
    } : null;
  },

  /**
   * Update an insurance policy
   */
  async updateInsurancePolicy(id: string, updates: Partial<InsurancePolicy>): Promise<InsurancePolicy | null> {
    const { data, error } = await supabase
      .from('insurance_policies')
      .update({
        status: updates.status,
        premium: updates.premium,
        coverage_amount: updates.coverageAmount,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating insurance policy:', error);
      return null;
    }

    return data ? {
      ...data,
      providerId: data.provider_id,
      propertyId: data.property_id,
      startDate: new Date(data.start_date),
      endDate: new Date(data.end_date),
      renewalDate: new Date(data.renewal_date),
    } : null;
  },

  /**
   * Fetch insurance claims with optional filtering
   */
  async getInsuranceClaims(filters?: {
    status?: string;
    providerId?: string;
    policyId?: string;
  }): Promise<InsuranceClaim[]> {
    let query = supabase
      .from('insurance_claims')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.providerId) {
      query = query.eq('provider_id', filters.providerId);
    }
    if (filters?.policyId) {
      query = query.eq('policy_id', filters.policyId);
    }

    const { data, error } = await query.order('submitted_date', { ascending: false });

    if (error) {
      console.error('Error fetching insurance claims:', error);
      return [];
    }

    return (data || []).map(claim => ({
      ...claim,
      policyId: claim.policy_id,
      providerId: claim.provider_id,
      propertyId: claim.property_id,
      submittedDate: new Date(claim.submitted_date),
      approvedDate: claim.approved_date ? new Date(claim.approved_date) : undefined,
      paidDate: claim.paid_date ? new Date(claim.paid_date) : undefined,
    }));
  },

  /**
   * Create a new insurance claim
   */
  async createInsuranceClaim(claim: Omit<InsuranceClaim, 'id' | 'submittedDate'>): Promise<InsuranceClaim | null> {
    const { data, error } = await supabase
      .from('insurance_claims')
      .insert({
        policy_id: claim.policyId,
        provider_id: claim.providerId,
        property_id: claim.propertyId,
        claim_type: claim.claimType,
        description: claim.description,
        claim_amount: claim.claimAmount,
        approved_amount: claim.approvedAmount,
        status: claim.status,
        documents: claim.documents,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating insurance claim:', error);
      return null;
    }

    return data ? {
      ...data,
      policyId: data.policy_id,
      providerId: data.provider_id,
      propertyId: data.property_id,
      submittedDate: new Date(data.submitted_date),
      approvedDate: data.approved_date ? new Date(data.approved_date) : undefined,
      paidDate: data.paid_date ? new Date(data.paid_date) : undefined,
    } : null;
  },

  /**
   * Update an insurance claim
   */
  async updateInsuranceClaim(id: string, updates: Partial<InsuranceClaim>): Promise<InsuranceClaim | null> {
    const { data, error } = await supabase
      .from('insurance_claims')
      .update({
        status: updates.status,
        approved_amount: updates.approvedAmount,
        approved_date: updates.approvedDate?.toISOString(),
        paid_date: updates.paidDate?.toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating insurance claim:', error);
      return null;
    }

    return data ? {
      ...data,
      policyId: data.policy_id,
      providerId: data.provider_id,
      propertyId: data.property_id,
      submittedDate: new Date(data.submitted_date),
      approvedDate: data.approved_date ? new Date(data.approved_date) : undefined,
      paidDate: data.paid_date ? new Date(data.paid_date) : undefined,
    } : null;
  },

  /**
   * Get provider performance metrics
   */
  async getProviderPerformance(providerId: string): Promise<ProviderPerformance | null> {
    const { data, error } = await supabase
      .from('insurance_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (error) {
      console.error('Error fetching provider performance:', error);
      return null;
    }

    // Fetch claims for this provider
    const { data: claims } = await supabase
      .from('insurance_claims')
      .select('*')
      .eq('provider_id', providerId);

    const totalClaims = claims?.length || 0;
    const approvedClaims = claims?.filter(c => c.status === 'approved').length || 0;

    return {
      providerId: data.id,
      providerName: data.name,
      claimApprovalRate: data.claim_approval_rate,
      averageClaimTime: data.average_claim_time,
      customerSatisfaction: data.rating,
      totalClaims,
      totalPayout: totalClaims * 50000, // Placeholder calculation
      responseTime: '24 hours', // Placeholder
    };
  },

  /**
   * Approve an insurance claim
   */
  async approveInsuranceClaim(id: string, approvedAmount: number): Promise<boolean> {
    const { error } = await supabase
      .from('insurance_claims')
      .update({ 
        status: 'approved',
        approved_amount: approvedAmount,
        approved_date: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error approving insurance claim:', error);
      return false;
    }

    return true;
  },

  /**
   * Reject an insurance claim
   */
  async rejectInsuranceClaim(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('insurance_claims')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
      console.error('Error rejecting insurance claim:', error);
      return false;
    }

    return true;
  },

  /**
   * Mark a claim as paid
   */
  async markClaimAsPaid(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('insurance_claims')
      .update({ 
        status: 'paid',
        paid_date: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error marking claim as paid:', error);
      return false;
    }

    return true;
  },
};
