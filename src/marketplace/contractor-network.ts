/**
 * Contractor Network Integration
 * 
 * Manages contractor ecosystem for property maintenance and services:
 * - Contractor registration and verification
 * - Work order bidding and assignment
 * - Contractor performance tracking
 * - Payment processing and escrow
 * - Contractor marketplace
 * - Service category management
 */

export interface Contractor {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  businessRegistrationNumber: string;
  taxId: string;
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  serviceCategories: ServiceCategory[];
  serviceAreas: string[];
  rating: number;
  reviewCount: number;
  completedJobs: number;
  activeJobs: number;
  verificationStatus: 'pending' | 'verified' | 'suspended';
  insurance: InsuranceInfo;
  licenses: License[];
  bankAccount: BankAccount;
  availability: Availability;
  pricing: PricingStructure;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  subcategories: string[];
}

export interface InsuranceInfo {
  generalLiability: boolean;
  workersCompensation: boolean;
  professionalLiability: boolean;
  expiryDate: Date;
  coverageAmount: number;
  provider: string;
  policyNumber: string;
}

export interface License {
  type: string;
  number: string;
  issuingAuthority: string;
  expiryDate: Date;
  status: 'active' | 'expired' | 'suspended';
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountType: 'checking' | 'savings';
  accountHolderName: string;
}

export interface Availability {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  startTime: string;
  endTime: string;
  emergencyAvailability: boolean;
}

export interface PricingStructure {
  hourlyRate: number;
  minimumCharge: number;
  emergencyRate: number;
  travelFee: number;
  materialsMarkup: number;
  paymentTerms: string;
}

export interface WorkOrder {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId?: string;
  categoryId: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'draft' | 'posted' | 'bidding' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  budget: number;
  location: {
    address: string;
    city: string;
    region: string;
    lat: number;
    lng: number;
  };
  scheduledDate?: Date;
  deadline?: Date;
  requirements: string[];
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
  assignedContractorId?: string;
  bids: Bid[];
  selectedBid?: Bid;
}

export interface Bid {
  id: string;
  contractorId: string;
  contractorName: string;
  contractorRating: number;
  amount: number;
  estimatedDuration: number;
  description: string;
  materialsIncluded: boolean;
  warranty: string;
  availability: Date;
  submittedAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: Date;
}

export interface ContractorReview {
  id: string;
  contractorId: string;
  workOrderId: string;
  propertyId: string;
  rating: number;
  comment: string;
  categories: {
    quality: number;
    timeliness: number;
    communication: number;
    professionalism: number;
  };
  createdAt: Date;
}

export class ContractorNetwork {
  private contractors: Map<string, Contractor>;
  private workOrders: Map<string, WorkOrder>;
  private reviews: Map<string, ContractorReview[]>;
  private escrowPayments: Map<string, EscrowPayment>;

  constructor() {
    this.contractors = new Map();
    this.workOrders = new Map();
    this.reviews = new Map();
    this.escrowPayments = new Map();
  }

  /**
   * Register a new contractor
   */
  registerContractor(contractorData: Omit<Contractor, 'id' | 'rating' | 'reviewCount' | 'completedJobs' | 'activeJobs' | 'verificationStatus' | 'createdAt' | 'updatedAt'>): Contractor {
    const contractor: Contractor = {
      ...contractorData,
      id: this.generateId(),
      rating: 0,
      reviewCount: 0,
      completedJobs: 0,
      activeJobs: 0,
      verificationStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.contractors.set(contractor.id, contractor);
    return contractor;
  }

  /**
   * Verify contractor credentials
   */
  verifyContractor(contractorId: string, verificationData: {
    businessRegistrationVerified: boolean;
    insuranceVerified: boolean;
    licensesVerified: boolean;
    backgroundCheckPassed: boolean;
  }): Contractor {
    const contractor = this.contractors.get(contractorId);
    if (!contractor) {
      throw new Error(`Contractor ${contractorId} not found`);
    }

    const allVerified = Object.values(verificationData).every(v => v);

    contractor.verificationStatus = allVerified ? 'verified' : 'pending';
    contractor.updatedAt = new Date();

    this.contractors.set(contractorId, contractor);
    return contractor;
  }

  /**
   * Post a work order for bidding
   */
  postWorkOrder(workOrderData: Omit<WorkOrder, 'id' | 'status' | 'bids' | 'createdAt' | 'updatedAt'>): WorkOrder {
    const workOrder: WorkOrder = {
      ...workOrderData,
      id: this.generateId(),
      status: 'posted',
      bids: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workOrders.set(workOrder.id, workOrder);

    // Notify eligible contractors
    this.notifyEligibleContractors(workOrder);

    return workOrder;
  }

  /**
   * Submit a bid for a work order
   */
  submitBid(workOrderId: string, contractorId: string, bidData: Omit<Bid, 'id' | 'contractorId' | 'contractorName' | 'contractorRating' | 'submittedAt' | 'status'>): Bid {
    const workOrder = this.workOrders.get(workOrderId);
    if (!workOrder) {
      throw new Error(`Work order ${workOrderId} not found`);
    }

    const contractor = this.contractors.get(contractorId);
    if (!contractor) {
      throw new Error(`Contractor ${contractorId} not found`);
    }

    if (contractor.verificationStatus !== 'verified') {
      throw new Error('Contractor must be verified to submit bids');
    }

    const bid: Bid = {
      ...bidData,
      id: this.generateId(),
      contractorId,
      contractorName: contractor.businessName,
      contractorRating: contractor.rating,
      submittedAt: new Date(),
      status: 'pending'
    };

    workOrder.bids.push(bid);
    workOrder.status = 'bidding';
    workOrder.updatedAt = new Date();

    this.workOrders.set(workOrderId, workOrder);
    return bid;
  }

  /**
   * Accept a bid and assign contractor
   */
  acceptBid(workOrderId: string, bidId: string): WorkOrder {
    const workOrder = this.workOrders.get(workOrderId);
    if (!workOrder) {
      throw new Error(`Work order ${workOrderId} not found`);
    }

    const bid = workOrder.bids.find(b => b.id === bidId);
    if (!bid) {
      throw new Error(`Bid ${bidId} not found`);
    }

    // Reject all other bids
    workOrder.bids.forEach(b => {
      if (b.id !== bidId) {
        b.status = 'rejected';
      }
    });

    bid.status = 'accepted';
    workOrder.selectedBid = bid;
    workOrder.assignedContractorId = bid.contractorId;
    workOrder.status = 'assigned';
    workOrder.updatedAt = new Date();

    // Update contractor active jobs
    const contractor = this.contractors.get(bid.contractorId);
    if (contractor) {
      contractor.activeJobs++;
      contractor.updatedAt = new Date();
      this.contractors.set(bid.contractorId, contractor);
    }

    // Create escrow payment
    this.createEscrowPayment(workOrderId, bid.amount);

    this.workOrders.set(workOrderId, workOrder);
    return workOrder;
  }

  /**
   * Mark work order as in progress
   */
  startWork(workOrderId: string): WorkOrder {
    const workOrder = this.workOrders.get(workOrderId);
    if (!workOrder) {
      throw new Error(`Work order ${workOrderId} not found`);
    }

    if (workOrder.status !== 'assigned') {
      throw new Error('Work order must be assigned before starting');
    }

    workOrder.status = 'in_progress';
    workOrder.updatedAt = new Date();

    this.workOrders.set(workOrderId, workOrder);
    return workOrder;
  }

  /**
   * Complete work order
   */
  completeWorkOrder(workOrderId: string, completionData: {
    actualCost: number;
    actualDuration: number;
    notes: string;
    photos: string[];
  }): WorkOrder {
    const workOrder = this.workOrders.get(workOrderId);
    if (!workOrder) {
      throw new Error(`Work order ${workOrderId} not found`);
    }

    if (workOrder.status !== 'in_progress') {
      throw new Error('Work order must be in progress to complete');
    }

    workOrder.status = 'completed';
    workOrder.updatedAt = new Date();

    // Update contractor stats
    if (workOrder.assignedContractorId) {
      const contractor = this.contractors.get(workOrder.assignedContractorId);
      if (contractor) {
        contractor.completedJobs++;
        contractor.activeJobs--;
        contractor.updatedAt = new Date();
        this.contractors.set(workOrder.assignedContractorId, contractor);
      }
    }

    // Release escrow payment
    this.releaseEscrowPayment(workOrderId, completionData.actualCost);

    this.workOrders.set(workOrderId, workOrder);
    return workOrder;
  }

  /**
   * Submit contractor review
   */
  submitReview(reviewData: Omit<ContractorReview, 'id' | 'createdAt'>): ContractorReview {
    const review: ContractorReview = {
      ...reviewData,
      id: this.generateId(),
      createdAt: new Date()
    };

    const contractorReviews = this.reviews.get(review.contractorId) || [];
    contractorReviews.push(review);
    this.reviews.set(review.contractorId, contractorReviews);

    // Update contractor rating
    this.updateContractorRating(review.contractorId);

    return review;
  }

  /**
   * Update contractor rating based on reviews
   */
  private updateContractorRating(contractorId: string): void {
    const contractor = this.contractors.get(contractorId);
    if (!contractor) return;

    const reviews = this.reviews.get(contractorId) || [];
    if (reviews.length === 0) return;

    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    contractor.rating = averageRating;
    contractor.reviewCount = reviews.length;
    contractor.updatedAt = new Date();

    this.contractors.set(contractorId, contractor);
  }

  /**
   * Get contractors by service category and location
   */
  getContractors(filters: {
    serviceCategories?: string[];
    serviceAreas?: string[];
    minRating?: number;
    verifiedOnly?: boolean;
    available?: boolean;
  }): Contractor[] {
    let contractors = Array.from(this.contractors.values());

    if (filters.serviceCategories && filters.serviceCategories.length > 0) {
      contractors = contractors.filter(c =>
        filters.serviceCategories!.some(sc =>
          c.serviceCategories.some(cat => cat.id === sc || cat.name === sc)
        )
      );
    }

    if (filters.serviceAreas && filters.serviceAreas.length > 0) {
      contractors = contractors.filter(c =>
        filters.serviceAreas!.some(area => c.serviceAreas.includes(area))
      );
    }

    if (filters.minRating) {
      contractors = contractors.filter(c => c.rating >= filters.minRating!);
    }

    if (filters.verifiedOnly) {
      contractors = contractors.filter(c => c.verificationStatus === 'verified');
    }

    if (filters.available) {
      contractors = contractors.filter(c => c.activeJobs < 5); // Max 5 active jobs
    }

    return contractors.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get work orders for a property
   */
  getPropertyWorkOrders(propertyId: string, status?: WorkOrder['status']): WorkOrder[] {
    let workOrders = Array.from(this.workOrders.values()).filter(wo => wo.propertyId === propertyId);

    if (status) {
      workOrders = workOrders.filter(wo => wo.status === status);
    }

    return workOrders.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get work orders for a contractor
   */
  getContractorWorkOrders(contractorId: string): WorkOrder[] {
    return Array.from(this.workOrders.values())
      .filter(wo => wo.assignedContractorId === contractorId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Notify eligible contractors about new work order
   */
  private notifyEligibleContractors(workOrder: WorkOrder): void {
    const eligibleContractors = this.getContractors({
      serviceCategories: [workOrder.categoryId],
      serviceAreas: [workOrder.location.region],
      verifiedOnly: true,
      available: true
    });

    // In production, this would send notifications via email, SMS, or in-app
    console.warn(`Notifying ${eligibleContractors.length} eligible contractors about work order ${workOrder.id}`);
  }

  /**
   * Create escrow payment for work order
   */
  private createEscrowPayment(workOrderId: string, amount: number): EscrowPayment {
    const escrowPayment: EscrowPayment = {
      id: this.generateId(),
      workOrderId,
      amount,
      status: 'held',
      createdAt: new Date()
    };

    this.escrowPayments.set(workOrderId, escrowPayment);
    return escrowPayment;
  }

  /**
   * Release escrow payment
   */
  private releaseEscrowPayment(workOrderId: string, actualCost: number): void {
    const escrowPayment = this.escrowPayments.get(workOrderId);
    if (!escrowPayment) return;

    escrowPayment.status = 'released';
    escrowPayment.releasedAmount = actualCost;
    escrowPayment.releasedAt = new Date();

    this.escrowPayments.set(workOrderId, escrowPayment);
  }

  /**
   * Get contractor statistics
   */
  getContractorStatistics(contractorId: string): {
    contractor: Contractor;
    reviews: ContractorReview[];
    averageRating: number;
    totalEarnings: number;
    completionRate: number;
    responseTime: number;
  } {
    const contractor = this.contractors.get(contractorId);
    if (!contractor) {
      throw new Error(`Contractor ${contractorId} not found`);
    }

    const reviews = this.reviews.get(contractorId) || [];
    const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

    const completedWorkOrders = Array.from(this.workOrders.values()).filter(
      wo => wo.assignedContractorId === contractorId && wo.status === 'completed'
    );
    const totalEarnings = completedWorkOrders.reduce((sum, wo) => sum + (wo.selectedBid?.amount || 0), 0);

    const totalAssigned = Array.from(this.workOrders.values()).filter(
      wo => wo.assignedContractorId === contractorId
    ).length;
    const completionRate = totalAssigned > 0 ? (completedWorkOrders.length / totalAssigned) * 100 : 0;

    return {
      contractor,
      reviews,
      averageRating,
      totalEarnings,
      completionRate,
      responseTime: 2 // Average response time in hours (simplified)
    };
  }

  /**
   * Search contractors
   */
  searchContractors(query: string, filters?: {
    serviceCategories?: string[];
    serviceAreas?: string[];
    minRating?: number;
    maxPrice?: number;
  }): Contractor[] {
    let contractors = Array.from(this.contractors.values());

    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      contractors = contractors.filter(c =>
        c.businessName.toLowerCase().includes(lowerQuery) ||
        c.contactName.toLowerCase().includes(lowerQuery) ||
        c.serviceCategories.some(cat => cat.name.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply filters
    if (filters) {
      if (filters.serviceCategories && filters.serviceCategories.length > 0) {
        contractors = contractors.filter(c =>
          filters.serviceCategories!.some(sc =>
            c.serviceCategories.some(cat => cat.id === sc || cat.name === sc)
          )
        );
      }

      if (filters.serviceAreas && filters.serviceAreas.length > 0) {
        contractors = contractors.filter(c =>
          filters.serviceAreas!.some(area => c.serviceAreas.includes(area))
        );
      }

      if (filters.minRating) {
        contractors = contractors.filter(c => c.rating >= filters.minRating!);
      }

      if (filters.maxPrice) {
        contractors = contractors.filter(c => c.pricing.hourlyRate <= filters.maxPrice!);
      }
    }

    return contractors.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get marketplace overview
   */
  getMarketplaceOverview(): {
    totalContractors: number;
    verifiedContractors: number;
    activeWorkOrders: number;
    completedWorkOrders: number;
    totalValue: number;
    averageRating: number;
    topCategories: { category: string; count: number }[];
    regionalDistribution: { region: string; count: number }[];
  } {
    const contractors = Array.from(this.contractors.values());
    const workOrders = Array.from(this.workOrders.values());

    const verifiedContractors = contractors.filter(c => c.verificationStatus === 'verified').length;
    const activeWorkOrders = workOrders.filter(wo => ['bidding', 'assigned', 'in_progress'].includes(wo.status)).length;
    const completedWorkOrders = workOrders.filter(wo => wo.status === 'completed').length;
    const totalValue = workOrders
      .filter(wo => wo.status === 'completed' && wo.selectedBid)
      .reduce((sum, wo) => sum + (wo.selectedBid?.amount || 0), 0);

    const averageRating = contractors.length > 0
      ? contractors.reduce((sum, c) => sum + c.rating, 0) / contractors.length
      : 0;

    // Top service categories
    const categoryMap = new Map<string, number>();
    contractors.forEach(c => {
      c.serviceCategories.forEach(cat => {
        const current = categoryMap.get(cat.name) || 0;
        categoryMap.set(cat.name, current + 1);
      });
    });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Regional distribution
    const regionMap = new Map<string, number>();
    contractors.forEach(c => {
      c.serviceAreas.forEach(area => {
        const current = regionMap.get(area) || 0;
        regionMap.set(area, current + 1);
      });
    });

    const regionalDistribution = Array.from(regionMap.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalContractors: contractors.length,
      verifiedContractors,
      activeWorkOrders,
      completedWorkOrders,
      totalValue,
      averageRating,
      topCategories,
      regionalDistribution
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface EscrowPayment {
  id: string;
  workOrderId: string;
  amount: number;
  status: 'held' | 'released' | 'refunded';
  releasedAmount?: number;
  releasedAt?: Date;
  createdAt: Date;
}
