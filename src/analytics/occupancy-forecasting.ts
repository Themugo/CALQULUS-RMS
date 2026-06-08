/**
 * Occupancy Forecasting Analytics
 * 
 * Predicts occupancy patterns and provides insights for:
 * - Short-term occupancy forecasting (30-90 days)
 * - Long-term occupancy forecasting (1-5 years)
 * - Seasonal pattern analysis
 * - Lease expiration forecasting
 * - Vacancy risk assessment
 * - Revenue forecasting based on occupancy
 */

export interface Property {
  id: string;
  name: string;
  address: string;
  propertyType: 'residential' | 'commercial' | 'mixed';
  units: number;
  location: {
    city: string;
    region: string;
    lat: number;
    lng: number;
  };
  currentOccupancy: number;
  averageRent: number;
  marketRent: number;
}

export interface Lease {
  id: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  renewalProbability?: number;
}

export interface OccupancyForecast {
  propertyId: string;
  propertyName: string;
  forecastPeriod: ForecastPeriod;
  currentOccupancy: number;
  forecastedOccupancy: number;
  occupancyChange: number;
  confidence: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  riskFactors: RiskFactor[];
  recommendations: OccupancyRecommendation[];
  monthlyForecast: MonthlyOccupancyData[];
}

export interface ForecastPeriod {
  startDate: Date;
  endDate: Date;
  type: 'short_term' | 'long_term';
}

export interface MonthlyOccupancyData {
  month: Date;
  forecastedOccupancy: number;
  lowerBound: number;
  upperBound: number;
  expiringLeases: number;
  newLeases: number;
  vacancyRisk: 'low' | 'medium' | 'high';
}

export interface RiskFactor {
  factor: string;
  impact: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface OccupancyRecommendation {
  type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact: string;
  timeframe: string;
}

export interface PortfolioOccupancyForecast {
  forecastPeriod: ForecastPeriod;
  currentOccupancy: number;
  forecastedOccupancy: number;
  occupancyChange: number;
  propertyForecasts: OccupancyForecast[];
  regionalBreakdown: RegionalOccupancyData[];
  seasonalPattern: SeasonalPattern;
  revenueForecast: RevenueForecast;
}

export interface RegionalOccupancyData {
  region: string;
  currentOccupancy: number;
  forecastedOccupancy: number;
  propertyCount: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface SeasonalPattern {
  peakMonths: number[];
  lowMonths: number[];
  averageSeasonalVariation: number;
  currentSeason: 'peak' | 'normal' | 'low';
}

export interface RevenueForecast {
  currentMonthlyRevenue: number;
  forecastedMonthlyRevenue: number;
  revenueChange: number;
  revenueByProperty: { propertyId: string; propertyName: string; currentRevenue: number; forecastedRevenue: number }[];
  confidence: number;
}

export class OccupancyForecastingAnalytics {
  private properties: Map<string, Property>;
  private leases: Lease[];
  private historicalOccupancy: Map<string, HistoricalOccupancyData[]>;

  constructor(
    properties: Property[],
    leases: Lease[],
    historicalOccupancy: Map<string, HistoricalOccupancyData[]> = new Map()
  ) {
    this.properties = new Map(properties.map(p => [p.id, p]));
    this.leases = leases;
    this.historicalOccupancy = historicalOccupancy;
  }

  /**
   * Forecast occupancy for a specific property
   */
  forecastPropertyOccupancy(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): OccupancyForecast {
    const property = this.properties.get(propertyId);
    if (!property) {
      throw new Error(`Property ${propertyId} not found`);
    }

    const forecastPeriod: ForecastPeriod = {
      startDate,
      endDate,
      type: this.getForecastPeriodType(startDate, endDate)
    };

    // Get property leases
    const propertyLeases = this.leases.filter(l => l.propertyId === propertyId);

    // Calculate current occupancy
    const currentOccupancy = property.currentOccupancy;

    // Forecast occupancy
    const monthlyForecast = this.generateMonthlyForecast(property, propertyLeases, startDate, endDate);
    const forecastedOccupancy = monthlyForecast.reduce((sum, m) => sum + m.forecastedOccupancy, 0) / monthlyForecast.length;

    // Calculate occupancy change
    const occupancyChange = forecastedOccupancy - currentOccupancy;

    // Determine trend
    const trend = this.determineTrend(monthlyForecast);

    // Calculate confidence
    const confidence = this.calculateConfidence(property, propertyLeases, monthlyForecast);

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(property, propertyLeases, monthlyForecast);

    // Generate recommendations
    const recommendations = this.generateRecommendations(property, riskFactors, monthlyForecast);

    return {
      propertyId: property.id,
      propertyName: property.name,
      forecastPeriod,
      currentOccupancy,
      forecastedOccupancy,
      occupancyChange,
      confidence,
      trend,
      riskFactors,
      recommendations,
      monthlyForecast
    };
  }

  /**
   * Generate monthly forecast
   */
  private generateMonthlyForecast(
    property: Property,
    leases: Lease[],
    startDate: Date,
    endDate: Date
  ): MonthlyOccupancyData[] {
    const monthlyData: MonthlyOccupancyData[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate);
      const monthEnd = new Date(currentDate);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      // Count expiring leases in this month
      const expiringLeases = leases.filter(l => {
        const endDate = new Date(l.endDate);
        return endDate >= monthStart && endDate < monthEnd;
      }).length;

      // Count new leases (simplified - would use historical data)
      const newLeases = this.estimateNewLeases(property, monthStart, monthEnd);

      // Calculate forecasted occupancy
      const currentMonthOccupancy = this.calculateMonthlyOccupancy(property, leases, monthStart);
      const seasonalAdjustment = this.getSeasonalAdjustment(property.location.region, monthStart.getMonth());
      const forecastedOccupancy = Math.min(Math.max(currentMonthOccupancy + (newLeases - expiringLeases) / property.units + seasonalAdjustment, 0), 1);

      // Calculate confidence bounds
      const variance = 0.05; // 5% variance
      const lowerBound = Math.max(forecastedOccupancy - variance, 0);
      const upperBound = Math.min(forecastedOccupancy + variance, 1);

      // Determine vacancy risk
      const vacancyRisk = this.determineVacancyRisk(forecastedOccupancy);

      monthlyData.push({
        month: new Date(monthStart),
        forecastedOccupancy,
        lowerBound,
        upperBound,
        expiringLeases,
        newLeases,
        vacancyRisk
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return monthlyData;
  }

  /**
   * Calculate monthly occupancy
   */
  private calculateMonthlyOccupancy(property: Property, leases: Lease[], monthStart: Date): number {
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const activeLeases = leases.filter(l => {
      return l.startDate <= monthEnd && l.endDate >= monthStart;
    });

    return activeLeases.length / property.units;
  }

  /**
   * Estimate new leases for a month
   */
  private estimateNewLeases(property: Property, monthStart: Date, monthEnd: Date): number {
    // Simplified estimation based on historical patterns
    const historicalData = this.historicalOccupancy.get(property.id) || [];
    
    if (historicalData.length === 0) {
      // Use market average
      return property.units * 0.05; // 5% turnover rate
    }

    // Find same month in historical data
    const month = monthStart.getMonth();
    const sameMonthData = historicalData.filter(d => d.date.getMonth() === month);
    
    if (sameMonthData.length > 0) {
      const avgNewLeases = sameMonthData.reduce((sum, d) => sum + d.newLeases, 0) / sameMonthData.length;
      return avgNewLeases;
    }

    return property.units * 0.05;
  }

  /**
   * Get seasonal adjustment
   */
  private getSeasonalAdjustment(region: string, month: number): number {
    // Simplified seasonal patterns (would be data-driven in production)
    const peakMonths = [5, 6, 7, 8]; // May-August (summer peak)
    const lowMonths = [11, 12, 1, 2]; // Nov-Feb (winter low)

    if (peakMonths.includes(month)) return 0.03; // 3% boost
    if (lowMonths.includes(month)) return -0.02; // 2% decline
    return 0;
  }

  /**
   * Determine vacancy risk
   */
  private determineVacancyRisk(occupancy: number): 'low' | 'medium' | 'high' {
    if (occupancy > 0.9) return 'low';
    if (occupancy > 0.8) return 'medium';
    return 'high';
  }

  /**
   * Determine trend
   */
  private determineTrend(monthlyForecast: MonthlyOccupancyData[]): 'increasing' | 'stable' | 'decreasing' {
    if (monthlyForecast.length < 2) return 'stable';

    const firstMonth = monthlyForecast[0].forecastedOccupancy;
    const lastMonth = monthlyForecast[monthlyForecast.length - 1].forecastedOccupancy;
    const change = lastMonth - firstMonth;

    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate confidence
   */
  private calculateConfidence(property: Property, leases: Lease[], monthlyForecast: MonthlyOccupancyData[]): number {
    let confidence = 70; // Base confidence

    // More historical data = higher confidence
    const historicalData = this.historicalOccupancy.get(property.id) || [];
    confidence += Math.min(historicalData.length * 2, 20);

    // More leases = higher confidence
    confidence += Math.min(leases.length * 1, 10);

    // Shorter forecast period = higher confidence
    const forecastMonths = monthlyForecast.length;
    confidence -= Math.min(forecastMonths * 0.5, 15);

    return Math.min(Math.max(confidence, 0), 100);
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(
    property: Property,
    leases: Lease[],
    monthlyForecast: MonthlyOccupancyData[]
  ): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];

    // High expiring leases
    const totalExpiring = monthlyForecast.reduce((sum, m) => sum + m.expiringLeases, 0);
    if (totalExpiring > property.units * 0.3) {
      riskFactors.push({
        factor: 'High Lease Expirations',
        impact: totalExpiring,
        description: `${totalExpiring} leases expiring in forecast period`,
        severity: totalExpiring > property.units * 0.5 ? 'high' : 'medium'
      });
    }

    // Low renewal probability
    const lowRenewalLeases = leases.filter(l => l.renewalProbability && l.renewalProbability < 0.5).length;
    if (lowRenewalLeases > 0) {
      riskFactors.push({
        factor: 'Low Renewal Probability',
        impact: lowRenewalLeases,
        description: `${lowRenewalLeases} leases with low renewal probability`,
        severity: lowRenewalLeases > property.units * 0.2 ? 'high' : 'medium'
      });
    }

    // Market rent above current rent
    if (property.marketRent > property.averageRent * 1.1) {
      riskFactors.push({
        factor: 'Rent Gap',
        impact: (property.marketRent - property.averageRent) / property.averageRent,
        description: `Market rent ${(property.marketRent / property.averageRent * 100).toFixed(0)}% above current rent`,
        severity: 'medium'
      });
    }

    // Seasonal low period
    const currentMonth = new Date().getMonth();
    const lowMonths = [11, 12, 1, 2];
    if (lowMonths.includes(currentMonth)) {
      riskFactors.push({
        factor: 'Seasonal Low Period',
        impact: 0.1,
        description: 'Currently in low-demand season',
        severity: 'low'
      });
    }

    // Declining trend
    const trend = this.determineTrend(monthlyForecast);
    if (trend === 'decreasing') {
      riskFactors.push({
        factor: 'Declining Occupancy Trend',
        impact: 0.15,
        description: 'Occupancy forecast shows declining trend',
        severity: 'medium'
      });
    }

    return riskFactors;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    property: Property,
    riskFactors: RiskFactor[],
    monthlyForecast: MonthlyOccupancyData[]
  ): OccupancyRecommendation[] {
    const recommendations: OccupancyRecommendation[] = [];

    // High expiring leases
    if (riskFactors.some(r => r.factor === 'High Lease Expirations')) {
      recommendations.push({
        type: 'Lease Renewal Campaign',
        description: 'Proactively contact tenants with expiring leases to discuss renewal options',
        priority: 'high',
        expectedImpact: 'Increase renewal rate by 15-20%',
        timeframe: '30-60 days'
      });
    }

    // Low renewal probability
    if (riskFactors.some(r => r.factor === 'Low Renewal Probability')) {
      recommendations.push({
        type: 'Retention Incentives',
        description: 'Offer renewal incentives or discounts for at-risk tenants',
        priority: 'high',
        expectedImpact: 'Improve retention by 10-15%',
        timeframe: 'Immediate'
      });
    }

    // Rent gap
    if (riskFactors.some(r => r.factor === 'Rent Gap')) {
      recommendations.push({
        type: 'Rent Adjustment',
        description: 'Consider gradual rent increases to align with market rates',
        priority: 'medium',
        expectedImpact: 'Increase revenue by 5-10%',
        timeframe: 'At renewal'
      });
    }

    // Declining trend
    if (riskFactors.some(r => r.factor === 'Declining Occupancy Trend')) {
      recommendations.push({
        type: 'Marketing Campaign',
        description: 'Increase marketing efforts to attract new tenants',
        priority: 'high',
        expectedImpact: 'Reduce vacancy by 5-10%',
        timeframe: 'Immediate'
      });
    }

    // General recommendations
    recommendations.push({
      type: 'Property Improvements',
      description: 'Invest in property improvements to increase appeal',
      priority: 'medium',
      expectedImpact: 'Increase occupancy by 3-5%',
      timeframe: '3-6 months'
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get forecast period type
   */
  private getForecastPeriodType(startDate: Date, endDate: Date): 'short_term' | 'long_term' {
    const months = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return months <= 6 ? 'short_term' : 'long_term';
  }

  /**
   * Forecast portfolio occupancy
   */
  forecastPortfolioOccupancy(
    startDate: Date,
    endDate: Date
  ): PortfolioOccupancyForecast {
    const forecastPeriod: ForecastPeriod = {
      startDate,
      endDate,
      type: this.getForecastPeriodType(startDate, endDate)
    };

    // Forecast each property
    const propertyForecasts = Array.from(this.properties.keys()).map(propertyId =>
      this.forecastPropertyOccupancy(propertyId, startDate, endDate)
    );

    // Calculate portfolio-level metrics
    const totalUnits = Array.from(this.properties.values()).reduce((sum, p) => sum + p.units, 0);
    const currentOccupancy = propertyForecasts.reduce((sum, f) => sum + f.currentOccupancy * this.properties.get(f.propertyId)!.units, 0) / totalUnits;
    const forecastedOccupancy = propertyForecasts.reduce((sum, f) => sum + f.forecastedOccupancy * this.properties.get(f.propertyId)!.units, 0) / totalUnits;
    const occupancyChange = forecastedOccupancy - currentOccupancy;

    // Regional breakdown
    const regionalBreakdown = this.calculateRegionalBreakdown(propertyForecasts);

    // Seasonal pattern
    const seasonalPattern = this.analyzeSeasonalPattern();

    // Revenue forecast
    const revenueForecast = this.calculateRevenueForecast(propertyForecasts);

    return {
      forecastPeriod,
      currentOccupancy,
      forecastedOccupancy,
      occupancyChange,
      propertyForecasts,
      regionalBreakdown,
      seasonalPattern,
      revenueForecast
    };
  }

  /**
   * Calculate regional breakdown
   */
  private calculateRegionalBreakdown(propertyForecasts: OccupancyForecast[]): RegionalOccupancyData[] {
    const regionMap = new Map<string, { currentSum: number; forecastSum: number; count: number; units: number }>();

    propertyForecasts.forEach(forecast => {
      const property = this.properties.get(forecast.propertyId);
      if (!property) return;

      const region = property.location.region;
      const current = regionMap.get(region) || { currentSum: 0, forecastSum: 0, count: 0, units: 0 };
      
      regionMap.set(region, {
        currentSum: current.currentSum + forecast.currentOccupancy * property.units,
        forecastSum: current.forecastSum + forecast.forecastedOccupancy * property.units,
        count: current.count + 1,
        units: current.units + property.units
      });
    });

    return Array.from(regionMap.entries()).map(([region, data]) => {
      const currentOccupancy = data.currentSum / data.units;
      const forecastedOccupancy = data.forecastSum / data.units;
      const trend = forecastedOccupancy > currentOccupancy + 0.05 ? 'increasing' : forecastedOccupancy < currentOccupancy - 0.05 ? 'decreasing' : 'stable';

      return {
        region,
        currentOccupancy,
        forecastedOccupancy,
        propertyCount: data.count,
        trend
      };
    });
  }

  /**
   * Analyze seasonal pattern
   */
  private analyzeSeasonalPattern(): SeasonalPattern {
    const peakMonths = [5, 6, 7, 8]; // May-August
    const lowMonths = [11, 12, 1, 2]; // Nov-Feb
    const currentMonth = new Date().getMonth();

    const currentSeason = peakMonths.includes(currentMonth) ? 'peak' : lowMonths.includes(currentMonth) ? 'low' : 'normal';

    return {
      peakMonths,
      lowMonths,
      averageSeasonalVariation: 0.05, // 5% average variation
      currentSeason
    };
  }

  /**
   * Calculate revenue forecast
   */
  private calculateRevenueForecast(propertyForecasts: OccupancyForecast[]): RevenueForecast {
    const revenueByProperty = propertyForecasts.map(forecast => {
      const property = this.properties.get(forecast.propertyId);
      if (!property) return { propertyId: forecast.propertyId, propertyName: forecast.propertyName, currentRevenue: 0, forecastedRevenue: 0 };

      const currentRevenue = forecast.currentOccupancy * property.units * property.averageRent;
      const forecastedRevenue = forecast.forecastedOccupancy * property.units * property.averageRent;

      return {
        propertyId: forecast.propertyId,
        propertyName: forecast.propertyName,
        currentRevenue,
        forecastedRevenue
      };
    });

    const currentMonthlyRevenue = revenueByProperty.reduce((sum, r) => sum + r.currentRevenue, 0);
    const forecastedMonthlyRevenue = revenueByProperty.reduce((sum, r) => sum + r.forecastedRevenue, 0);
    const revenueChange = forecastedMonthlyRevenue - currentMonthlyRevenue;

    const confidence = propertyForecasts.reduce((sum, f) => sum + f.confidence, 0) / propertyForecasts.length;

    return {
      currentMonthlyRevenue,
      forecastedMonthlyRevenue,
      revenueChange,
      revenueByProperty,
      confidence
    };
  }

  /**
   * Get lease expiration calendar
   */
  getLeaseExpirationCalendar(propertyId?: string, months: number = 12): {
    expirations: {
      date: Date;
      propertyId: string;
      propertyName: string;
      unitId: string;
      tenantId: string;
      monthlyRent: number;
      renewalProbability?: number;
    }[];
    summary: {
      totalExpirations: number;
      totalRentAtRisk: number;
      highRiskExpirations: number;
      byMonth: { month: Date; count: number; rentAtRisk: number }[];
    };
  } {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() + months);

    let expiringLeases = this.leases.filter(l => new Date(l.endDate) <= cutoffDate);
    
    if (propertyId) {
      expiringLeases = expiringLeases.filter(l => l.propertyId === propertyId);
    }

    const expirations = expiringLeases.map(lease => {
      const property = this.properties.get(lease.propertyId);
      return {
        date: new Date(lease.endDate),
        propertyId: lease.propertyId,
        propertyName: property?.name || 'Unknown',
        unitId: lease.unitId,
        tenantId: lease.tenantId,
        monthlyRent: lease.monthlyRent,
        renewalProbability: lease.renewalProbability
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group by month
    const byMonthMap = new Map<number, { count: number; rentAtRisk: number }>();
    expirations.forEach(exp => {
      const monthKey = exp.date.getFullYear() * 100 + exp.date.getMonth();
      const current = byMonthMap.get(monthKey) || { count: 0, rentAtRisk: 0 };
      byMonthMap.set(monthKey, {
        count: current.count + 1,
        rentAtRisk: current.rentAtRisk + exp.monthlyRent
      });
    });

    const byMonth = Array.from(byMonthMap.entries()).map(([key, data]) => ({
      month: new Date(key % 100, Math.floor(key / 100) - 1900),
      count: data.count,
      rentAtRisk: data.rentAtRisk
    })).sort((a, b) => a.month.getTime() - b.month.getTime());

    const totalExpirations = expirations.length;
    const totalRentAtRisk = expirations.reduce((sum, exp) => sum + exp.monthlyRent, 0);
    const highRiskExpirations = expirations.filter(exp => exp.renewalProbability && exp.renewalProbability < 0.5).length;

    return {
      expirations,
      summary: {
        totalExpirations,
        totalRentAtRisk,
        highRiskExpirations,
        byMonth
      }
    };
  }
}

export interface HistoricalOccupancyData {
  date: Date;
  occupancy: number;
  newLeases: number;
  expiringLeases: number;
}
