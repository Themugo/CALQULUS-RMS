import { supabase } from '@/integrations/supabase/client';

// Types for Contractor Marketplace
export interface Contractor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  availability: 'available' | 'busy' | 'unavailable';
  verified: boolean;
  certified: boolean;
  responseTime: string;
  location: string;
  totalJobs: number;
  completedJobs: number;
}

export interface WorkOrder {
  id: string;
  contractorId: string | null;
  contractorName: string | null;
  propertyId: string;
  propertyName: string;
  unit: string;
  category: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  budget: number;
  estimatedCost: number | null;
  actualCost?: number;
  scheduledDate: Date | null;
  completedDate?: Date;
  createdDate: Date;
}

export interface Bid {
  id: string;
  workOrderId: string;
  contractorId: string;
  contractorName: string;
  contractorRating: number;
  proposedAmount: number;
  estimatedDuration: string;
  status: 'pending' | 'accepted' | 'rejected';
  submittedDate: Date;
  notes?: string;
}

export interface ContractorPerformance {
  contractorId: string;
  contractorName: string;
  onTimeCompletion: number;
  qualityScore: number;
  averageResponseTime: string;
  totalJobs: number;
  completedJobs: number;
  customerSatisfaction: number;
}

// Contractor Marketplace API Service
export const contractorMarketplaceService = {
  /**
   * Fetch all contractors with optional filtering
   */
  async getContractors(filters?: {
    specialty?: string;
    availability?: string;
    location?: string;
  }): Promise<Contractor[]> {
    let query = supabase
      .from('contractors')
      .select('*');

    if (filters?.specialty) {
      query = query.eq('specialty', filters.specialty);
    }
    if (filters?.availability) {
      query = query.eq('availability', filters.availability);
    }
    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching contractors:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Fetch a single contractor by ID
   */
  async getContractorById(id: string): Promise<Contractor | null> {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching contractor:', error);
      return null;
    }

    return data;
  },

  /**
   * Fetch all work orders with optional filtering
   */
  async getWorkOrders(filters?: {
    status?: string;
    priority?: string;
    propertyId?: string;
  }): Promise<WorkOrder[]> {
    let query = supabase
      .from('work_orders')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }

    const { data, error } = await query.order('created_date', { ascending: false });

    if (error) {
      console.error('Error fetching work orders:', error);
      return [];
    }

    return (data || []).map(wo => ({
      ...wo,
      scheduledDate: wo.scheduled_date ? new Date(wo.scheduled_date) : null,
      completedDate: wo.completed_date ? new Date(wo.completed_date) : undefined,
      createdDate: new Date(wo.created_date),
    }));
  },

  /**
   * Create a new work order
   */
  async createWorkOrder(workOrder: Omit<WorkOrder, 'id' | 'createdDate'>): Promise<WorkOrder | null> {
    const { data, error } = await supabase
      .from('work_orders')
      .insert({
        contractor_id: workOrder.contractorId,
        property_id: workOrder.propertyId,
        unit: workOrder.unit,
        category: workOrder.category,
        description: workOrder.description,
        priority: workOrder.priority,
        budget: workOrder.budget,
        estimated_cost: workOrder.estimatedCost,
        scheduled_date: workOrder.scheduledDate?.toISOString(),
        status: workOrder.status,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating work order:', error);
      return null;
    }

    return data ? {
      ...data,
      contractorId: data.contractor_id,
      propertyId: data.property_id,
      estimatedCost: data.estimated_cost,
      scheduledDate: data.scheduled_date ? new Date(data.scheduled_date) : null,
      completedDate: data.completed_date ? new Date(data.completed_date) : undefined,
      createdDate: new Date(data.created_date),
    } : null;
  },

  /**
   * Update a work order
   */
  async updateWorkOrder(id: string, updates: Partial<WorkOrder>): Promise<WorkOrder | null> {
    const { data, error } = await supabase
      .from('work_orders')
      .update({
        contractor_id: updates.contractorId,
        status: updates.status,
        estimated_cost: updates.estimatedCost,
        actual_cost: updates.actualCost,
        scheduled_date: updates.scheduledDate?.toISOString(),
        completed_date: updates.completedDate?.toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating work order:', error);
      return null;
    }

    return data ? {
      ...data,
      contractorId: data.contractor_id,
      propertyId: data.property_id,
      estimatedCost: data.estimated_cost,
      scheduledDate: data.scheduled_date ? new Date(data.scheduled_date) : null,
      completedDate: data.completed_date ? new Date(data.completed_date) : undefined,
      createdDate: new Date(data.created_date),
    } : null;
  },

  /**
   * Fetch bids for a specific work order
   */
  async getBidsForWorkOrder(workOrderId: string): Promise<Bid[]> {
    const { data, error } = await supabase
      .from('contractor_bids')
      .select('*')
      .eq('work_order_id', workOrderId);

    if (error) {
      console.error('Error fetching bids:', error);
      return [];
    }

    return (data || []).map(bid => ({
      ...bid,
      workOrderId: bid.work_order_id,
      contractorId: bid.contractor_id,
      submittedDate: new Date(bid.submitted_date),
    }));
  },

  /**
   * Create a new bid
   */
  async createBid(bid: Omit<Bid, 'id' | 'submittedDate'>): Promise<Bid | null> {
    const { data, error } = await supabase
      .from('contractor_bids')
      .insert({
        work_order_id: bid.workOrderId,
        contractor_id: bid.contractorId,
        proposed_amount: bid.proposedAmount,
        estimated_duration: bid.estimatedDuration,
        status: bid.status,
        notes: bid.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bid:', error);
      return null;
    }

    return data ? {
      ...data,
      workOrderId: data.work_order_id,
      contractorId: data.contractor_id,
      submittedDate: new Date(data.submitted_date),
    } : null;
  },

  /**
   * Get contractor performance metrics
   */
  async getContractorPerformance(contractorId: string): Promise<ContractorPerformance | null> {
    // This would typically be a computed view or RPC call
    // For now, we'll fetch the contractor and calculate basic metrics
    const { data: contractor, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', contractorId)
      .single();

    if (error) {
      console.error('Error fetching contractor performance:', error);
      return null;
    }

    // Fetch completed work orders for this contractor
    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('status', 'completed');

    const totalJobs = workOrders?.length || 0;

    return {
      contractorId: contractor.id,
      contractorName: contractor.name,
      onTimeCompletion: 85, // Placeholder - would be calculated from actual data
      qualityScore: contractor.rating,
      averageResponseTime: contractor.responseTime,
      totalJobs: contractor.totalJobs,
      completedJobs: totalJobs,
      customerSatisfaction: contractor.rating,
    };
  },

  /**
   * Accept a bid for a work order
   */
  async acceptBid(bidId: string): Promise<boolean> {
    const { error } = await supabase
      .from('contractor_bids')
      .update({ status: 'accepted' })
      .eq('id', bidId);

    if (error) {
      console.error('Error accepting bid:', error);
      return false;
    }

    return true;
  },

  /**
   * Reject a bid for a work order
   */
  async rejectBid(bidId: string): Promise<boolean> {
    const { error } = await supabase
      .from('contractor_bids')
      .update({ status: 'rejected' })
      .eq('id', bidId);

    if (error) {
      console.error('Error rejecting bid:', error);
      return false;
    }

    return true;
  },
};
