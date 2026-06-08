/**
 * Rent Market Analytics
 * 
 * Analyzes rent market trends and provides insights for:
 * - Rent pricing optimization
 * - Market demand analysis
 * - Competitor benchmarking
 * - Seasonal trends
 * - Geographic market segmentation
 * - Yield optimization
 */

export interface MarketData {
  region: string;
  city: string;
  averageRent: number;
  medianRent: number;
  rentGrowthRate: number;
  vacancyRate: number;
  occupancyRate: number;
  daysOnMarket: number;
  propertyType: 'residential' | 'commercial' | 'mixed';
  unitSize: number;
  amenities: string[];
}

export interface PropertyRentData {
  propertyId: string;
  propertyName: string;
  currentRent: number;
  unitSize: number;
  propertyType: 'residential' | 'commercial' | 'mixed';
  location: {
    city: string;
    region: string;
    lat: number;
    lng: number;
  };
  amenities: string[];
  occupancyRate: number;
  daysVacant: number;
}

export interface RentAnalysis {
  propertyId: string;
  propertyName: string;
  currentRent: number;
  recommendedRent: number;
  rentAdjustment: number;
  adjustmentPercentage: number;
  marketPosition: 'underpriced' | 'at_market' | 'overpriced';
  marketRentRange: { min: number; max: number };
  competitiveAdvantage: string[];
  pricingRecommendations: PricingRecommendation[];
  demandForecast: DemandForecast;
}

export interface PricingRecommendation {
  type: 'increase' | 'decrease' | 'maintain';
  amount: number;
  percentage: number;
  reasoning: string;
  confidence: number;
  timeframe: string;
  expectedImpact: string;
}

export interface DemandForecast {
  currentDemand: 'low' | 'medium' | 'high';
  forecastDemand: 'low' | 'medium' | 'high';
  trend: 'increasing' | 'stable' | 'decreasing';
  seasonality: SeasonalityPattern;
  factors: DemandFactor[];
}

export interface SeasonalityPattern {
  peakMonths: number[];
  lowMonths: number[];
  averageSeasonalVariation: number;
}

export interface DemandFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  magnitude: number;
  description: string;
}

export interface MarketComparison {
  propertyId: string;
  propertyName: string;
  marketAverage: number;
  marketMedian: number;
  marketPercentile: number;
  comparableProperties: ComparableProperty[];
  marketShare: number;
  competitivePosition: 'leader' | 'competitive' | 'lagging';
}

export interface ComparableProperty {
  propertyId: string;
  propertyName: string;
  rent: number;
  unitSize: number;
  distance: number;
  amenities: string[];
  occupancyRate: number;
  similarityScore: number;
}

export interface YieldAnalysis {
  propertyId: string;
  propertyName: string;
  currentYield: number;
  marketYield: number;
  yieldGap: number;
  optimizationPotential: number;
  yieldDrivers: YieldDriver[];
  yieldOptimization: YieldOptimization[];
}

export interface YieldDriver {
  factor: string;
  impact: number;
  description: string;
  improvementPotential: number;
}

export interface YieldOptimization {
  strategy: string;
  expectedYieldIncrease: number;
  implementationCost: number;
  roi: number;
  timeframe: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export class RentMarketAnalytics {
  private marketData: MarketData[];
  private propertyRentData: PropertyRentData[];

  constructor(marketData: MarketData[], propertyRentData: PropertyRentData[]) {
    this.marketData = marketData;
    this.propertyRentData = propertyRentData;
  }

  /**
   * Analyze rent pricing for a specific property
   */
  analyzeRentPricing(propertyId: string): RentAnalysis {
    const property = this.propertyRentData.find(p => p.propertyId === propertyId);
    if (!property) {
      throw new Error(`Property ${propertyId} not found`);
    }

    // Get comparable market data
    const comparableMarketData = this.getComparableMarketData(property);
    
    // Calculate market statistics
    const marketAverage = this.calculateMarketAverage(comparableMarketData);
    const marketMedian = this.calculateMarketMedian(comparableMarketData);
    const marketRentRange = {
      min: Math.min(...comparableMarketData.map(d => d.averageRent)),
      max: Math.max(...comparableMarketData.map(d => d.averageRent))
    };

    // Determine market position
    const marketPosition = this.determineMarketPosition(property.currentRent, marketAverage, marketRentRange);
    
    // Calculate recommended rent
    const recommendedRent = this.calculateRecommendedRent(property, comparableMarketData);
    const rentAdjustment = recommendedRent - property.currentRent;
    const adjustmentPercentage = (rentAdjustment / property.currentRent) * 100;

    // Identify competitive advantages
    const competitiveAdvantage = this.identifyCompetitiveAdvantages(property, comparableMarketData);
    
    // Generate pricing recommendations
    const pricingRecommendations = this.generatePricingRecommendations(
      property,
      comparableMarketData,
      recommendedRent
    );

    // Forecast demand
    const demandForecast = this.forecastDemand(property, comparableMarketData);

    return {
      propertyId: property.propertyId,
      propertyName: property.propertyName,
      currentRent: property.currentRent,
      recommendedRent,
      rentAdjustment,
      adjustmentPercentage,
      marketPosition,
      marketRentRange,
      competitiveAdvantage,
      pricingRecommendations,
      demandForecast
    };
  }

  /**
   * Get comparable market data for a property
   */
  private getComparableMarketData(property: PropertyRentData): MarketData[] {
    return this.marketData.filter(market => {
      // Filter by property type
      if (market.propertyType !== property.propertyType) return false;
      
      // Filter by region (same city or nearby)
      const isSameRegion = market.region === property.location.region;
      const isSameCity = market.city === property.location.city;
      
      return isSameRegion || isSameCity;
    });
  }

  /**
   * Calculate market average rent
   */
  private calculateMarketAverage(marketData: MarketData[]): number {
    if (marketData.length === 0) return 0;
    const total = marketData.reduce((sum, data) => sum + data.averageRent, 0);
    return total / marketData.length;
  }

  /**
   * Calculate market median rent
   */
  private calculateMarketMedian(marketData: MarketData[]): number {
    if (marketData.length === 0) return 0;
    const sorted = [...marketData].sort((a, b) => a.averageRent - b.averageRent);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1].averageRent + sorted[mid].averageRent) / 2
      : sorted[mid].averageRent;
  }

  /**
   * Determine market position
   */
  private determineMarketPosition(
    currentRent: number,
    marketAverage: number,
    marketRentRange: { min: number; max: number }
  ): 'underpriced' | 'at_market' | 'overpriced' {
    const percentageBelow = ((currentRent - marketRentRange.min) / (marketRentRange.max - marketRentRange.min)) * 100;
    
    if (percentageBelow < 33) return 'underpriced';
    if (percentageBelow > 66) return 'overpriced';
    return 'at_market';
  }

  /**
   * Calculate recommended rent
   */
  private calculateRecommendedRent(property: PropertyRentData, marketData: MarketData[]): number {
    if (marketData.length === 0) return property.currentRent;

    // Base on market average
    const marketAverage = this.calculateMarketAverage(marketData);
    
    // Adjust for unit size
    const avgUnitSize = marketData.reduce((sum, d) => sum + d.unitSize, 0) / marketData.length;
    const sizeAdjustment = property.unitSize / avgUnitSize;
    
    // Adjust for amenities
    const propertyAmenities = property.amenities;
    const avgAmenities = marketData.reduce((sum, d) => sum + d.amenities.length, 0) / marketData.length;
    const amenityAdjustment = 1 + (propertyAmenities.length - avgAmenities) * 0.02;
    
    // Adjust for occupancy
    const occupancyAdjustment = property.occupancyRate > 0.9 ? 1.05 : property.occupancyRate > 0.8 ? 1.0 : 0.95;
    
    // Calculate recommended rent
    const recommendedRent = marketAverage * sizeAdjustment * amenityAdjustment * occupancyAdjustment;
    
    return Math.round(recommendedRent);
  }

  /**
   * Identify competitive advantages
   */
  private identifyCompetitiveAdvantages(property: PropertyRentData, marketData: MarketData[]): string[] {
    const advantages: string[] = [];
    
    // Check amenities advantage
    const avgAmenities = marketData.reduce((sum, d) => sum + d.amenities.length, 0) / marketData.length;
    if (property.amenities.length > avgAmenities + 2) {
      advantages.push('Superior amenities compared to market average');
    }

    // Check occupancy advantage
    const avgOccupancy = marketData.reduce((sum, d) => sum + d.occupancyRate, 0) / marketData.length;
    if (property.occupancyRate > avgOccupancy + 0.1) {
      advantages.push('Higher occupancy rate than market average');
    }

    // Check location advantage (simplified)
    const avgVacancy = marketData.reduce((sum, d) => sum + d.vacancyRate, 0) / marketData.length;
    if (property.daysVacant < avgVacancy * 30) {
      advantages.push('Faster rental turnover than market average');
    }

    return advantages;
  }

  /**
   * Generate pricing recommendations
   */
  private generatePricingRecommendations(
    property: PropertyRentData,
    marketData: MarketData[],
    recommendedRent: number
  ): PricingRecommendation[] {
    const recommendations: PricingRecommendation[] = [];
    const currentRent = property.currentRent;
    const adjustment = recommendedRent - currentRent;
    const percentage = (adjustment / currentRent) * 100;

    if (percentage > 5) {
      recommendations.push({
        type: 'increase',
        amount: adjustment,
        percentage,
        reasoning: 'Property is underpriced compared to market',
        confidence: Math.min(percentage / 2, 90),
        timeframe: '30-60 days',
        expectedImpact: 'Increase revenue by 5-10%'
      });
    } else if (percentage < -5) {
      recommendations.push({
        type: 'decrease',
        amount: Math.abs(adjustment),
        percentage: Math.abs(percentage),
        reasoning: 'Property is overpriced compared to market',
        confidence: Math.min(Math.abs(percentage) / 2, 90),
        timeframe: 'Immediate',
        expectedImpact: 'Improve occupancy rate by 10-15%'
      });
    } else {
      recommendations.push({
        type: 'maintain',
        amount: 0,
        percentage: 0,
        reasoning: 'Property is priced at market level',
        confidence: 85,
        timeframe: 'Ongoing',
        expectedImpact: 'Maintain current occupancy and revenue'
      });
    }

    // Add seasonal recommendations
    const seasonality = this.analyzeSeasonality(property.location.region);
    if (seasonality.currentMonth in seasonality.peakMonths) {
      recommendations.push({
        type: 'increase',
        amount: currentRent * 0.03,
        percentage: 3,
        reasoning: 'Peak rental season - consider slight increase',
        confidence: 70,
        timeframe: 'Current season',
        expectedImpact: 'Capitalize on high demand'
      });
    }

    return recommendations;
  }

  /**
   * Forecast demand
   */
  private forecastDemand(property: PropertyRentData, marketData: MarketData[]): DemandForecast {
    const avgVacancy = marketData.reduce((sum, d) => sum + d.vacancyRate, 0) / marketData.length;
    const avgOccupancy = marketData.reduce((sum, d) => sum + d.occupancyRate, 0) / marketData.length;
    const avgGrowth = marketData.reduce((sum, d) => sum + d.rentGrowthRate, 0) / marketData.length;

    // Determine current demand
    const currentDemand = property.occupancyRate > 0.9 ? 'high' : property.occupancyRate > 0.75 ? 'medium' : 'low';
    
    // Determine forecast demand based on market trends
    const forecastDemand = avgGrowth > 0.03 ? 'high' : avgGrowth > 0 ? 'medium' : 'low';
    
    // Determine trend
    const trend = avgGrowth > 0.02 ? 'increasing' : avgGrowth > -0.01 ? 'stable' : 'decreasing';

    // Analyze seasonality
    const seasonality = this.analyzeSeasonality(property.location.region);

    // Identify demand factors
    const factors: DemandFactor[] = [
      {
        factor: 'Market Growth Rate',
        impact: avgGrowth > 0 ? 'positive' : 'negative',
        magnitude: Math.abs(avgGrowth) * 100,
        description: `Market rent growing at ${(avgGrowth * 100).toFixed(1)}% annually`
      },
      {
        factor: 'Vacancy Rate',
        impact: avgVacancy < 0.05 ? 'positive' : avgVacancy < 0.1 ? 'neutral' : 'negative',
        magnitude: avgVacancy * 100,
        description: `Market vacancy rate at ${(avgVacancy * 100).toFixed(1)}%`
      },
      {
        factor: 'Seasonal Demand',
        impact: seasonality.isPeakSeason ? 'positive' : 'neutral',
        magnitude: seasonality.averageSeasonalVariation * 100,
        description: seasonality.isPeakSeason ? 'Currently in peak rental season' : 'Standard seasonal demand'
      }
    ];

    return {
      currentDemand,
      forecastDemand,
      trend,
      seasonality,
      factors
    };
  }

  /**
   * Analyze seasonality for a region
   */
  private analyzeSeasonality(region: string): SeasonalityPattern & { isPeakSeason: boolean; currentMonth: number } {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    
    // Simplified seasonality patterns (would be data-driven in production)
    const peakMonths = [5, 6, 7, 8]; // May-August (summer peak)
    const lowMonths = [11, 12, 1, 2]; // Nov-Feb (winter low)
    
    const isPeakSeason = peakMonths.includes(currentMonth);
    const isLowSeason = lowMonths.includes(currentMonth);
    
    const averageSeasonalVariation = isPeakSeason ? 0.15 : isLowSeason ? -0.1 : 0.05;

    return {
      peakMonths,
      lowMonths,
      averageSeasonalVariation,
      isPeakSeason,
      currentMonth
    };
  }

  /**
   * Compare property to market
   */
  compareToMarket(propertyId: string): MarketComparison {
    const property = this.propertyRentData.find(p => p.propertyId === propertyId);
    if (!property) {
      throw new Error(`Property ${propertyId} not found`);
    }

    const comparableMarketData = this.getComparableMarketData(property);
    const marketAverage = this.calculateMarketAverage(comparableMarketData);
    const marketMedian = this.calculateMarketMedian(comparableMarketData);

    // Calculate percentile
    const sortedRents = comparableMarketData.map(d => d.averageRent).sort((a, b) => a - b);
    const percentile = ((sortedRents.filter(r => r <= property.currentRent).length / sortedRents.length) * 100);

    // Find comparable properties
    const comparableProperties = this.findComparableProperties(property, comparableMarketData);

    // Calculate market share (simplified)
    const totalMarketUnits = comparableMarketData.reduce((sum, d) => sum + d.unitSize, 0);
    const marketShare = property.unitSize / totalMarketUnits;

    // Determine competitive position
    const competitivePosition = percentile > 75 ? 'leader' : percentile > 25 ? 'competitive' : 'lagging';

    return {
      propertyId: property.propertyId,
      propertyName: property.propertyName,
      marketAverage,
      marketMedian,
      marketPercentile: percentile,
      comparableProperties,
      marketShare,
      competitivePosition
    };
  }

  /**
   * Find comparable properties
   */
  private findComparableProperties(property: PropertyRentData, marketData: MarketData[]): ComparableProperty[] {
    return marketData
      .map(market => ({
        propertyId: market.region + '-' + market.city,
        propertyName: `${market.city} Market Average`,
        rent: market.averageRent,
        unitSize: market.unitSize,
        distance: 0, // Market data, not specific properties
        amenities: market.amenities,
        occupancyRate: market.occupancyRate,
        similarityScore: this.calculateSimilarityScore(property, market)
      }))
      .filter(p => p.similarityScore > 0.5)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5);
  }

  /**
   * Calculate similarity score between property and market data
   */
  private calculateSimilarityScore(property: PropertyRentData, market: MarketData): number {
    let score = 0;

    // Property type match
    if (property.propertyType === market.propertyType) score += 0.3;

    // Unit size similarity
    const sizeDiff = Math.abs(property.unitSize - market.unitSize) / Math.max(property.unitSize, market.unitSize);
    score += (1 - sizeDiff) * 0.3;

    // Amenities overlap
    const amenityOverlap = property.amenities.filter(a => market.amenities.includes(a)).length;
    const amenityScore = amenityOverlap / Math.max(property.amenities.length, market.amenities.length);
    score += amenityScore * 0.2;

    // Location similarity
    if (property.location.city === market.city) score += 0.2;

    return Math.min(score, 1);
  }

  /**
   * Analyze yield for a property
   */
  analyzeYield(propertyId: string): YieldAnalysis {
    const property = this.propertyRentData.find(p => p.propertyId === propertyId);
    if (!property) {
      throw new Error(`Property ${propertyId} not found`);
    }

    const comparableMarketData = this.getComparableMarketData(property);
    const marketAverage = this.calculateMarketAverage(comparableMarketData);

    // Calculate current yield (simplified)
    const currentYield = (property.currentRent * 12) / (property.currentRent * 12 * 10); // Simplified 10x multiplier
    const marketYield = (marketAverage * 12) / (marketAverage * 12 * 10);
    const yieldGap = currentYield - marketYield;

    // Calculate optimization potential
    const optimizationPotential = Math.max(0, -yieldGap * 100);

    // Identify yield drivers
    const yieldDrivers: YieldDriver[] = [
      {
        factor: 'Rent Level',
        impact: (property.currentRent / marketAverage - 1) * 100,
        description: `Current rent is ${((property.currentRent / marketAverage - 1) * 100).toFixed(1)}% ${property.currentRent > marketAverage ? 'above' : 'below'} market`,
        improvementPotential: property.currentRent < marketAverage ? (marketAverage - property.currentRent) / property.currentRent : 0
      },
      {
        factor: 'Occupancy Rate',
        impact: (property.occupancyRate - 0.9) * 100,
        description: `Occupancy rate at ${(property.occupancyRate * 100).toFixed(1)}%`,
        improvementPotential: property.occupancyRate < 0.95 ? (0.95 - property.occupancyRate) / property.occupancyRate : 0
      },
      {
        factor: 'Market Position',
        impact: 0,
        description: 'Based on regional market conditions',
        improvementPotential: 0.05
      }
    ];

    // Generate yield optimization strategies
    const yieldOptimization: YieldOptimization[] = [
      {
        strategy: 'Rent Optimization',
        expectedYieldIncrease: optimizationPotential * 0.4,
        implementationCost: 0,
        roi: 1000,
        timeframe: '30-60 days',
        riskLevel: 'low'
      },
      {
        strategy: 'Amenity Enhancement',
        expectedYieldIncrease: optimizationPotential * 0.3,
        implementationCost: property.currentRent * 2,
        roi: 150,
        timeframe: '3-6 months',
        riskLevel: 'medium'
      },
      {
        strategy: 'Marketing Campaign',
        expectedYieldIncrease: optimizationPotential * 0.2,
        implementationCost: property.currentRent * 0.5,
        roi: 200,
        timeframe: '1-3 months',
        riskLevel: 'low'
      }
    ];

    return {
      propertyId: property.propertyId,
      propertyName: property.propertyName,
      currentYield,
      marketYield,
      yieldGap,
      optimizationPotential,
      yieldDrivers,
      yieldOptimization
    };
  }

  /**
   * Get market overview for a region
   */
  getMarketOverview(region: string): {
    region: string;
    averageRent: number;
    medianRent: number;
    rentGrowthRate: number;
    vacancyRate: number;
    occupancyRate: number;
    propertyTypes: { type: string; count: number; averageRent: number }[];
    marketTrend: 'increasing' | 'stable' | 'decreasing';
    outlook: string;
  } {
    const regionData = this.marketData.filter(m => m.region === region);
    
    if (regionData.length === 0) {
      throw new Error(`No market data found for region: ${region}`);
    }

    const averageRent = this.calculateMarketAverage(regionData);
    const medianRent = this.calculateMarketMedian(regionData);
    const rentGrowthRate = regionData.reduce((sum, d) => sum + d.rentGrowthRate, 0) / regionData.length;
    const vacancyRate = regionData.reduce((sum, d) => sum + d.vacancyRate, 0) / regionData.length;
    const occupancyRate = regionData.reduce((sum, d) => sum + d.occupancyRate, 0) / regionData.length;

    // Group by property type
    const propertyTypeMap = new Map<string, { count: number; totalRent: number }>();
    regionData.forEach(data => {
      const current = propertyTypeMap.get(data.propertyType) || { count: 0, totalRent: 0 };
      propertyTypeMap.set(data.propertyType, {
        count: current.count + 1,
        totalRent: current.totalRent + data.averageRent
      });
    });

    const propertyTypes = Array.from(propertyTypeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      averageRent: data.totalRent / data.count
    }));

    const marketTrend = rentGrowthRate > 0.02 ? 'increasing' : rentGrowthRate > -0.01 ? 'stable' : 'decreasing';
    const outlook = marketTrend === 'increasing' 
      ? 'Strong market conditions with positive rent growth'
      : marketTrend === 'stable'
      ? 'Stable market with moderate growth potential'
      : 'Challenging market with declining rents';

    return {
      region,
      averageRent,
      medianRent,
      rentGrowthRate,
      vacancyRate,
      occupancyRate,
      propertyTypes,
      marketTrend,
      outlook
    };
  }
}
