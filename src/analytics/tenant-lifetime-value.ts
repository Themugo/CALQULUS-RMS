/**
 * Tenant Lifetime Value Analytics
 * 
 * Calculates and analyzes tenant lifetime value (LTV) including:
 * - Revenue contribution over time
 * - Retention probability and churn risk
 * - Acquisition cost analysis
 * - Segmentation and value tiers
 * - Upsell and cross-sell opportunities
 * - Loyalty program optimization
 */

export interface Tenant {
  id: string;
  name: string;
  email: string;
  propertyId: string;
  unitId: string;
  leaseStart: Date;
  leaseEnd: Date;
  monthlyRent: number;
  paymentHistory: PaymentRecord[];
  maintenanceRequests: MaintenanceRequest[];
  communicationHistory: CommunicationRecord[];
  demographics: Demographics;
  preferences: TenantPreferences;
}

export interface PaymentRecord {
  date: Date;
  amount: number;
  status: 'on_time' | 'late' | 'partial' | 'missed';
  daysLate: number;
}

export interface MaintenanceRequest {
  id: string;
  date: Date;
  type: string;
  description: string;
  cost: number;
  satisfaction?: number;
}

export interface CommunicationRecord {
  date: Date;
  type: 'email' | 'phone' | 'in_person' | 'portal';
  purpose: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface Demographics {
  age?: number;
  income?: number;
  occupation?: string;
  familySize?: number;
  pets?: boolean;
}

export interface TenantPreferences {
  leaseLength: 'short' | 'medium' | 'long';
  communicationPreference: 'email' | 'phone' | 'portal';
  paymentMethod: string;
  amenities: string[];
}

export interface TenantLTV {
  tenantId: string;
  tenantName: string;
  currentLTV: number;
  projectedLTV: number;
  ltvTrend: 'increasing' | 'stable' | 'decreasing';
  revenueContribution: RevenueContribution;
  retentionProbability: number;
  churnRisk: ChurnRisk;
  acquisitionCost: number;
  ltvToCACRatio: number;
  valueTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  upsellOpportunities: UpsellOpportunity[];
  loyaltyScore: number;
}

export interface RevenueContribution {
  totalRevenue: number;
  averageMonthlyRevenue: number;
  revenueGrowthRate: number;
  paymentReliability: number;
  additionalRevenue: number;
}

export interface ChurnRisk {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: ChurnFactor[];
  predictedChurnDate?: Date;
}

export interface ChurnFactor {
  factor: string;
  impact: number;
  description: string;
  value: number | string | boolean;
}

export interface UpsellOpportunity {
  type: string;
  description: string;
  estimatedRevenueIncrease: number;
  probability: number;
  timeframe: string;
}

export class TenantLifetimeValueAnalytics {
  private tenants: Map<string, Tenant>;
  private acquisitionCosts: Map<string, number>;
  private industryBenchmarks: {
    averageLTV: number;
    averageCAC: number;
    averageRetentionRate: number;
    averageChurnRate: number;
  };

  constructor(
    tenants: Tenant[],
    acquisitionCosts: Map<string, number>,
    industryBenchmarks?: {
      averageLTV: number;
      averageCAC: number;
      averageRetentionRate: number;
      averageChurnRate: number;
    }
  ) {
    this.tenants = new Map(tenants.map(t => [t.id, t]));
    this.acquisitionCosts = acquisitionCosts;
    this.industryBenchmarks = industryBenchmarks || {
      averageLTV: 50000,
      averageCAC: 1000,
      averageRetentionRate: 0.85,
      averageChurnRate: 0.15
    };
  }

  /**
   * Calculate LTV for a specific tenant
   */
  calculateTenantLTV(tenantId: string): TenantLTV {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Calculate current LTV
    const currentLTV = this.calculateCurrentLTV(tenant);

    // Calculate projected LTV
    const projectedLTV = this.calculateProjectedLTV(tenant, currentLTV);

    // Determine LTV trend
    const ltvTrend = this.calculateLTVTrend(tenant);

    // Calculate revenue contribution
    const revenueContribution = this.calculateRevenueContribution(tenant);

    // Calculate retention probability
    const retentionProbability = this.calculateRetentionProbability(tenant);

    // Calculate churn risk
    const churnRisk = this.calculateChurnRisk(tenant);

    // Get acquisition cost
    const acquisitionCost = this.acquisitionCosts.get(tenantId) || this.industryBenchmarks.averageCAC;

    // Calculate LTV to CAC ratio
    const ltvToCACRatio = currentLTV / acquisitionCost;

    // Determine value tier
    const valueTier = this.determineValueTier(currentLTV);

    // Identify upsell opportunities
    const upsellOpportunities = this.identifyUpsellOpportunities(tenant);

    // Calculate loyalty score
    const loyaltyScore = this.calculateLoyaltyScore(tenant);

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      currentLTV,
      projectedLTV,
      ltvTrend,
      revenueContribution,
      retentionProbability,
      churnRisk,
      acquisitionCost,
      ltvToCACRatio,
      valueTier,
      upsellOpportunities,
      loyaltyScore
    };
  }

  /**
   * Calculate current LTV
   */
  private calculateCurrentLTV(tenant: Tenant): number {
    const monthsAsTenant = (Date.now() - tenant.leaseStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const totalRevenue = tenant.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
    
    // Add additional revenue (amenities, fees, etc.)
    const additionalRevenue = tenant.maintenanceRequests.reduce((sum, r) => sum + r.cost, 0) * 0.1; // 10% markup

    return totalRevenue + additionalRevenue;
  }

  /**
   * Calculate projected LTV
   */
  private calculateProjectedLTV(tenant: Tenant, currentLTV: number): number {
    const retentionProbability = this.calculateRetentionProbability(tenant);
    const remainingLeaseMonths = (tenant.leaseEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
    const monthlyRevenue = tenant.monthlyRent;

    // Project revenue for remaining lease
    const projectedLeaseRevenue = monthlyRevenue * remainingLeaseMonths * retentionProbability;

    // Project renewal probability
    const renewalProbability = this.calculateRenewalProbability(tenant);
    const projectedRenewalRevenue = monthlyRevenue * 12 * renewalProbability * 0.8; // 80% of tenants renew

    return currentLTV + projectedLeaseRevenue + projectedRenewalRevenue;
  }

  /**
   * Calculate LTV trend
   */
  private calculateLTVTrend(tenant: Tenant): 'increasing' | 'stable' | 'decreasing' {
    const payments = tenant.paymentHistory.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    if (payments.length < 6) return 'stable';

    const recentPayments = payments.slice(-6);
    const earlierPayments = payments.slice(-12, -6);

    const recentAvg = recentPayments.reduce((sum, p) => sum + p.amount, 0) / recentPayments.length;
    const earlierAvg = earlierPayments.reduce((sum, p) => sum + p.amount, 0) / earlierPayments.length;

    if (recentAvg > earlierAvg * 1.05) return 'increasing';
    if (recentAvg < earlierAvg * 0.95) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate revenue contribution
   */
  private calculateRevenueContribution(tenant: Tenant): RevenueContribution {
    const totalRevenue = tenant.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
    const monthsAsTenant = (Date.now() - tenant.leaseStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const averageMonthlyRevenue = totalRevenue / Math.max(monthsAsTenant, 1);

    // Calculate revenue growth rate
    const payments = tenant.paymentHistory.sort((a, b) => a.date.getTime() - b.date.getTime());
    let revenueGrowthRate = 0;
    
    if (payments.length >= 2) {
      const firstPayment = payments[0].amount;
      const lastPayment = payments[payments.length - 1].amount;
      revenueGrowthRate = ((lastPayment - firstPayment) / firstPayment) * 100;
    }

    // Calculate payment reliability
    const onTimePayments = tenant.paymentHistory.filter(p => p.status === 'on_time').length;
    const paymentReliability = (onTimePayments / tenant.paymentHistory.length) * 100;

    // Calculate additional revenue
    const additionalRevenue = tenant.maintenanceRequests.reduce((sum, r) => sum + r.cost, 0) * 0.1;

    return {
      totalRevenue,
      averageMonthlyRevenue,
      revenueGrowthRate,
      paymentReliability,
      additionalRevenue
    };
  }

  /**
   * Calculate retention probability
   */
  private calculateRetentionProbability(tenant: Tenant): number {
    let score = 70; // Base score

    // Payment reliability
    const onTimePayments = tenant.paymentHistory.filter(p => p.status === 'on_time').length;
    const paymentReliability = (onTimePayments / tenant.paymentHistory.length) * 100;
    score += (paymentReliability - 80) * 0.3;

    // Lease length preference
    if (tenant.preferences.leaseLength === 'long') score += 10;
    if (tenant.preferences.leaseLength === 'short') score -= 10;

    // Communication sentiment
    const positiveCommunications = tenant.communicationHistory.filter(c => c.sentiment === 'positive').length;
    const negativeCommunications = tenant.communicationHistory.filter(c => c.sentiment === 'negative').length;
    score += (positiveCommunications - negativeCommunications) * 2;

    // Maintenance satisfaction
    const satisfiedMaintenance = tenant.maintenanceRequests.filter(r => r.satisfaction && r.satisfaction >= 4).length;
    if (satisfiedMaintenance > 0) score += 5;

    // Time in property
    const monthsAsTenant = (Date.now() - tenant.leaseStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAsTenant > 12) score += 10;
    if (monthsAsTenant > 24) score += 10;

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Calculate renewal probability
   */
  private calculateRenewalProbability(tenant: Tenant): number {
    const retentionProbability = this.calculateRetentionProbability(tenant);
    const monthsRemaining = (tenant.leaseEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);

    // Higher probability if tenant has been there longer
    const monthsAsTenant = (Date.now() - tenant.leaseStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const tenureBonus = Math.min(monthsAsTenant * 2, 20);

    // Lower probability if lease is ending soon (less time to negotiate)
    const urgencyPenalty = monthsRemaining < 3 ? 10 : 0;

    return Math.min(Math.max(retentionProbability + tenureBonus - urgencyPenalty, 0), 100);
  }

  /**
   * Calculate churn risk
   */
  private calculateChurnRisk(tenant: Tenant): ChurnRisk {
    const factors: ChurnFactor[] = [];
    let riskScore = 0;

    // Payment issues
    const missedPayments = tenant.paymentHistory.filter(p => p.status === 'missed').length;
    const latePayments = tenant.paymentHistory.filter(p => p.status === 'late').length;
    
    if (missedPayments > 0) {
      riskScore += missedPayments * 20;
      factors.push({
        factor: 'Payment Issues',
        impact: missedPayments * 20,
        description: `${missedPayments} missed payment(s)`,
        value: missedPayments
      });
    }

    if (latePayments > 2) {
      riskScore += latePayments * 10;
      factors.push({
        factor: 'Late Payments',
        impact: latePayments * 10,
        description: `${latePayments} late payment(s)`,
        value: latePayments
      });
    }

    // Negative communications
    const negativeCommunications = tenant.communicationHistory.filter(c => c.sentiment === 'negative').length;
    if (negativeCommunications > 0) {
      riskScore += negativeCommunications * 15;
      factors.push({
        factor: 'Negative Communications',
        impact: negativeCommunications * 15,
        description: `${negativeCommunications} negative communication(s)`,
        value: negativeCommunications
      });
    }

    // Maintenance dissatisfaction
    const dissatisfiedMaintenance = tenant.maintenanceRequests.filter(r => r.satisfaction && r.satisfaction < 3).length;
    if (dissatisfiedMaintenance > 0) {
      riskScore += dissatisfiedMaintenance * 15;
      factors.push({
        factor: 'Maintenance Dissatisfaction',
        impact: dissatisfiedMaintenance * 15,
        description: `${dissatisfiedMaintenance} dissatisfied maintenance request(s)`,
        value: dissatisfiedMaintenance
      });
    }

    // Lease ending soon
    const monthsRemaining = (tenant.leaseEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsRemaining < 3) {
      riskScore += 20;
      factors.push({
        factor: 'Lease Ending Soon',
        impact: 20,
        description: `Lease ends in ${monthsRemaining.toFixed(0)} months`,
        value: monthsRemaining
      });
    }

    // Short lease preference
    if (tenant.preferences.leaseLength === 'short') {
      riskScore += 15;
      factors.push({
        factor: 'Short Lease Preference',
        impact: 15,
        description: 'Tenant prefers short-term leases',
        value: 'short'
      });
    }

    // Determine risk level
    const level = this.getChurnRiskLevel(riskScore);

    // Predict churn date if high risk
    let predictedChurnDate: Date | undefined;
    if (level === 'high' || level === 'critical') {
      predictedChurnDate = new Date(tenant.leaseEnd.getTime());
    }

    return {
      score: Math.min(riskScore, 100),
      level,
      factors,
      predictedChurnDate
    };
  }

  /**
   * Get churn risk level from score
   */
  private getChurnRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 25) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'critical';
  }

  /**
   * Determine value tier
   */
  private determineValueTier(ltv: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    const thresholds = {
      bronze: this.industryBenchmarks.averageLTV * 0.5,
      silver: this.industryBenchmarks.averageLTV,
      gold: this.industryBenchmarks.averageLTV * 1.5,
      platinum: this.industryBenchmarks.averageLTV * 2
    };

    if (ltv < thresholds.bronze) return 'bronze';
    if (ltv < thresholds.silver) return 'silver';
    if (ltv < thresholds.gold) return 'gold';
    return 'platinum';
  }

  /**
   * Identify upsell opportunities
   */
  private identifyUpsellOpportunities(tenant: Tenant): UpsellOpportunity[] {
    const opportunities: UpsellOpportunity[] = [];

    // Lease extension
    const monthsRemaining = (tenant.leaseEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsRemaining < 6 && tenant.preferences.leaseLength !== 'short') {
      opportunities.push({
        type: 'Lease Extension',
        description: 'Offer long-term lease extension with discount',
        estimatedRevenueIncrease: tenant.monthlyRent * 12 * 0.05, // 5% discount but longer term
        probability: this.calculateRenewalProbability(tenant) / 100,
        timeframe: '1-3 months'
      });
    }

    // Amenity upgrades
    if (tenant.preferences.amenities.length > 0) {
      opportunities.push({
        type: 'Amenity Upgrade',
        description: 'Offer premium amenities package',
        estimatedRevenueIncrease: tenant.monthlyRent * 0.1,
        probability: 0.4,
        timeframe: 'Immediate'
      });
    }

    // Parking/storage
    if (!tenant.preferences.amenities.includes('parking')) {
      opportunities.push({
        type: 'Parking/Storage',
        description: 'Offer parking or storage space',
        estimatedRevenueIncrease: tenant.monthlyRent * 0.15,
        probability: 0.3,
        timeframe: 'Immediate'
      });
    }

    // Rent increase (for long-term tenants)
    const monthsAsTenant = (Date.now() - tenant.leaseStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAsTenant > 24 && tenant.paymentHistory.filter(p => p.status === 'on_time').length / tenant.paymentHistory.length > 0.9) {
      opportunities.push({
        type: 'Rent Adjustment',
        description: 'Market-rate rent adjustment for long-term tenant',
        estimatedRevenueIncrease: tenant.monthlyRent * 0.03,
        probability: 0.5,
        timeframe: 'At renewal'
      });
    }

    return opportunities.sort((a, b) => b.estimatedRevenueIncrease - a.estimatedRevenueIncrease);
  }

  /**
   * Calculate loyalty score
   */
  private calculateLoyaltyScore(tenant: Tenant): number {
    let score = 50; // Base score

    // Tenure bonus
    const monthsAsTenant = (Date.now() - tenant.leaseStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
    score += Math.min(monthsAsTenant, 24);

    // Payment reliability
    const onTimePayments = tenant.paymentHistory.filter(p => p.status === 'on_time').length;
    const paymentReliability = (onTimePayments / tenant.paymentHistory.length) * 100;
    score += (paymentReliability - 80) * 0.25;

    // Communication engagement
    const communications = tenant.communicationHistory.length;
    score += Math.min(communications * 2, 10);

    // Positive sentiment
    const positiveCommunications = tenant.communicationHistory.filter(c => c.sentiment === 'positive').length;
    score += positiveCommunications * 3;

    // Maintenance cooperation
    const satisfiedMaintenance = tenant.maintenanceRequests.filter(r => r.satisfaction && r.satisfaction >= 4).length;
    score += satisfiedMaintenance * 5;

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Segment tenants by value
   */
  segmentTenants(): {
    bronze: TenantLTV[];
    silver: TenantLTV[];
    gold: TenantLTV[];
    platinum: TenantLTV[];
  } {
    const segments = {
      bronze: [] as TenantLTV[],
      silver: [] as TenantLTV[],
      gold: [] as TenantLTV[],
      platinum: [] as TenantLTV[]
    };

    this.tenants.forEach((tenant, tenantId) => {
      const ltv = this.calculateTenantLTV(tenantId);
      segments[ltv.valueTier].push(ltv);
    });

    return segments;
  }

  /**
   * Get portfolio LTV summary
   */
  getPortfolioLTVSummary(): {
    totalTenants: number;
    averageLTV: number;
    totalLTV: number;
    averageCAC: number;
    averageLTVToCACRatio: number;
    averageRetentionProbability: number;
    averageChurnRisk: number;
    valueTierDistribution: Record<string, number>;
    topTenants: TenantLTV[];
    atRiskTenants: TenantLTV[];
  } {
    const tenantLTVs = Array.from(this.tenants.keys()).map(id => this.calculateTenantLTV(id));

    const totalLTV = tenantLTVs.reduce((sum, ltv) => sum + ltv.currentLTV, 0);
    const averageLTV = totalLTV / tenantLTVs.length;

    const totalCAC = Array.from(this.acquisitionCosts.values()).reduce((sum, cost) => sum + cost, 0);
    const averageCAC = totalCAC / this.acquisitionCosts.size;

    const averageLTVToCACRatio = tenantLTVs.reduce((sum, ltv) => sum + ltv.ltvToCACRatio, 0) / tenantLTVs.length;

    const averageRetentionProbability = tenantLTVs.reduce((sum, ltv) => sum + ltv.retentionProbability, 0) / tenantLTVs.length;

    const averageChurnRisk = tenantLTVs.reduce((sum, ltv) => sum + ltv.churnRisk.score, 0) / tenantLTVs.length;

    const valueTierDistribution: Record<string, number> = {
      bronze: tenantLTVs.filter(ltv => ltv.valueTier === 'bronze').length,
      silver: tenantLTVs.filter(ltv => ltv.valueTier === 'silver').length,
      gold: tenantLTVs.filter(ltv => ltv.valueTier === 'gold').length,
      platinum: tenantLTVs.filter(ltv => ltv.valueTier === 'platinum').length
    };

    const topTenants = [...tenantLTVs].sort((a, b) => b.currentLTV - a.currentLTV).slice(0, 10);

    const atRiskTenants = tenantLTVs.filter(ltv => ltv.churnRisk.level === 'high' || ltv.churnRisk.level === 'critical');

    return {
      totalTenants: tenantLTVs.length,
      averageLTV,
      totalLTV,
      averageCAC,
      averageLTVToCACRatio,
      averageRetentionProbability,
      averageChurnRisk,
      valueTierDistribution,
      topTenants,
      atRiskTenants
    };
  }

  /**
   * Get retention strategies for at-risk tenants
   */
  getRetentionStrategies(tenantId: string): {
    tenantId: string;
    tenantName: string;
    churnRisk: ChurnRisk;
    strategies: RetentionStrategy[];
    expectedImpact: string;
  } {
    const ltv = this.calculateTenantLTV(tenantId);
    const strategies: RetentionStrategy[] = [];

    // Payment issues
    if (ltv.churnRisk.factors.some(f => f.factor === 'Payment Issues')) {
      strategies.push({
        type: 'payment_assistance',
        description: 'Offer payment plan or financial assistance',
        priority: 'high',
        estimatedCost: 0,
        expectedRetentionIncrease: 30
      });
    }

    // Negative communications
    if (ltv.churnRisk.factors.some(f => f.factor === 'Negative Communications')) {
      strategies.push({
        type: 'relationship_repair',
        description: 'Schedule personal meeting to address concerns',
        priority: 'high',
        estimatedCost: 50,
        expectedRetentionIncrease: 25
      });
    }

    // Maintenance dissatisfaction
    if (ltv.churnRisk.factors.some(f => f.factor === 'Maintenance Dissatisfaction')) {
      strategies.push({
        type: 'service_improvement',
        description: 'Review and improve maintenance response times',
        priority: 'medium',
        estimatedCost: 200,
        expectedRetentionIncrease: 20
      });
    }

    // Lease ending soon
    if (ltv.churnRisk.factors.some(f => f.factor === 'Lease Ending Soon')) {
      strategies.push({
        type: 'renewal_incentive',
        description: 'Offer renewal incentive or discount',
        priority: 'high',
        estimatedCost: ltv.currentLTV * 0.05,
        expectedRetentionIncrease: 40
      });
    }

    // General retention strategies
    strategies.push({
      type: 'loyalty_program',
      description: 'Enroll in loyalty program with benefits',
      priority: 'medium',
      estimatedCost: ltv.currentLTV * 0.02,
      expectedRetentionIncrease: 15
    });

    strategies.sort((a, b) => b.expectedRetentionIncrease - a.expectedRetentionIncrease);

    const expectedImpact = `Strategies could increase retention probability by ${strategies.reduce((sum, s) => sum + s.expectedRetentionIncrease, 0) / strategies.length}%`;

    return {
      tenantId: ltv.tenantId,
      tenantName: ltv.tenantName,
      churnRisk: ltv.churnRisk,
      strategies,
      expectedImpact
    };
  }
}

export interface RetentionStrategy {
  type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedCost: number;
  expectedRetentionIncrease: number;
}
