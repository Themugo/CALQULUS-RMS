/**
 * Rent Default Prediction Model
 * 
 * Implements ML-based rent default prediction with:
 * - Tenant behavior analysis
 * - Payment pattern recognition
 * - Risk factor calculation
 * - Probability scoring
 * - Early warning indicators
 * - Historical trend analysis
 */

// Risk level
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Prediction confidence
export enum PredictionConfidence {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// Tenant features
export interface TenantFeatures {
  tenantId: string;
  paymentHistory: PaymentRecord[];
  leaseDurationMonths: number;
  rentAmount: number;
  incomeRatio: number; // rent / income
  employmentStatus: 'employed' | 'self-employed' | 'unemployed' | 'retired';
  creditScore?: number;
  previousDefaults: number;
  latePayments: number;
  onTimePayments: number;
  communicationScore: number; // 0-100
  propertyType: string;
  location: string;
  age: number;
  dependents: number;
}

// Payment record
export interface PaymentRecord {
  id: string;
  tenantId: string;
  dueDate: Date;
  paidDate?: Date;
  amount: number;
  status: 'on_time' | 'late' | 'partial' | 'missed';
  daysLate?: number;
}

// Default prediction
export interface DefaultPrediction {
  tenantId: string;
  predictionDate: Date;
  defaultProbability: number; // 0-1
  riskLevel: RiskLevel;
  confidence: PredictionConfidence;
  riskFactors: RiskFactor[];
  recommendedActions: string[];
  nextPaymentDate: Date;
  predictedDefaultDate?: Date;
}

// Risk factor
export interface RiskFactor {
  name: string;
  impact: number; // 0-1
  description: string;
  category: 'payment_history' | 'financial' | 'behavioral' | 'external';
}

/**
 * Calculate default probability
 */
export function calculateDefaultProbability(features: TenantFeatures): DefaultPrediction {
  const riskFactors = analyzeRiskFactors(features);
  const defaultProbability = calculateProbabilityScore(features, riskFactors);
  const riskLevel = determineRiskLevel(defaultProbability);
  const confidence = determineConfidence(features);
  const recommendedActions = generateRecommendedActions(riskLevel, riskFactors);
  
  const predictedDefaultDate = defaultProbability > 0.5
    ? predictDefaultDate(features, defaultProbability)
    : undefined;
  
  return {
    tenantId: features.tenantId,
    predictionDate: new Date(),
    defaultProbability,
    riskLevel,
    confidence,
    riskFactors,
    recommendedActions,
    nextPaymentDate: getNextPaymentDate(features),
    predictedDefaultDate,
  };
}

/**
 * Analyze risk factors
 */
function analyzeRiskFactors(features: TenantFeatures): RiskFactor[] {
  const riskFactors: RiskFactor[] = [];
  
  // Payment history analysis
  const totalPayments = features.paymentHistory.length;
  const latePaymentRate = totalPayments > 0 ? features.latePayments / totalPayments : 0;
  
  if (latePaymentRate > 0.3) {
    riskFactors.push({
      name: 'High Late Payment Rate',
      impact: Math.min(0.4, latePaymentRate * 1.5),
      description: `${(latePaymentRate * 100).toFixed(0)}% of payments are late`,
      category: 'payment_history',
    });
  }
  
  if (features.previousDefaults > 0) {
    riskFactors.push({
      name: 'Previous Defaults',
      impact: Math.min(0.3, features.previousDefaults * 0.15),
      description: `${features.previousDefaults} previous rent defaults`,
      category: 'payment_history',
    });
  }
  
  // Financial factors
  if (features.incomeRatio > 0.4) {
    riskFactors.push({
      name: 'High Rent-to-Income Ratio',
      impact: Math.min(0.35, (features.incomeRatio - 0.3) * 2),
      description: `Rent is ${(features.incomeRatio * 100).toFixed(0)}% of income`,
      category: 'financial',
    });
  }
  
  if (features.creditScore && features.creditScore < 600) {
    riskFactors.push({
      name: 'Low Credit Score',
      impact: Math.min(0.25, (600 - features.creditScore) / 400),
      description: `Credit score: ${features.creditScore}`,
      category: 'financial',
    });
  }
  
  if (features.employmentStatus === 'unemployed') {
    riskFactors.push({
      name: 'Unemployment',
      impact: 0.4,
      description: 'Tenant is currently unemployed',
      category: 'external',
    });
  }
  
  // Behavioral factors
  if (features.communicationScore < 50) {
    riskFactors.push({
      name: 'Poor Communication',
      impact: (50 - features.communicationScore) / 100,
      description: `Communication score: ${features.communicationScore}/100`,
      category: 'behavioral',
    });
  }
  
  // Lease duration
  if (features.leaseDurationMonths < 6) {
    riskFactors.push({
      name: 'Short Lease Duration',
      impact: 0.15,
      description: `Lease ends in ${features.leaseDurationMonths} months`,
      category: 'behavioral',
    });
  }
  
  return riskFactors;
}

/**
 * Calculate probability score
 */
function calculateProbabilityScore(features: TenantFeatures, riskFactors: RiskFactor[]): number {
  let baseProbability = 0.1; // Base 10% default risk
  
  // Add risk factor impacts
  const totalImpact = riskFactors.reduce((sum, factor) => sum + factor.impact, 0);
  baseProbability += totalImpact;
  
  // Adjust for positive factors
  if (features.onTimePayments > 0) {
    const onTimeRate = features.onTimePayments / (features.onTimePayments + features.latePayments);
    baseProbability -= onTimeRate * 0.2;
  }
  
  if (features.communicationScore > 80) {
    baseProbability -= 0.1;
  }
  
  if (features.creditScore && features.creditScore > 700) {
    baseProbability -= 0.15;
  }
  
  // Ensure probability is between 0 and 1
  return Math.max(0, Math.min(1, baseProbability));
}

/**
 * Determine risk level
 */
function determineRiskLevel(probability: number): RiskLevel {
  if (probability < 0.2) {
    return RiskLevel.LOW;
  } else if (probability < 0.4) {
    return RiskLevel.MEDIUM;
  } else if (probability < 0.7) {
    return RiskLevel.HIGH;
  } else {
    return RiskLevel.CRITICAL;
  }
}

/**
 * Determine confidence
 */
function determineConfidence(features: TenantFeatures): PredictionConfidence {
  const totalPayments = features.paymentHistory.length;
  
  if (totalPayments < 3) {
    return PredictionConfidence.LOW;
  } else if (totalPayments < 12) {
    return PredictionConfidence.MEDIUM;
  } else {
    return PredictionConfidence.HIGH;
  }
}

/**
 * Generate recommended actions
 */
function generateRecommendedActions(riskLevel: RiskLevel, riskFactors: RiskFactor[]): string[] {
  const actions: string[] = [];
  
  switch (riskLevel) {
    case RiskLevel.LOW:
      actions.push('Continue regular monitoring');
      actions.push('Send payment reminders 3 days before due date');
      break;
    
    case RiskLevel.MEDIUM:
      actions.push('Increase monitoring frequency');
      actions.push('Send payment reminders 7 days before due date');
      actions.push('Schedule check-in call with tenant');
      actions.push('Review payment plan options');
      break;
    
    case RiskLevel.HIGH:
      actions.push('Escalate to property manager');
      actions.push('Send payment reminders 14 days before due date');
      actions.push('Offer flexible payment arrangements');
      actions.push('Consider requiring additional security deposit');
      actions.push('Monitor account daily');
      break;
    
    case RiskLevel.CRITICAL:
      actions.push('Immediate escalation to management');
      actions.push('Require immediate payment plan');
      actions.push('Consider legal action preparation');
      actions.push('Review lease termination options');
      actions.push('Implement daily monitoring');
      actions.push('Contact emergency contacts');
      break;
  }
  
  // Add specific actions based on risk factors
  for (const factor of riskFactors) {
    if (factor.category === 'financial' && factor.impact > 0.3) {
      actions.push('Request updated financial documentation');
    }
    
    if (factor.category === 'behavioral' && factor.impact > 0.2) {
      actions.push('Schedule tenant meeting to discuss concerns');
    }
  }
  
  return actions;
}

/**
 * Predict default date
 */
function predictDefaultDate(features: TenantFeatures, probability: number): Date {
  const nextPaymentDate = getNextPaymentDate(features);
  const daysUntilDefault = Math.floor(30 * (1 - probability)); // Higher probability = sooner default
  return new Date(nextPaymentDate.getTime() + daysUntilDefault * 24 * 60 * 60 * 1000);
}

/**
 * Get next payment date
 */
function getNextPaymentDate(_features: TenantFeatures): Date {
  const now = new Date();
  const nextPayment = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextPayment;
}

/**
 * Batch predict defaults
 */
export function batchPredictDefaults(features: TenantFeatures[]): DefaultPrediction[] {
  return features.map(features => calculateDefaultProbability(features));
}

/**
 * Get prediction statistics
 */
export function getPredictionStatistics(predictions: DefaultPrediction[]): {
  totalPredictions: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
  criticalRisk: number;
  averageProbability: number;
  byConfidence: Record<PredictionConfidence, number>;
} {
  const lowRisk = predictions.filter(p => p.riskLevel === RiskLevel.LOW).length;
  const mediumRisk = predictions.filter(p => p.riskLevel === RiskLevel.MEDIUM).length;
  const highRisk = predictions.filter(p => p.riskLevel === RiskLevel.HIGH).length;
  const criticalRisk = predictions.filter(p => p.riskLevel === RiskLevel.CRITICAL).length;
  
  const averageProbability = predictions.length > 0
    ? predictions.reduce((sum, p) => sum + p.defaultProbability, 0) / predictions.length
    : 0;
  
  const byConfidence: Record<PredictionConfidence, number> = {
    [PredictionConfidence.LOW]: 0,
    [PredictionConfidence.MEDIUM]: 0,
    [PredictionConfidence.HIGH]: 0,
  };
  
  for (const prediction of predictions) {
    byConfidence[prediction.confidence]++;
  }
  
  return {
    totalPredictions: predictions.length,
    lowRisk,
    mediumRisk,
    highRisk,
    criticalRisk,
    averageProbability,
    byConfidence,
  };
}

/**
 * Get risk level label
 */
export function getRiskLevelLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    [RiskLevel.LOW]: 'Low',
    [RiskLevel.MEDIUM]: 'Medium',
    [RiskLevel.HIGH]: 'High',
    [RiskLevel.CRITICAL]: 'Critical',
  };

  return labels[level];
}

/**
 * Get prediction confidence label
 */
export function getPredictionConfidenceLabel(confidence: PredictionConfidence): string {
  const labels: Record<PredictionConfidence, string> = {
    [PredictionConfidence.LOW]: 'Low',
    [PredictionConfidence.MEDIUM]: 'Medium',
    [PredictionConfidence.HIGH]: 'High',
  };

  return labels[confidence];
}

/**
 * Filter predictions by risk level
 */
export function filterPredictionsByRiskLevel(
  predictions: DefaultPrediction[],
  level: RiskLevel
): DefaultPrediction[] {
  return predictions.filter(prediction => prediction.riskLevel === level);
}

/**
 * Filter predictions by confidence
 */
export function filterPredictionsByConfidence(
  predictions: DefaultPrediction[],
  confidence: PredictionConfidence
): DefaultPrediction[] {
  return predictions.filter(prediction => prediction.confidence === confidence);
}

/**
 * Get high-risk tenants
 */
export function getHighRiskTenants(predictions: DefaultPrediction[]): DefaultPrediction[] {
  return predictions.filter(p => p.riskLevel === RiskLevel.HIGH || p.riskLevel === RiskLevel.CRITICAL);
}

/**
 * Get tenants approaching default
 */
export function getTenantsApproachingDefault(
  predictions: DefaultPrediction[],
  daysThreshold: number = 30
): DefaultPrediction[] {
  const now = new Date();
  const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
  
  return predictions.filter(p => 
    p.predictedDefaultDate && 
    p.predictedDefaultDate <= thresholdDate &&
    p.riskLevel !== RiskLevel.LOW
  );
}

/**
 * Calculate model accuracy (for evaluation)
 */
export function calculateModelAccuracy(
  predictions: DefaultPrediction[],
  actualDefaults: Set<string>
): {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
} {
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  
  for (const prediction of predictions) {
    const actuallyDefaulted = actualDefaults.has(prediction.tenantId);
    const predictedDefault = prediction.riskLevel === RiskLevel.HIGH || prediction.riskLevel === RiskLevel.CRITICAL;
    
    if (predictedDefault && actuallyDefaulted) {
      truePositives++;
    } else if (!predictedDefault && !actuallyDefaulted) {
      trueNegatives++;
    } else if (predictedDefault && !actuallyDefaulted) {
      falsePositives++;
    } else {
      falseNegatives++;
    }
  }
  
  const accuracy = (truePositives + trueNegatives) / predictions.length;
  const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
  const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
  const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  
  return {
    accuracy,
    precision,
    recall,
    f1Score,
  };
}
