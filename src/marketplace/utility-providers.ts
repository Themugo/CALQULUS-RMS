/**
 * Utility Providers Integration
 * 
 * Manages utility ecosystem for property services:
 * - Electricity provider partnerships
 * - Water provider partnerships
 * - Gas provider partnerships
 * - Internet/TV provider partnerships
 * - Waste management partnerships
 * - Utility billing and payment processing
 * - Usage monitoring and reporting
 */

export interface UtilityProvider {
  id: string;
  name: string;
  type: 'electricity' | 'water' | 'gas' | 'internet' | 'tv' | 'waste_management';
  logo?: string;
  contact: {
    email: string;
    phone: string;
    website: string;
  };
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  serviceAreas: string[];
  rating: number;
  reviewCount: number;
  totalConnections: number;
  averageResponseTime: number; // in hours
  outageRate: number;
  integrationStatus: 'not_integrated' | 'pending' | 'integrated' | 'active';
  apiCredentials?: APICredentials;
  pricing: UtilityPricing;
  plans: UtilityPlan[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UtilityPricing {
  baseRate: number;
  ratePerUnit: number;
  unitType: 'kwh' | 'cubic_meters' | 'cubic_feet' | 'mbps' | 'gb' | 'monthly' | 'pickup';
  connectionFee: number;
  disconnectionFee: number;
  latePaymentFee: number;
  taxes: number;
  discounts: Discount[];
}

export interface Discount {
  type: string;
  description: string;
  percentage: number;
  conditions: string[];
}

export interface UtilityPlan {
  id: string;
  name: string;
  description: string;
  pricing: UtilityPricing;
  features: string[];
  contractTerm: number; // in months
  earlyTerminationFee: number;
  eligibility: PlanEligibility;
}

export interface PlanEligibility {
  minimumUsage?: number;
  maximumUsage?: number;
  propertyTypes?: string[];
  documentationRequired?: string[];
}

export interface APICredentials {
  apiKey: string;
  apiSecret: string;
  webhookUrl?: string;
  environment: 'sandbox' | 'production';
}

export interface UtilityConnection {
  id: string;
  providerId: string;
  providerName: string;
  planId: string;
  planName: string;
  propertyId: string;
  propertyName: string;
  unitId?: string;
  accountNumber: string;
  serviceAddress: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
  };
  startDate: Date;
  endDate?: Date;
  status: 'pending' | 'active' | 'suspended' | 'disconnected' | 'terminated';
  pricing: UtilityPricing;
  billingCycle: 'monthly' | 'quarterly' | 'bi_annual';
  usageData: UsageData[];
  bills: UtilityBill[];
  payments: UtilityPayment[];
  outages: UtilityOutage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageData {
  id: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  usage: number;
  cost: number;
  unit: string;
  recordedAt: Date;
}

export interface UtilityBill {
  id: string;
  connectionId: string;
  accountNumber: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  usage: number;
  baseCharge: number;
  usageCharge: number;
  taxes: number;
  fees: number;
  discounts: number;
  totalAmount: number;
  dueDate: Date;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'disputed';
  issuedAt: Date;
  paidAt?: Date;
}

export interface UtilityPayment {
  id: string;
  billId: string;
  amount: number;
  paidAt: Date;
  method: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface UtilityOutage {
  id: string;
  connectionId: string;
  type: 'planned' | 'unplanned';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in hours
  affectedArea: string;
  reason: string;
  status: 'scheduled' | 'active' | 'resolved';
  notified: boolean;
}

export class UtilityProviders {
  private providers: Map<string, UtilityProvider>;
  private connections: Map<string, UtilityConnection>;
  private outages: Map<string, UtilityOutage[]>;

  constructor() {
    this.providers = new Map();
    this.connections = new Map();
    this.outages = new Map();
  }

  /**
   * Register a utility provider
   */
  registerProvider(providerData: Omit<UtilityProvider, 'id' | 'rating' | 'reviewCount' | 'totalConnections' | 'integrationStatus' | 'createdAt' | 'updatedAt'>): UtilityProvider {
    const provider: UtilityProvider = {
      ...providerData,
      id: this.generateId(),
      rating: 0,
      reviewCount: 0,
      totalConnections: 0,
      integrationStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.providers.set(provider.id, provider);
    return provider;
  }

  /**
   * Integrate provider API
   */
  integrateProviderAPI(providerId: string, apiCredentials: APICredentials): UtilityProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    provider.apiCredentials = apiCredentials;
    provider.integrationStatus = 'integrated';
    provider.updatedAt = new Date();

    this.providers.set(providerId, provider);
    return provider;
  }

  /**
   * Activate provider integration
   */
  activateProvider(providerId: string): UtilityProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    if (provider.integrationStatus !== 'integrated') {
      throw new Error('Provider must be integrated before activation');
    }

    provider.integrationStatus = 'active';
    provider.updatedAt = new Date();

    this.providers.set(providerId, provider);
    return provider;
  }

  /**
   * Request utility connection
   */
  requestConnection(connectionData: Omit<UtilityConnection, 'id' | 'accountNumber' | 'status' | 'usageData' | 'bills' | 'payments' | 'outages' | 'createdAt' | 'updatedAt'>): UtilityConnection {
    const provider = this.providers.get(connectionData.providerId);
    if (!provider) {
      throw new Error(`Provider ${connectionData.providerId} not found`);
    }

    const plan = provider.plans.find(p => p.id === connectionData.planId);
    if (!plan) {
      throw new Error(`Plan ${connectionData.planId} not found`);
    }

    const connection: UtilityConnection = {
      ...connectionData,
      id: this.generateId(),
      accountNumber: this.generateAccountNumber(),
      status: 'pending',
      pricing: plan.pricing,
      usageData: [],
      bills: [],
      payments: [],
      outages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.connections.set(connection.id, connection);

    // Submit connection request to provider API if integrated
    if (provider.integrationStatus === 'active' && provider.apiCredentials) {
      this.submitConnectionRequestToProvider(connection, provider);
    }

    return connection;
  }

  /**
   * Generate account number
   */
  private generateAccountNumber(): string {
    return `ACC-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }

  /**
   * Submit connection request to provider API
   */
  private submitConnectionRequestToProvider(connection: UtilityConnection, provider: UtilityProvider): void {
    // In production, this would make an actual API call to the provider
    console.warn(`Submitting connection request ${connection.id} to ${provider.name} API`);
  }

  /**
   * Activate connection
   */
  activateConnection(connectionId: string): UtilityConnection {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    if (connection.status !== 'pending') {
      throw new Error('Connection must be pending to activate');
    }

    connection.status = 'active';
    connection.startDate = new Date();
    connection.updatedAt = new Date();

    // Update provider stats
    const provider = this.providers.get(connection.providerId);
    if (provider) {
      provider.totalConnections++;
      provider.updatedAt = new Date();
      this.providers.set(connection.providerId, provider);
    }

    this.connections.set(connectionId, connection);
    return connection;
  }

  /**
   * Record usage data
   */
  recordUsage(connectionId: string, usageData: Omit<UsageData, 'id' | 'recordedAt'>): UsageData {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const usage: UsageData = {
      ...usageData,
      id: this.generateId(),
      recordedAt: new Date()
    };

    connection.usageData.push(usage);
    connection.updatedAt = new Date();

    this.connections.set(connectionId, connection);
    return usage;
  }

  /**
   * Generate utility bill
   */
  generateBill(connectionId: string, period: { startDate: Date; endDate: Date }): UtilityBill {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // Calculate usage for the period
    const periodUsage = connection.usageData.filter(u =>
      u.period.startDate >= period.startDate && u.period.endDate <= period.endDate
    );

    const totalUsage = periodUsage.reduce((sum, u) => sum + u.usage, 0);

    // Calculate charges
    const baseCharge = connection.pricing.baseRate;
    const usageCharge = totalUsage * connection.pricing.ratePerUnit;
    const taxes = (baseCharge + usageCharge) * (connection.pricing.taxes / 100);
    const fees = connection.pricing.connectionFee;
    const discounts = 0; // Would calculate based on discounts

    const totalAmount = baseCharge + usageCharge + taxes + fees - discounts;

    const bill: UtilityBill = {
      id: this.generateId(),
      connectionId,
      accountNumber: connection.accountNumber,
      period,
      usage: totalUsage,
      baseCharge,
      usageCharge,
      taxes,
      fees,
      discounts,
      totalAmount,
      dueDate: new Date(period.endDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days after period end
      status: 'issued',
      issuedAt: new Date()
    };

    connection.bills.push(bill);
    connection.updatedAt = new Date();

    this.connections.set(connectionId, connection);
    return bill;
  }

  /**
   * Process utility payment
   */
  processPayment(billId: string, paymentData: {
    amount: number;
    method: string;
    reference: string;
  }): UtilityPayment {
    const connection = Array.from(this.connections.values()).find(c =>
      c.bills.some(b => b.id === billId)
    );

    if (!connection) {
      throw new Error(`Bill ${billId} not found`);
    }

    const bill = connection.bills.find(b => b.id === billId);
    if (!bill) {
      throw new Error(`Bill ${billId} not found`);
    }

    const payment: UtilityPayment = {
      id: this.generateId(),
      billId,
      amount: paymentData.amount,
      paidAt: new Date(),
      method: paymentData.method,
      reference: paymentData.reference,
      status: 'completed'
    };

    connection.payments.push(payment);
    bill.status = 'paid';
    bill.paidAt = new Date();
    connection.updatedAt = new Date();

    this.connections.set(connection.id, connection);
    return payment;
  }

  /**
   * Report outage
   */
  reportOutage(connectionId: string, outageData: Omit<UtilityOutage, 'id' | 'status' | 'notified'>): UtilityOutage {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const outage: UtilityOutage = {
      ...outageData,
      id: this.generateId(),
      status: outageData.type === 'planned' ? 'scheduled' : 'active',
      notified: false
    };

    connection.outages.push(outage);
    connection.updatedAt = new Date();

    // Add to outages map for tracking
    const connectionOutages = this.outages.get(connectionId) || [];
    connectionOutages.push(outage);
    this.outages.set(connectionId, connectionOutages);

    this.connections.set(connectionId, connection);
    return outage;
  }

  /**
   * Resolve outage
   */
  resolveOutage(connectionId: string, outageId: string, endTime: Date): UtilityOutage {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const outage = connection.outages.find(o => o.id === outageId);
    if (!outage) {
      throw new Error(`Outage ${outageId} not found`);
    }

    outage.endTime = endTime;
    outage.duration = (endTime.getTime() - outage.startTime.getTime()) / (1000 * 60 * 60); // in hours
    outage.status = 'resolved';

    connection.updatedAt = new Date();
    this.connections.set(connectionId, connection);

    return outage;
  }

  /**
   * Get utility providers by type
   */
  getProviders(filters?: {
    type?: UtilityProvider['type'];
    serviceAreas?: string[];
    minRating?: number;
    integrationStatus?: UtilityProvider['integrationStatus'];
  }): UtilityProvider[] {
    let providers = Array.from(this.providers.values());

    if (filters) {
      if (filters.type) {
        providers = providers.filter(p => p.type === filters.type);
      }

      if (filters.serviceAreas && filters.serviceAreas.length > 0) {
        providers = providers.filter(p =>
          filters.serviceAreas!.some(area => p.serviceAreas.includes(area))
        );
      }

      if (filters.minRating) {
        providers = providers.filter(p => p.rating >= filters.minRating!);
      }

      if (filters.integrationStatus) {
        providers = providers.filter(p => p.integrationStatus === filters.integrationStatus);
      }
    }

    return providers.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get provider plans
   */
  getProviderPlans(providerId: string): UtilityPlan[] {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    return provider.plans;
  }

  /**
   * Get connections for property
   */
  getPropertyConnections(propertyId: string, status?: UtilityConnection['status']): UtilityConnection[] {
    let connections = Array.from(this.connections.values()).filter(c => c.propertyId === propertyId);

    if (status) {
      connections = connections.filter(c => c.status === status);
    }

    return connections.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get connections for provider
   */
  getProviderConnections(providerId: string): UtilityConnection[] {
    return Array.from(this.connections.values())
      .filter(c => c.providerId === providerId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Compare utility plans
   */
  comparePlans(estimatedUsage: number, filters?: {
    providerIds?: string[];
    utilityTypes?: UtilityProvider['type'][];
    maxMonthlyCost?: number;
  }): {
    providerId: string;
    providerName: string;
    planId: string;
    planName: string;
    utilityType: string;
    estimatedMonthlyCost: number;
    ratePerUnit: number;
    features: string[];
    contractTerm: number;
  }[] {
    const plans: any[] = [];

    let providers = Array.from(this.providers.values()).filter(p => p.integrationStatus === 'active');

    if (filters?.providerIds) {
      providers = providers.filter(p => filters.providerIds!.includes(p.id));
    }

    providers.forEach(provider => {
      provider.plans.forEach(plan => {
        if (filters?.utilityTypes && !filters.utilityTypes.includes(provider.type)) {
          return;
        }

        const estimatedMonthlyCost = provider.pricing.baseRate + (estimatedUsage * provider.pricing.ratePerUnit);

        if (filters?.maxMonthlyCost && estimatedMonthlyCost > filters.maxMonthlyCost) {
          return;
        }

        plans.push({
          providerId: provider.id,
          providerName: provider.name,
          planId: plan.id,
          planName: plan.name,
          utilityType: provider.type,
          estimatedMonthlyCost,
          ratePerUnit: provider.pricing.ratePerUnit,
          features: plan.features,
          contractTerm: plan.contractTerm
        });
      });
    });

    return plans.sort((a, b) => a.estimatedMonthlyCost - b.estimatedMonthlyCost);
  }

  /**
   * Get usage analytics
   */
  getUsageAnalytics(connectionId: string, startDate: Date, endDate: Date): {
    totalUsage: number;
    averageDailyUsage: number;
    totalCost: number;
    averageDailyCost: number;
    usageTrend: 'increasing' | 'stable' | 'decreasing';
    periodData: UsageData[];
  } {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const periodData = connection.usageData.filter(u =>
      u.period.startDate >= startDate && u.period.endDate <= endDate
    );

    const totalUsage = periodData.reduce((sum, u) => sum + u.usage, 0);
    const totalCost = periodData.reduce((sum, u) => sum + u.cost, 0);

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const averageDailyUsage = totalUsage / days;
    const averageDailyCost = totalCost / days;

    // Determine trend
    let usageTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (periodData.length >= 2) {
      const firstHalf = periodData.slice(0, Math.floor(periodData.length / 2));
      const secondHalf = periodData.slice(Math.floor(periodData.length / 2));

      const firstHalfAvg = firstHalf.reduce((sum, u) => sum + u.usage, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, u) => sum + u.usage, 0) / secondHalf.length;

      if (secondHalfAvg > firstHalfAvg * 1.1) {
        usageTrend = 'increasing';
      } else if (secondHalfAvg < firstHalfAvg * 0.9) {
        usageTrend = 'decreasing';
      }
    }

    return {
      totalUsage,
      averageDailyUsage,
      totalCost,
      averageDailyCost,
      usageTrend,
      periodData
    };
  }

  /**
   * Get utility marketplace overview
   */
  getMarketplaceOverview(): {
    totalProviders: number;
    activeProviders: number;
    totalConnections: number;
    activeConnections: number;
    totalBills: number;
    outstandingBills: number;
    totalRevenue: number;
    averageRating: number;
    providerDistribution: { type: string; count: number }[];
    regionalDistribution: { region: string; count: number }[];
  } {
    const providers = Array.from(this.providers.values());
    const connections = Array.from(this.connections.values());

    const activeProviders = providers.filter(p => p.integrationStatus === 'active').length;
    const activeConnections = connections.filter(c => c.status === 'active').length;
    const totalBills = connections.reduce((sum, c) => sum + c.bills.length, 0);
    const outstandingBills = connections.reduce((sum, c) => sum + c.bills.filter(b => b.status !== 'paid').length, 0);
    const totalRevenue = connections.reduce((sum, c) => sum + c.bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.totalAmount, 0), 0);

    const averageRating = providers.length > 0
      ? providers.reduce((sum, p) => sum + p.rating, 0) / providers.length
      : 0;

    // Provider distribution
    const providerTypeMap = new Map<string, number>();
    providers.forEach(p => {
      const current = providerTypeMap.get(p.type) || 0;
      providerTypeMap.set(p.type, current + 1);
    });

    const providerDistribution = Array.from(providerTypeMap.entries())
      .map(([type, count]) => ({ type, count }));

    // Regional distribution
    const regionMap = new Map<string, number>();
    providers.forEach(p => {
      p.serviceAreas.forEach(area => {
        const current = regionMap.get(area) || 0;
        regionMap.set(area, current + 1);
      });
    });

    const regionalDistribution = Array.from(regionMap.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalProviders: providers.length,
      activeProviders,
      totalConnections: connections.length,
      activeConnections,
      totalBills,
      outstandingBills,
      totalRevenue,
      averageRating,
      providerDistribution,
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
