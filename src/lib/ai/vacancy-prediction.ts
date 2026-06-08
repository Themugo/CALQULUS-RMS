/**
 * Vacancy Prediction Model
 * 
 * Implements ML-based vacancy prediction with:
 * - Historical vacancy analysis
 * - Seasonal pattern recognition
 * - Market trend analysis
 * - Property-specific predictions
 * - Revenue impact estimation
 * - Action recommendations
 */

// Vacancy prediction
export interface VacancyPrediction {
  propertyId: string;
  propertyName: string;
  predictionDate: Date;
  predictedVacancyRate: number; // 0-1
  confidence: number; // 0-1
  timeHorizon: number; // months
  factors: VacancyFactor[];
  recommendedActions: string[];
  revenueImpact: {
    monthlyLoss: number;
    annualLoss: number;
  };
}

// Vacancy factor
export interface VacancyFactor {
  name: string;
  impact: number; // -1 to 1
  description: string;
  category: 'seasonal' | 'market' | 'property' | 'economic';
}

// Historical vacancy data
export interface HistoricalVacancyData {
  propertyId: string;
  date: Date;
  vacancyRate: number;
  occupiedUnits: number;
  totalUnits: number;
  averageRent: number;
  marketRent: number;
}

// Market data
export interface MarketData {
  date: Date;
  averageVacancyRate: number;
  averageRent: number;
  demandIndex: number; // 0-1
  supplyIndex: number; // 0-1
}

/**
 * Predict vacancy
 */
export function predictVacancy(
  propertyId: string,
  propertyName: string,
  historicalData: HistoricalVacancyData[],
  marketData: MarketData[],
  timeHorizon: number = 6
): VacancyPrediction {
  const factors = analyzeVacancyFactors(historicalData, marketData);
  const predictedVacancyRate = calculateVacancyRate(historicalData, factors, timeHorizon);
  const confidence = calculatePredictionConfidence(historicalData, factors);
  const recommendedActions = generateRecommendedActions(predictedVacancyRate, factors);
  const revenueImpact = calculateRevenueImpact(predictedVacancyRate, historicalData);
  
  return {
    propertyId,
    propertyName,
    predictionDate: new Date(),
    predictedVacancyRate,
    confidence,
    timeHorizon,
    factors,
    recommendedActions,
    revenueImpact,
  };
}

/**
 * Analyze vacancy factors
 */
function analyzeVacancyFactors(
  historicalData: HistoricalVacancyData[],
  marketData: MarketData[]
): VacancyFactor[] {
  const factors: VacancyFactor[] = [];
  
  // Seasonal factor
  const seasonalFactor = calculateSeasonalFactor(historicalData);
  if (Math.abs(seasonalFactor) > 0.05) {
    factors.push({
      name: 'Seasonal Pattern',
      impact: seasonalFactor,
      description: seasonalFactor > 0 ? 'Seasonal trend indicates higher vacancy' : 'Seasonal trend indicates lower vacancy',
      category: 'seasonal',
    });
  }
  
  // Market factor
  const marketFactor = calculateMarketFactor(historicalData, marketData);
  if (Math.abs(marketFactor) > 0.05) {
    factors.push({
      name: 'Market Conditions',
      impact: marketFactor,
      description: marketFactor > 0 ? 'Market conditions suggest higher vacancy' : 'Market conditions suggest lower vacancy',
      category: 'market',
    });
  }
  
  // Rent competitiveness factor
  const rentFactor = calculateRentCompetitivenessFactor(historicalData);
  if (Math.abs(rentFactor) > 0.05) {
    factors.push({
      name: 'Rent Competitiveness',
      impact: rentFactor,
      description: rentFactor > 0 ? 'Rent above market suggests higher vacancy' : 'Rent below market suggests lower vacancy',
      category: 'property',
    });
  }
  
  // Historical trend factor
  const trendFactor = calculateTrendFactor(historicalData);
  if (Math.abs(trendFactor) > 0.05) {
    factors.push({
      name: 'Historical Trend',
      impact: trendFactor,
      description: trendFactor > 0 ? 'Increasing vacancy trend' : 'Decreasing vacancy trend',
      category: 'property',
    });
  }
  
  return factors;
}

/**
 * Calculate seasonal factor
 */
function calculateSeasonalFactor(historicalData: HistoricalVacancyData[]): number {
  if (historicalData.length < 12) return 0;
  
  const monthlyVacancyRates: Record<number, number[]> = {};
  
  for (const data of historicalData) {
    const month = data.date.getMonth();
    if (!monthlyVacancyRates[month]) {
      monthlyVacancyRates[month] = [];
    }
    monthlyVacancyRates[month].push(data.vacancyRate);
  }
  
  // Calculate average for each month
  const monthlyAverages: Record<number, number> = {};
  for (const month in monthlyVacancyRates) {
    const rates = monthlyVacancyRates[month];
    monthlyAverages[month] = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  }
  
  // Get current month and next month
  const currentMonth = new Date().getMonth();
  const nextMonth = (currentMonth + 1) % 12;
  
  const currentMonthAvg = monthlyAverages[currentMonth] || 0;
  const nextMonthAvg = monthlyAverages[nextMonth] || 0;
  
  // Calculate seasonal change
  return (nextMonthAvg - currentMonthAvg);
}

/**
 * Calculate market factor
 */
function calculateMarketFactor(
  historicalData: HistoricalVacancyData[],
  marketData: MarketData[]
): number {
  if (marketData.length === 0) return 0;
  
  // Get latest market data
  const latestMarketData = marketData[marketData.length - 1];
  
  // Get property's current vacancy rate
  const latestPropertyData = historicalData[historicalData.length - 1];
  
  // Compare property vacancy to market average
  const propertyVacancy = latestPropertyData.vacancyRate;
  const marketVacancy = latestMarketData.averageVacancyRate;
  
  // If property vacancy is higher than market, factor is positive (worse)
  return (propertyVacancy - marketVacancy) * 0.5;
}

/**
 * Calculate rent competitiveness factor
 */
function calculateRentCompetitivenessFactor(historicalData: HistoricalVacancyData[]): number {
  if (historicalData.length === 0) return 0;
  
  const latestData = historicalData[historicalData.length - 1];
  
  // Calculate rent ratio (property rent / market rent)
  const rentRatio = latestData.averageRent / latestData.marketRent;
  
  // If rent is above market, factor is positive (higher vacancy risk)
  return (rentRatio - 1) * 0.3;
}

/**
 * Calculate trend factor
 */
function calculateTrendFactor(historicalData: HistoricalVacancyData[]): number {
  if (historicalData.length < 3) return 0;
  
  // Get last 3 months
  const recentData = historicalData.slice(-3);
  
  // Calculate trend
  const firstRate = recentData[0].vacancyRate;
  const lastRate = recentData[recentData.length - 1].vacancyRate;
  
  return (lastRate - firstRate) * 0.5;
}

/**
 * Calculate vacancy rate
 */
function calculateVacancyRate(
  historicalData: HistoricalVacancyData[],
  factors: VacancyFactor[],
  timeHorizon: number
): number {
  if (historicalData.length === 0) return 0.1; // Default 10%
  
  const currentVacancyRate = historicalData[historicalData.length - 1].vacancyRate;
  
  // Calculate total factor impact
  const totalFactorImpact = factors.reduce((sum, factor) => sum + factor.impact, 0);
  
  // Apply factor impact over time horizon
  const projectedChange = totalFactorImpact * (timeHorizon / 12);
  
  // Calculate predicted vacancy rate
  let predictedRate = currentVacancyRate + projectedChange;
  
  // Ensure rate is between 0 and 1
  predictedRate = Math.max(0, Math.min(1, predictedRate));
  
  return predictedRate;
}

/**
 * Calculate prediction confidence
 */
function calculatePredictionConfidence(
  historicalData: HistoricalVacancyData[],
  factors: VacancyFactor[]
): number {
  let confidence = 0.5; // Base confidence
  
  // More historical data = higher confidence
  if (historicalData.length >= 12) {
    confidence += 0.2;
  } else if (historicalData.length >= 6) {
    confidence += 0.1;
  }
  
  // More factors = higher confidence
  confidence += Math.min(0.3, factors.length * 0.1);
  
  return Math.min(1, confidence);
}

/**
 * Generate recommended actions
 */
function generateRecommendedActions(vacancyRate: number, factors: VacancyFactor[]): string[] {
  const actions: string[] = [];
  
  if (vacancyRate > 0.2) {
    actions.push('Implement aggressive marketing campaigns');
    actions.push('Consider temporary rent reductions');
    actions.push('Enhance property amenities');
    actions.push('Review and improve tenant retention strategies');
  } else if (vacancyRate > 0.1) {
    actions.push('Increase marketing efforts');
    actions.push('Review rental rates against market');
    actions.push('Improve property curb appeal');
  } else if (vacancyRate < 0.05) {
    actions.push('Consider increasing rental rates');
    actions.push('Maintain current marketing strategy');
  }
  
  // Add specific actions based on factors
  for (const factor of factors) {
    if (factor.category === 'seasonal' && factor.impact > 0) {
      actions.push('Plan for seasonal vacancy increase with pre-emptive marketing');
    }
    
    if (factor.category === 'property' && factor.name === 'Rent Competitiveness' && factor.impact > 0) {
      actions.push('Review and adjust rental rates to match market');
    }
    
    if (factor.category === 'property' && factor.name === 'Historical Trend' && factor.impact > 0) {
      actions.push('Investigate root causes of increasing vacancy trend');
    }
  }
  
  return actions;
}

/**
 * Calculate revenue impact
 */
function calculateRevenueImpact(
  vacancyRate: number,
  historicalData: HistoricalVacancyData[]
): {
  monthlyLoss: number;
  annualLoss: number;
} {
  if (historicalData.length === 0) {
    return { monthlyLoss: 0, annualLoss: 0 };
  }
  
  const latestData = historicalData[historicalData.length - 1];
  const totalUnits = latestData.totalUnits;
  const averageRent = latestData.averageRent;
  
  const vacantUnits = Math.round(totalUnits * vacancyRate);
  const monthlyLoss = vacantUnits * averageRent;
  const annualLoss = monthlyLoss * 12;
  
  return {
    monthlyLoss,
    annualLoss,
  };
}

/**
 * Batch predict vacancies
 */
export function batchPredictVacancies(
  properties: Array<{ id: string; name: string }>,
  historicalDataMap: Record<string, HistoricalVacancyData[]>,
  marketData: MarketData[],
  timeHorizon: number = 6
): VacancyPrediction[] {
  return properties.map(property =>
    predictVacancy(
      property.id,
      property.name,
      historicalDataMap[property.id] || [],
      marketData,
      timeHorizon
    )
  );
}

/**
 * Get vacancy statistics
 */
export function getVacancyStatistics(predictions: VacancyPrediction[]): {
  totalProperties: number;
  averageVacancyRate: number;
  highRiskProperties: number;
  totalMonthlyRevenueLoss: number;
  totalAnnualRevenueLoss: number;
  byRiskLevel: Record<'low' | 'medium' | 'high', number>;
} {
  const averageVacancyRate = predictions.length > 0
    ? predictions.reduce((sum, p) => sum + p.predictedVacancyRate, 0) / predictions.length
    : 0;
  
  const highRiskProperties = predictions.filter(p => p.predictedVacancyRate > 0.15).length;
  
  const totalMonthlyRevenueLoss = predictions.reduce((sum, p) => sum + p.revenueImpact.monthlyLoss, 0);
  const totalAnnualRevenueLoss = predictions.reduce((sum, p) => sum + p.revenueImpact.annualLoss, 0);
  
  const byRiskLevel: Record<'low' | 'medium' | 'high', number> = {
    low: predictions.filter(p => p.predictedVacancyRate < 0.1).length,
    medium: predictions.filter(p => p.predictedVacancyRate >= 0.1 && p.predictedVacancyRate <= 0.15).length,
    high: predictions.filter(p => p.predictedVacancyRate > 0.15).length,
  };
  
  return {
    totalProperties: predictions.length,
    averageVacancyRate,
    highRiskProperties,
    totalMonthlyRevenueLoss,
    totalAnnualRevenueLoss,
    byRiskLevel,
  };
}

/**
 * Get high-risk properties
 */
export function getHighRiskProperties(predictions: VacancyPrediction[]): VacancyPrediction[] {
  return predictions.filter(p => p.predictedVacancyRate > 0.15);
}

/**
 * Get improvement opportunities
 */
export function getImprovementOpportunities(predictions: VacancyPrediction[]): Array<{
  propertyId: string;
  propertyName: string;
  currentVacancyRate: number;
  potentialImprovement: number;
  estimatedRevenueGain: number;
}> {
  return predictions
    .filter(p => p.predictedVacancyRate > 0.1)
    .map(p => ({
      propertyId: p.propertyId,
      propertyName: p.propertyName,
      currentVacancyRate: p.predictedVacancyRate,
      potentialImprovement: p.predictedVacancyRate * 0.5, // Assume 50% improvement possible
      estimatedRevenueGain: p.revenueImpact.monthlyLoss * 0.5,
    }))
    .sort((a, b) => b.estimatedRevenueGain - a.estimatedRevenueGain);
}

/**
 * Format vacancy rate
 */
export function formatVacancyRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount);
}
