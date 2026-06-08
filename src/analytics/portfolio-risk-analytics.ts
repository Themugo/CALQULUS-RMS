/**
 * Portfolio Risk Analytics
 * 
 * Analyzes portfolio-level risk metrics including:
 * - Concentration risk (property type, geographic, tenant)
 * - Credit risk (tenant payment history, defaults)
 * - Market risk (rent volatility, vacancy rates)
 * - Liquidity risk (cash flow stability, debt coverage)
 * - Operational risk (maintenance costs, management efficiency)
 */

export interface Property {
  id: string;
  name: string;
  address: string;
  propertyType: 'residential' | 'commercial' | 'mixed';
  units: number;
  location: {
    lat: number;
    lng: number;
    city: string;
    region: string;
  };
  purchasePrice: number;
  currentValue: number;
  mortgageBalance: number;
}

export interface Tenant {
  id: string;
  name: string;
  unitId: string;
  propertyId: string;
  monthlyRent: number;
  leaseStart: Date;
  leaseEnd: Date;
  paymentHistory: PaymentRecord[];
  creditScore?: number;
}

export interface PaymentRecord {
  date: Date;
  amount: number;
  status: 'on_time' | 'late' | 'partial' | 'missed';
  daysLate: number;
}

export interface RiskMetrics {
  overallRiskScore: number; // 0-100, higher = riskier
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  concentrationRisk: ConcentrationRisk;
  creditRisk: CreditRisk;
  marketRisk: MarketRisk;
  liquidityRisk: LiquidityRisk;
  operationalRisk: OperationalRisk;
  recommendations: RiskRecommendation[];
}

export interface ConcentrationRisk {
  score: number;
  propertyTypeConcentration: PropertyTypeConcentration[];
  geographicConcentration: GeographicConcentration[];
  tenantConcentration: TenantConcentration[];
}

export interface PropertyTypeConcentration {
  propertyType: string;
  percentage: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface GeographicConcentration {
  region: string;
  percentage: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface TenantConcentration {
  tenantId: string;
  tenantName: string;
  percentage: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CreditRisk {
  score: number;
  defaultRate: number;
  averageDaysLate: number;
  highRiskTenants: HighRiskTenant[];
  paymentTrend: PaymentTrend;
}

export interface HighRiskTenant {
  tenantId: string;
  tenantName: string;
  propertyId: string;
  riskScore: number;
  reasons: string[];
}

export interface PaymentTrend {
  improving: boolean;
  onTimeRate: number;
  lateRate: number;
  missedRate: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface MarketRisk {
  score: number;
  rentVolatility: number;
  vacancyRate: number;
  marketRentGrowth: number;
  regionalRisk: RegionalRisk[];
}

export interface RegionalRisk {
  region: string;
  riskScore: number;
  vacancyRate: number;
  rentGrowth: number;
  economicIndicators: EconomicIndicators;
}

export interface EconomicIndicators {
  unemploymentRate: number;
  gdpGrowth: number;
  populationGrowth: number;
  housingAffordability: number;
}

export interface LiquidityRisk {
  score: number;
  debtCoverageRatio: number;
  cashFlowStability: number;
  emergencyReserve: number;
  debtServiceCoverage: DebtServiceCoverage[];
}

export interface DebtServiceCoverage {
  propertyId: string;
  propertyName: string;
  dscr: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OperationalRisk {
  score: number;
  maintenanceCostRatio: number;
  managementEfficiency: number;
  turnoverRate: number;
  highRiskProperties: OperationalRiskProperty[];
}

export interface OperationalRiskProperty {
  propertyId: string;
  propertyName: string;
  riskScore: number;
  reasons: string[];
}

export interface RiskRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  actionItems: string[];
  expectedImpact: string;
  timeframe: string;
}

export class PortfolioRiskAnalytics {
  private properties: Property[];
  private tenants: Tenant[];
  private marketData: Map<string, RegionalRisk>;

  constructor(properties: Property[], tenants: Tenant[], marketData: RegionalRisk[] = []) {
    this.properties = properties;
    this.tenants = tenants;
    this.marketData = new Map(marketData.map(r => [r.region, r]));
  }

  /**
   * Calculate overall portfolio risk metrics
   */
  calculateRiskMetrics(): RiskMetrics {
    const concentrationRisk = this.calculateConcentrationRisk();
    const creditRisk = this.calculateCreditRisk();
    const marketRisk = this.calculateMarketRisk();
    const liquidityRisk = this.calculateLiquidityRisk();
    const operationalRisk = this.calculateOperationalRisk();

    // Calculate overall risk score (weighted average)
    const overallRiskScore = (
      concentrationRisk.score * 0.2 +
      creditRisk.score * 0.3 +
      marketRisk.score * 0.2 +
      liquidityRisk.score * 0.15 +
      operationalRisk.score * 0.15
    );

    const riskLevel = this.getRiskLevel(overallRiskScore);
    const recommendations = this.generateRecommendations(
      concentrationRisk,
      creditRisk,
      marketRisk,
      liquidityRisk,
      operationalRisk
    );

    return {
      overallRiskScore,
      riskLevel,
      concentrationRisk,
      creditRisk,
      marketRisk,
      liquidityRisk,
      operationalRisk,
      recommendations
    };
  }

  /**
   * Calculate concentration risk
   */
  private calculateConcentrationRisk(): ConcentrationRisk {
    const totalUnits = this.properties.reduce((sum, p) => sum + p.units, 0);
    const totalRevenue = this.tenants.reduce((sum, t) => sum + t.monthlyRent, 0);

    // Property type concentration
    const propertyTypeMap = new Map<string, number>();
    this.properties.forEach(p => {
      const current = propertyTypeMap.get(p.propertyType) || 0;
      propertyTypeMap.set(p.propertyType, current + p.units);
    });

    const propertyTypeConcentration: PropertyTypeConcentration[] = Array.from(
      propertyTypeMap.entries()
    ).map(([propertyType, units]) => ({
      propertyType,
      percentage: (units / totalUnits) * 100,
      riskLevel: units / totalUnits > 0.5 ? 'high' : units / totalUnits > 0.3 ? 'medium' : 'low'
    }));

    // Geographic concentration
    const regionMap = new Map<string, number>();
    this.properties.forEach(p => {
      const current = regionMap.get(p.location.region) || 0;
      regionMap.set(p.location.region, current + p.units);
    });

    const geographicConcentration: GeographicConcentration[] = Array.from(
      regionMap.entries()
    ).map(([region, units]) => ({
      region,
      percentage: (units / totalUnits) * 100,
      riskLevel: units / totalUnits > 0.5 ? 'high' : units / totalUnits > 0.3 ? 'medium' : 'low'
    }));

    // Tenant concentration
    const tenantMap = new Map<string, number>();
    this.tenants.forEach(t => {
      const current = tenantMap.get(t.id) || 0;
      tenantMap.set(t.id, current + t.monthlyRent);
    });

    const tenantConcentration: TenantConcentration[] = Array.from(
      tenantMap.entries()
    ).map(([tenantId, rent]) => {
      const tenant = this.tenants.find(t => t.id === tenantId);
      return {
        tenantId,
        tenantName: tenant?.name || 'Unknown',
        percentage: (rent / totalRevenue) * 100,
        riskLevel: rent / totalRevenue > 0.2 ? 'high' : rent / totalRevenue > 0.1 ? 'medium' : 'low'
      };
    });

    // Calculate concentration risk score
    const highRiskCount =
      propertyTypeConcentration.filter(r => r.riskLevel === 'high').length +
      geographicConcentration.filter(r => r.riskLevel === 'high').length +
      tenantConcentration.filter(r => r.riskLevel === 'high').length;

    const score = Math.min(highRiskCount * 20, 100);

    return {
      score,
      propertyTypeConcentration,
      geographicConcentration,
      tenantConcentration
    };
  }

  /**
   * Calculate credit risk
   */
  private calculateCreditRisk(): CreditRisk {
    const totalTenants = this.tenants.length;
    const totalPayments = this.tenants.reduce((sum, t) => sum + t.paymentHistory.length, 0);
    const latePayments = this.tenants.reduce(
      (sum, t) => sum + t.paymentHistory.filter(p => p.status === 'late').length,
      0
    );
    const missedPayments = this.tenants.reduce(
      (sum, t) => sum + t.paymentHistory.filter(p => p.status === 'missed').length,
      0
    );

    const defaultRate = (missedPayments / totalPayments) * 100;
    const averageDaysLate =
      this.tenants.reduce((sum, t) => {
        return sum + t.paymentHistory.reduce((s, p) => s + p.daysLate, 0);
      }, 0) / totalPayments;

    // Calculate payment trend
    const recentPayments = this.tenants.flatMap(t =>
      t.paymentHistory.filter(p => {
        const daysSince = (Date.now() - p.date.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 90;
      })
    );

    const onTimeRate = (recentPayments.filter(p => p.status === 'on_time').length / recentPayments.length) * 100;
    const lateRate = (recentPayments.filter(p => p.status === 'late').length / recentPayments.length) * 100;
    const missedRate = (recentPayments.filter(p => p.status === 'missed').length / recentPayments.length) * 100;

    const paymentTrend: PaymentTrend = {
      improving: onTimeRate > 80,
      onTimeRate,
      lateRate,
      missedRate,
      trend: onTimeRate > 80 ? 'improving' : onTimeRate > 60 ? 'stable' : 'declining'
    };

    // Identify high-risk tenants
    const highRiskTenants: HighRiskTenant[] = this.tenants
      .map(tenant => {
        const missedCount = tenant.paymentHistory.filter(p => p.status === 'missed').length;
        const lateCount = tenant.paymentHistory.filter(p => p.status === 'late').length;
        const totalPayments = tenant.paymentHistory.length;

        const riskScore = (missedCount / totalPayments) * 50 + (lateCount / totalPayments) * 30;

        const reasons: string[] = [];
        if (missedCount > 0) reasons.push(`${missedCount} missed payments`);
        if (lateCount > 2) reasons.push(`${lateCount} late payments`);
        if (tenant.creditScore && tenant.creditScore < 600) reasons.push('Low credit score');

        return {
          tenantId: tenant.id,
          tenantName: tenant.name,
          propertyId: tenant.propertyId,
          riskScore,
          reasons
        };
      })
      .filter(t => t.riskScore > 30)
      .sort((a, b) => b.riskScore - a.riskScore);

    // Calculate credit risk score
    const score = Math.min(defaultRate * 2 + averageDaysLate / 10, 100);

    return {
      score,
      defaultRate,
      averageDaysLate,
      highRiskTenants,
      paymentTrend
    };
  }

  /**
   * Calculate market risk
   */
  private calculateMarketRisk(): MarketRisk {
    const regions = Array.from(new Set(this.properties.map(p => p.location.region)));
    const vacancyRates = regions.map(region => {
      const propertiesInRegion = this.properties.filter(p => p.location.region === region);
      const totalUnits = propertiesInRegion.reduce((sum, p) => sum + p.units, 0);
      const occupiedUnits = this.tenants.filter(t =>
        propertiesInRegion.some(p => p.id === t.propertyId)
      ).length;
      return (totalUnits - occupiedUnits) / totalUnits;
    });

    const vacancyRate = vacancyRates.reduce((sum, rate) => sum + rate, 0) / vacancyRates.length;

    // Calculate rent volatility (simplified)
    const rentValues = this.tenants.map(t => t.monthlyRent);
    const avgRent = rentValues.reduce((sum, rent) => sum + rent, 0) / rentValues.length;
    const variance = rentValues.reduce((sum, rent) => sum + Math.pow(rent - avgRent, 2), 0) / rentValues.length;
    const rentVolatility = Math.sqrt(variance) / avgRent;

    const marketRentGrowth = 0.03; // 3% annual growth (simplified)

    const regionalRisk: RegionalRisk[] = regions.map(region => {
      const marketData = this.marketData.get(region) || {
        region,
        riskScore: 50,
        vacancyRate: 0.05,
        rentGrowth: 0.03,
        economicIndicators: {
          unemploymentRate: 0.05,
          gdpGrowth: 0.02,
          populationGrowth: 0.01,
          housingAffordability: 0.7
        }
      };

      return marketData;
    });

    // Calculate market risk score
    const score = Math.min(vacancyRate * 100 + rentVolatility * 50, 100);

    return {
      score,
      rentVolatility,
      vacancyRate,
      marketRentGrowth,
      regionalRisk
    };
  }

  /**
   * Calculate liquidity risk
   */
  private calculateLiquidityRisk(): LiquidityRisk {
    const totalPropertyValue = this.properties.reduce((sum, p) => sum + p.currentValue, 0);
    const totalMortgageBalance = this.properties.reduce((sum, p) => sum + p.mortgageBalance, 0);
    const totalMonthlyRevenue = this.tenants.reduce((sum, t) => sum + t.monthlyRent, 0);
    const totalMonthlyDebtService = totalMortgageBalance * 0.005; // Simplified 0.5% monthly rate

    const debtCoverageRatio = totalMonthlyRevenue / totalMonthlyDebtService;
    const cashFlowStability = debtCoverageRatio > 1.5 ? 1 : debtCoverageRatio > 1.2 ? 0.8 : 0.5;
    const emergencyReserve = (totalPropertyValue - totalMortgageBalance) / totalPropertyValue;

    const debtServiceCoverage: DebtServiceCoverage[] = this.properties.map(property => {
      const propertyTenants = this.tenants.filter(t => t.propertyId === property.id);
      const propertyRevenue = propertyTenants.reduce((sum, t) => sum + t.monthlyRent, 0);
      const propertyDebtService = property.mortgageBalance * 0.005;
      const dscr = propertyRevenue / propertyDebtService;

      return {
        propertyId: property.id,
        propertyName: property.name,
        dscr,
        riskLevel: dscr > 1.5 ? 'low' : dscr > 1.2 ? 'medium' : 'high'
      };
    });

    // Calculate liquidity risk score
    const score = Math.min((1 - debtCoverageRatio) * 50 + (1 - emergencyReserve) * 50, 100);

    return {
      score,
      debtCoverageRatio,
      cashFlowStability,
      emergencyReserve,
      debtServiceCoverage
    };
  }

  /**
   * Calculate operational risk
   */
  private calculateOperationalRisk(): OperationalRisk {
    // Simplified operational risk calculation
    const maintenanceCostRatio = 0.15; // 15% of revenue (simplified)
    const managementEfficiency = 0.85; // 85% efficiency (simplified)
    const turnoverRate = 0.2; // 20% annual turnover (simplified)

    const highRiskProperties: OperationalRiskProperty[] = this.properties
      .map(property => {
        const propertyTenants = this.tenants.filter(t => t.propertyId === property.id);
        const missedPayments = propertyTenants.reduce(
          (sum, t) => sum + t.paymentHistory.filter(p => p.status === 'missed').length,
          0
        );

        const riskScore = missedPayments * 10;
        const reasons: string[] = [];
        if (missedPayments > 2) reasons.push('High missed payment count');
        if (property.units < 5) reasons.push('Small property size');

        return {
          propertyId: property.id,
          propertyName: property.name,
          riskScore,
          reasons
        };
      })
      .filter(p => p.riskScore > 20)
      .sort((a, b) => b.riskScore - a.riskScore);

    // Calculate operational risk score
    const score = Math.min(maintenanceCostRatio * 100 + (1 - managementEfficiency) * 100 + turnoverRate * 50, 100);

    return {
      score,
      maintenanceCostRatio,
      managementEfficiency,
      turnoverRate,
      highRiskProperties
    };
  }

  /**
   * Generate risk recommendations
   */
  private generateRecommendations(
    concentrationRisk: ConcentrationRisk,
    creditRisk: CreditRisk,
    marketRisk: MarketRisk,
    liquidityRisk: LiquidityRisk,
    operationalRisk: OperationalRisk
  ): RiskRecommendation[] {
    const recommendations: RiskRecommendation[] = [];

    // Concentration risk recommendations
    if (concentrationRisk.score > 50) {
      recommendations.push({
        priority: 'high',
        category: 'Diversification',
        description: 'Portfolio shows high concentration risk',
        actionItems: [
          'Consider acquiring properties in different regions',
          'Diversify property types in the portfolio',
          'Reduce tenant concentration by limiting single tenant exposure'
        ],
        expectedImpact: 'Reduce concentration risk by 30-40%',
        timeframe: '6-12 months'
      });
    }

    // Credit risk recommendations
    if (creditRisk.score > 50) {
      recommendations.push({
        priority: 'high',
        category: 'Credit Management',
        description: 'Portfolio shows elevated credit risk',
        actionItems: [
          'Implement stricter tenant screening criteria',
          'Require security deposits for high-risk tenants',
          'Consider payment plans for tenants with payment issues',
          'Monitor payment trends closely'
        ],
        expectedImpact: 'Reduce default rate by 20-30%',
        timeframe: '3-6 months'
      });
    }

    // Market risk recommendations
    if (marketRisk.score > 50) {
      recommendations.push({
        priority: 'medium',
        category: 'Market Positioning',
        description: 'Portfolio exposed to market volatility',
        actionItems: [
          'Review rent pricing strategy in high-volatility regions',
          'Consider longer-term leases to reduce turnover risk',
          'Monitor economic indicators in portfolio regions'
        ],
        expectedImpact: 'Reduce market risk exposure by 15-25%',
        timeframe: '6-12 months'
      });
    }

    // Liquidity risk recommendations
    if (liquidityRisk.score > 50) {
      recommendations.push({
        priority: 'high',
        category: 'Liquidity Management',
        description: 'Portfolio shows liquidity concerns',
        actionItems: [
          'Build emergency reserves to 3-6 months of expenses',
          'Refinance high-interest debt if possible',
          'Improve rent collection processes',
          'Consider selling underperforming properties'
        ],
        expectedImpact: 'Improve debt coverage ratio by 20-30%',
        timeframe: '3-6 months'
      });
    }

    // Operational risk recommendations
    if (operationalRisk.score > 50) {
      recommendations.push({
        priority: 'medium',
        category: 'Operational Efficiency',
        description: 'Portfolio shows operational inefficiencies',
        actionItems: [
          'Implement preventive maintenance programs',
          'Review property management processes',
          'Standardize tenant onboarding procedures',
          'Invest in property management technology'
        ],
        expectedImpact: 'Reduce operational costs by 10-15%',
        timeframe: '6-12 months'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 25) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'critical';
  }

  /**
   * Get property risk breakdown
   */
  getPropertyRiskBreakdown(propertyId: string): {
    property: Property;
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    factors: { name: string; score: number; description: string }[];
  } {
    const property = this.properties.find(p => p.id === propertyId);
    if (!property) {
      throw new Error(`Property ${propertyId} not found`);
    }

    const propertyTenants = this.tenants.filter(t => t.propertyId === propertyId);
    const missedPayments = propertyTenants.reduce(
      (sum, t) => sum + t.paymentHistory.filter(p => p.status === 'missed').length,
      0
    );
    const latePayments = propertyTenants.reduce(
      (sum, t) => sum + t.paymentHistory.filter(p => p.status === 'late').length,
      0
    );

    const occupancyRate = propertyTenants.length / property.units;
    const dscr = (propertyTenants.reduce((sum, t) => sum + t.monthlyRent, 0)) / (property.mortgageBalance * 0.005);

    const factors = [
      {
        name: 'Occupancy Rate',
        score: occupancyRate * 100,
        description: `${(occupancyRate * 100).toFixed(1)}% occupancy`
      },
      {
        name: 'Payment Performance',
        score: 100 - (missedPayments * 10 + latePayments * 5),
        description: `${missedPayments} missed, ${latePayments} late payments`
      },
      {
        name: 'Debt Coverage',
        score: Math.min(dscr * 20, 100),
        description: `DSCR: ${dscr.toFixed(2)}`
      },
      {
        name: 'Market Position',
        score: 70, // Simplified
        description: 'Based on regional market conditions'
      }
    ];

    const riskScore = 100 - factors.reduce((sum, f) => sum + f.score, 0) / factors.length;
    const riskLevel = this.getRiskLevel(riskScore);

    return {
      property,
      riskScore,
      riskLevel,
      factors
    };
  }
}
