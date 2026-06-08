/**
 * AI-Assisted Collections System
 * 
 * Implements AI-powered collections with:
 * - Payment prediction models
 * - Personalized collection strategies
 * - Risk scoring
 * - Behavioral analysis
 * - Optimal contact timing
 * - Collection effectiveness tracking
 */

// Payment prediction result
export interface PaymentPrediction {
  tenantId: string;
  leaseId: string;
  probability: number; // 0-1
  confidence: number; // 0-1
  predictedPaymentDate?: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: PaymentFactor[];
  recommendedAction: CollectionAction;
}

// Payment factor
export interface PaymentFactor {
  factor: string;
  impact: number; // -1 to 1
  description: string;
}

// Collection strategy
export enum CollectionStrategy {
  GENTLE_REMINDER = 'gentle_reminder',
  STANDARD_COLLECTION = 'standard_collection',
  AGGRESSIVE_COLLECTION = 'aggressive_collection',
  LEGAL_ACTION = 'legal_action',
  PAYMENT_PLAN = 'payment_plan',
  INCENTIVE_BASED = 'incentive_based',
}

// Collection action
export enum CollectionAction {
  SEND_REMINDER = 'send_reminder',
  CALL_TENANT = 'call_tenant',
  VISIT_PROPERTY = 'visit_property',
  OFFER_PAYMENT_PLAN = 'offer_payment_plan',
  OFFER_DISCOUNT = 'offer_discount',
  ESCALATE_TO_LEGAL = 'escalate_to_legal',
  SUSPEND_SERVICES = 'suspend_services',
  DO_NOTHING = 'do_nothing',
}

// Collection campaign
export interface CollectionCampaign {
  id: string;
  name: string;
  strategy: CollectionStrategy;
  startDate: Date;
  endDate: Date;
  targetTenants: string[];
  budget?: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  results?: CampaignResults;
}

// Campaign results
export interface CampaignResults {
  totalTargeted: number;
  totalContacted: number;
  paymentsReceived: number;
  amountCollected: number;
  collectionRate: number;
  averageCollectionTime: number;
  costPerCollection: number;
}

// Tenant payment history
export interface TenantPaymentHistory {
  tenantId: string;
  payments: Array<{
    amount: number;
    dueDate: Date;
    paidDate?: Date;
    daysLate?: number;
    paymentMethod: string;
  }>;
  onTimePaymentRate: number;
  averageDaysLate: number;
  totalAmountPaid: number;
  totalAmountDue: number;
}

// Behavioral pattern
export interface BehavioralPattern {
  tenantId: string;
  preferredPaymentDay: number; // 1-31
  preferredPaymentMethod: string;
  preferredContactTime: string;
  responseToReminders: 'high' | 'medium' | 'low';
  communicationPreference: 'sms' | 'email' | 'phone' | 'whatsapp';
}

/**
 * Predict payment probability
 */
export function predictPaymentProbability(
  tenantId: string,
  paymentHistory: TenantPaymentHistory,
  currentAmountDue: number,
  daysUntilDue: number
): PaymentPrediction {
  const factors: PaymentFactor[] = [];
  let probability = 0.5;
  const confidence = 0.7;

  // Factor 1: Historical on-time payment rate
  const onTimeRate = paymentHistory.onTimePaymentRate;
  factors.push({
    factor: 'Historical on-time payment rate',
    impact: (onTimeRate - 0.5) * 0.4,
    description: `Tenant has ${(onTimeRate * 100).toFixed(0)}% on-time payment rate`,
  });
  probability += (onTimeRate - 0.5) * 0.4;

  // Factor 2: Average days late
  const avgDaysLate = paymentHistory.averageDaysLate;
  if (avgDaysLate > 0) {
    const impact = Math.min(-avgDaysLate / 30, -0.3);
    factors.push({
      factor: 'Average days late',
      impact,
      description: `Average ${avgDaysLate.toFixed(0)} days late`,
    });
    probability += impact;
  }

  // Factor 3: Current amount due vs average
  const avgPayment = paymentHistory.payments.length > 0
    ? paymentHistory.payments.reduce((sum, p) => sum + p.amount, 0) / paymentHistory.payments.length
    : 0;
  if (avgPayment > 0) {
    const ratio = currentAmountDue / avgPayment;
    if (ratio > 1.5) {
      const impact = -0.2;
      factors.push({
        factor: 'Amount due vs average',
        impact,
        description: `Current amount is ${(ratio * 100).toFixed(0)}% of average`,
      });
      probability += impact;
    }
  }

  // Factor 4: Days until due
  if (daysUntilDue < 0) {
    const impact = Math.min(daysUntilDue / -60, -0.3);
    factors.push({
      factor: 'Days overdue',
      impact,
      description: `${Math.abs(daysUntilDue)} days overdue`,
    });
    probability += impact;
  } else if (daysUntilDue < 3) {
    factors.push({
      factor: 'Days until due',
      impact: 0.1,
      description: `${daysUntilDue} days until due`,
    });
    probability += 0.1;
  }

  // Clamp probability
  probability = Math.max(0, Math.min(1, probability));

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (probability >= 0.8) riskLevel = 'low';
  else if (probability >= 0.6) riskLevel = 'medium';
  else if (probability >= 0.4) riskLevel = 'high';
  else riskLevel = 'critical';

  // Recommend action
  const recommendedAction = recommendCollectionAction(riskLevel, daysUntilDue);

  return {
    tenantId,
    leaseId: '', // Would be populated from actual data
    probability,
    confidence,
    riskLevel,
    factors,
    recommendedAction,
  };
}

/**
 * Recommend collection action based on risk level
 */
function recommendCollectionAction(
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  daysUntilDue: number
): CollectionAction {
  if (riskLevel === 'low') {
    return CollectionAction.SEND_REMINDER;
  }

  if (riskLevel === 'medium') {
    if (daysUntilDue < 0) {
      return CollectionAction.CALL_TENANT;
    }
    return CollectionAction.SEND_REMINDER;
  }

  if (riskLevel === 'high') {
    if (daysUntilDue < -14) {
      return CollectionAction.OFFER_PAYMENT_PLAN;
    }
    return CollectionAction.CALL_TENANT;
  }

  // Critical risk
  if (daysUntilDue < -30) {
    return CollectionAction.ESCALATE_TO_LEGAL;
  }
  if (daysUntilDue < -14) {
    return CollectionAction.OFFER_PAYMENT_PLAN;
  }
  return CollectionAction.VISIT_PROPERTY;
}

/**
 * Generate personalized collection strategy
 */
export function generateCollectionStrategy(
  prediction: PaymentPrediction,
  behavioralPattern: BehavioralPattern
): CollectionStrategy {
  // High probability tenants
  if (prediction.probability >= 0.8) {
    return CollectionStrategy.GENTLE_REMINDER;
  }

  // Medium probability with good response to reminders
  if (prediction.probability >= 0.6 && behavioralPattern.responseToReminders === 'high') {
    return CollectionStrategy.STANDARD_COLLECTION;
  }

  // Low probability but responsive
  if (prediction.probability >= 0.4 && behavioralPattern.responseToReminders !== 'low') {
    return CollectionStrategy.INCENTIVE_BASED;
  }

  // High risk or unresponsive
  if (prediction.riskLevel === 'critical' || behavioralPattern.responseToReminders === 'low') {
    return CollectionStrategy.AGGRESSIVE_COLLECTION;
  }

  // Default
  return CollectionStrategy.STANDARD_COLLECTION;
}

/**
 * Calculate optimal contact time
 */
export function calculateOptimalContactTime(
  behavioralPattern: BehavioralPattern,
  daysUntilDue: number
): Date {
  const now = new Date();
  const [hour, minute] = behavioralPattern.preferredContactTime.split(':').map(Number);
  
  const optimalTime = new Date(now);
  optimalTime.setHours(hour, minute, 0, 0);
  
  // If optimal time has passed today, schedule for tomorrow
  if (optimalTime < now) {
    optimalTime.setDate(optimalTime.getDate() + 1);
  }
  
  // Adjust based on urgency
  if (daysUntilDue < 0 && Math.abs(daysUntilDue) > 7) {
    // For severely overdue, contact sooner
    optimalTime.setHours(optimalTime.getHours() - 2);
  }
  
  return optimalTime;
}

/**
 * Generate payment plan offer
 */
export function generatePaymentPlanOffer(
  amountDue: number,
  _paymentHistory: TenantPaymentHistory,
  months: number = 3
): {
  monthlyPayment: number;
  totalInterest: number;
  totalAmount: number;
  startDate: Date;
  endDate: Date;
} {
  const interestRate = 0.05; // 5% interest
  const monthlyPayment = (amountDue * (1 + interestRate)) / months;
  const totalInterest = amountDue * interestRate;
  const totalAmount = amountDue + totalInterest;
  
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + months);
  
  return {
    monthlyPayment,
    totalInterest,
    totalAmount,
    startDate,
    endDate,
  };
}

/**
 * Calculate collection effectiveness score
 */
export function calculateCollectionEffectiveness(
  campaign: CollectionCampaign
): number {
  if (!campaign.results) return 0;
  
  const { collectionRate, averageCollectionTime, costPerCollection } = campaign.results;
  
  // Normalize factors
  const rateScore = collectionRate / 100;
  const timeScore = Math.max(0, 1 - averageCollectionTime / 30); // Prefer faster collection
  const costScore = Math.max(0, 1 - costPerCollection / 100); // Prefer lower cost
  
  // Weighted average
  return (rateScore * 0.5) + (timeScore * 0.3) + (costScore * 0.2);
}

/**
 * Analyze behavioral patterns from payment history
 */
export function analyzeBehavioralPatterns(
  paymentHistory: TenantPaymentHistory
): BehavioralPattern {
  const payments = paymentHistory.payments;
  
  // Find preferred payment day
  const paymentDays = payments
    .filter(p => p.paidDate)
    .map(p => new Date(p.paidDate!).getDate());
  
  const dayCounts = new Map<number, number>();
  for (const day of paymentDays) {
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  }
  
  let preferredPaymentDay = 1;
  let maxCount = 0;
  for (const [day, count] of dayCounts) {
    if (count > maxCount) {
      maxCount = count;
      preferredPaymentDay = day;
    }
  }
  
  // Find preferred payment method
  const methodCounts = new Map<string, number>();
  for (const payment of payments) {
    methodCounts.set(payment.paymentMethod, (methodCounts.get(payment.paymentMethod) || 0) + 1);
  }
  
  let preferredPaymentMethod = 'mpesa';
  let maxMethodCount = 0;
  for (const [method, count] of methodCounts) {
    if (count > maxMethodCount) {
      maxMethodCount = count;
      preferredPaymentMethod = method;
    }
  }
  
  // Determine response to reminders (simplified)
  const onTimeRate = paymentHistory.onTimePaymentRate;
  let responseToReminders: 'high' | 'medium' | 'low';
  if (onTimeRate >= 0.8) responseToReminders = 'high';
  else if (onTimeRate >= 0.6) responseToReminders = 'medium';
  else responseToReminders = 'low';
  
  return {
    tenantId: paymentHistory.tenantId,
    preferredPaymentDay,
    preferredPaymentMethod,
    preferredContactTime: '09:00',
    responseToReminders,
    communicationPreference: 'sms',
  };
}

/**
 * Create collection campaign
 */
export function createCollectionCampaign(
  name: string,
  strategy: CollectionStrategy,
  startDate: Date,
  endDate: Date,
  targetTenants: string[],
  budget?: number
): CollectionCampaign {
  return {
    id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    strategy,
    startDate,
    endDate,
    targetTenants,
    budget,
    status: 'draft',
  };
}

/**
 * Execute collection campaign
 */
export function executeCollectionCampaign(
  campaign: CollectionCampaign
): CollectionCampaign {
  if (campaign.status !== 'draft') {
    throw new Error('Only draft campaigns can be executed');
  }
  
  return {
    ...campaign,
    status: 'active',
  };
}

/**
 * Get collection strategy label
 */
export function getCollectionStrategyLabel(strategy: CollectionStrategy): string {
  const labels: Record<CollectionStrategy, string> = {
    [CollectionStrategy.GENTLE_REMINDER]: 'Gentle Reminder',
    [CollectionStrategy.STANDARD_COLLECTION]: 'Standard Collection',
    [CollectionStrategy.AGGRESSIVE_COLLECTION]: 'Aggressive Collection',
    [CollectionStrategy.LEGAL_ACTION]: 'Legal Action',
    [CollectionStrategy.PAYMENT_PLAN]: 'Payment Plan',
    [CollectionStrategy.INCENTIVE_BASED]: 'Incentive-Based',
  };

  return labels[strategy];
}

/**
 * Get collection action label
 */
export function getCollectionActionLabel(action: CollectionAction): string {
  const labels: Record<CollectionAction, string> = {
    [CollectionAction.SEND_REMINDER]: 'Send Reminder',
    [CollectionAction.CALL_TENANT]: 'Call Tenant',
    [CollectionAction.VISIT_PROPERTY]: 'Visit Property',
    [CollectionAction.OFFER_PAYMENT_PLAN]: 'Offer Payment Plan',
    [CollectionAction.OFFER_DISCOUNT]: 'Offer Discount',
    [CollectionAction.ESCALATE_TO_LEGAL]: 'Escalate to Legal',
    [CollectionAction.SUSPEND_SERVICES]: 'Suspend Services',
    [CollectionAction.DO_NOTHING]: 'Do Nothing',
  };

  return labels[action];
}

/**
 * Get risk level color
 */
export function getRiskLevelColor(riskLevel: 'low' | 'medium' | 'high' | 'critical'): string {
  const colors: Record<typeof riskLevel, string> = {
    low: 'green',
    medium: 'yellow',
    high: 'orange',
    critical: 'red',
  };

  return colors[riskLevel];
}

/**
 * Segment tenants by risk level
 */
export function segmentTenantsByRisk(
  predictions: PaymentPrediction[]
): Record<'low' | 'medium' | 'high' | 'critical', PaymentPrediction[]> {
  return {
    low: predictions.filter(p => p.riskLevel === 'low'),
    medium: predictions.filter(p => p.riskLevel === 'medium'),
    high: predictions.filter(p => p.riskLevel === 'high'),
    critical: predictions.filter(p => p.riskLevel === 'critical'),
  };
}

/**
 * Calculate collection ROI
 */
export function calculateCollectionROI(
  campaign: CollectionCampaign
): number {
  if (!campaign.results || !campaign.budget) return 0;
  
  const { amountCollected } = campaign.results;
  const cost = campaign.budget;
  
  if (cost === 0) return 0;
  
  return ((amountCollected - cost) / cost) * 100;
}
