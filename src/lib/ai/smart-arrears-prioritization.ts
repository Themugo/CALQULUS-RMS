/**
 * Smart Arrears Prioritization System
 * 
 * Implements AI-powered arrears prioritization with:
 * - Collection priority scoring
 * - Payment likelihood prediction
 * - Optimal contact timing
 * - Collection strategy recommendation
 * - Behavioral pattern analysis
 * - Recovery probability estimation
 */

// Priority level
export enum PriorityLevel {
  URGENT = 'urgent',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// Collection strategy
export enum CollectionStrategy {
  IMMEDIATE_CONTACT = 'immediate_contact',
  PAYMENT_PLAN = 'payment_plan',
  LEGAL_NOTICE = 'legal_notice',
  ESCALATION = 'escalation',
  WRITE_OFF = 'write_off',
}

// Arrears case
export interface ArrearsCase {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  unitId: string;
  amountDue: number;
  amountOverdue: number;
  daysOverdue: number;
  dueDate: Date;
  lastPaymentDate?: Date;
  paymentHistory: PaymentRecord[];
  contactAttempts: ContactAttempt[];
  priorityScore: number;
  priorityLevel: PriorityLevel;
  recommendedStrategy: CollectionStrategy;
  recoveryProbability: number;
  optimalContactTime?: Date;
  notes: string;
}

// Payment record
export interface PaymentRecord {
  id: string;
  tenantId: string;
  amount: number;
  paidDate: Date;
  daysLate: number;
  method: string;
}

// Contact attempt
export interface ContactAttempt {
  id: string;
  tenantId: string;
  date: Date;
  method: 'email' | 'sms' | 'phone' | 'in_person';
  successful: boolean;
  response?: string;
}

// Prioritization factors
export interface PrioritizationFactors {
  amountOverdue: number;
  daysOverdue: number;
  paymentHistoryScore: number;
  tenantResponsiveness: number;
  propertyValue: number;
  tenantTenure: number;
  previousDefaults: number;
  communicationScore: number;
}

/**
 * Calculate arrears priority score
 */
export function calculateArrearsPriority(arrearsCase: ArrearsCase): ArrearsCase {
  const factors = extractPrioritizationFactors(arrearsCase);
  const priorityScore = calculatePriorityScore(factors);
  const priorityLevel = determinePriorityLevel(priorityScore);
  const recommendedStrategy = recommendCollectionStrategy(arrearsCase, factors);
  const recoveryProbability = estimateRecoveryProbability(arrearsCase, factors);
  const optimalContactTime = calculateOptimalContactTime(arrearsCase);
  
  return {
    ...arrearsCase,
    priorityScore,
    priorityLevel,
    recommendedStrategy,
    recoveryProbability,
    optimalContactTime,
  };
}

/**
 * Extract prioritization factors
 */
function extractPrioritizationFactors(arrearsCase: ArrearsCase): PrioritizationFactors {
  const paymentHistoryScore = calculatePaymentHistoryScore(arrearsCase.paymentHistory);
  const tenantResponsiveness = calculateTenantResponsiveness(arrearsCase.contactAttempts);
  const tenantTenure = calculateTenantTenure(arrearsCase.paymentHistory);
  const previousDefaults = countPreviousDefaults(arrearsCase.paymentHistory);
  const communicationScore = calculateCommunicationScore(arrearsCase.contactAttempts);
  
  return {
    amountOverdue: arrearsCase.amountOverdue,
    daysOverdue: arrearsCase.daysOverdue,
    paymentHistoryScore,
    tenantResponsiveness,
    propertyValue: 0, // Would need property data
    tenantTenure,
    previousDefaults,
    communicationScore,
  };
}

/**
 * Calculate payment history score
 */
function calculatePaymentHistoryScore(paymentHistory: PaymentRecord[]): number {
  if (paymentHistory.length === 0) return 50;
  
  const onTimePayments = paymentHistory.filter(p => p.daysLate === 0).length;
  const latePayments = paymentHistory.filter(p => p.daysLate > 0).length;
  
  const totalPayments = onTimePayments + latePayments;
  if (totalPayments === 0) return 50;
  
  return (onTimePayments / totalPayments) * 100;
}

/**
 * Calculate tenant responsiveness
 */
function calculateTenantResponsiveness(contactAttempts: ContactAttempt[]): number {
  if (contactAttempts.length === 0) return 50;
  
  const successfulContacts = contactAttempts.filter(c => c.successful).length;
  return (successfulContacts / contactAttempts.length) * 100;
}

/**
 * Calculate tenant tenure
 */
function calculateTenantTenure(paymentHistory: PaymentRecord[]): number {
  if (paymentHistory.length === 0) return 0;
  
  const firstPayment = paymentHistory.reduce((earliest, p) => 
    p.paidDate < earliest.paidDate ? p : earliest
  );
  
  const now = new Date();
  const months = (now.getTime() - firstPayment.paidDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
  
  return Math.max(0, months);
}

/**
 * Count previous defaults
 */
function countPreviousDefaults(paymentHistory: PaymentRecord[]): number {
  return paymentHistory.filter(p => p.daysLate > 30).length;
}

/**
 * Calculate communication score
 */
function calculateCommunicationScore(contactAttempts: ContactAttempt[]): number {
  if (contactAttempts.length === 0) return 50;
  
  const recentAttempts = contactAttempts.filter(c => {
    const daysSinceContact = (Date.now() - c.date.getTime()) / (24 * 60 * 60 * 1000);
    return daysSinceContact <= 30;
  });
  
  const successfulRecent = recentAttempts.filter(c => c.successful).length;
  
  return recentAttempts.length > 0 ? (successfulRecent / recentAttempts.length) * 100 : 50;
}

/**
 * Calculate priority score
 */
function calculatePriorityScore(factors: PrioritizationFactors): number {
  let score = 0;
  
  // Amount overdue (0-30 points)
  score += Math.min(30, factors.amountOverdue / 10000);
  
  // Days overdue (0-25 points)
  score += Math.min(25, factors.daysOverdue / 2);
  
  // Payment history (0-15 points - inverted)
  score += (100 - factors.paymentHistoryScore) * 0.15;
  
  // Tenant responsiveness (0-10 points - inverted)
  score += (100 - factors.tenantResponsiveness) * 0.1;
  
  // Previous defaults (0-15 points)
  score += Math.min(15, factors.previousDefaults * 5);
  
  // Communication score (0-5 points - inverted)
  score += (100 - factors.communicationScore) * 0.05;
  
  return Math.min(100, score);
}

/**
 * Determine priority level
 */
function determinePriorityLevel(score: number): PriorityLevel {
  if (score >= 80) {
    return PriorityLevel.URGENT;
  } else if (score >= 60) {
    return PriorityLevel.HIGH;
  } else if (score >= 40) {
    return PriorityLevel.MEDIUM;
  } else {
    return PriorityLevel.LOW;
  }
}

/**
 * Recommend collection strategy
 */
function recommendCollectionStrategy(arrearsCase: ArrearsCase, factors: PrioritizationFactors): CollectionStrategy {
  if (arrearsCase.daysOverdue > 90) {
    return CollectionStrategy.LEGAL_NOTICE;
  }
  
  if (arrearsCase.daysOverdue > 60) {
    return CollectionStrategy.ESCALATION;
  }
  
  if (factors.tenantResponsiveness > 70 && factors.paymentHistoryScore > 60) {
    return CollectionStrategy.PAYMENT_PLAN;
  }
  
  if (arrearsCase.daysOverdue > 30) {
    return CollectionStrategy.IMMEDIATE_CONTACT;
  }
  
  return CollectionStrategy.IMMEDIATE_CONTACT;
}

/**
 * Estimate recovery probability
 */
function estimateRecoveryProbability(_arrearsCase: ArrearsCase, factors: PrioritizationFactors): number {
  let probability = 0.5; // Base 50%
  
  // Payment history impact
  probability += (factors.paymentHistoryScore - 50) * 0.003;
  
  // Tenant responsiveness impact
  probability += (factors.tenantResponsiveness - 50) * 0.002;
  
  // Days overdue impact (inverted)
  probability -= Math.min(0.3, factors.daysOverdue / 100);
  
  // Amount overdue impact (inverted)
  probability -= Math.min(0.2, factors.amountOverdue / 50000);
  
  // Previous defaults impact
  probability -= factors.previousDefaults * 0.05;
  
  return Math.max(0, Math.min(1, probability));
}

/**
 * Calculate optimal contact time
 */
function calculateOptimalContactTime(arrearsCase: ArrearsCase): Date {
  const now = new Date();
  
  // Calculate best time based on payment patterns
  const paymentDays = arrearsCase.paymentHistory.map(p => p.paidDate.getDay());
  const mostCommonDay = getMostCommonDay(paymentDays);
  
  const optimalDate = new Date(now);
  const daysToAdd = (mostCommonDay - now.getDay() + 7) % 7;
  optimalDate.setDate(optimalDate.getDate() + daysToAdd);
  optimalDate.setHours(10, 0, 0, 0); // 10 AM
  
  return optimalDate;
}

/**
 * Get most common day of week
 */
function getMostCommonDay(days: number[]): number {
  const counts = new Array(7).fill(0);
  for (const day of days) {
    counts[day]++;
  }
  
  return counts.indexOf(Math.max(...counts));
}

/**
 * Batch prioritize arrears
 */
export function batchPrioritizeArrears(cases: ArrearsCase[]): ArrearsCase[] {
  return cases.map(arrearsCase => calculateArrearsPriority(arrearsCase));
}

/**
 * Get prioritized arrears list
 */
export function getPrioritizedArrears(cases: ArrearsCase[]): ArrearsCase[] {
  const prioritized = batchPrioritizeArrears(cases);
  return prioritized.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Filter by priority level
 */
export function filterByPriorityLevel(cases: ArrearsCase[], level: PriorityLevel): ArrearsCase[] {
  return cases.filter(arrearsCase => arrearsCase.priorityLevel === level);
}

/**
 * Filter by collection strategy
 */
export function filterByCollectionStrategy(cases: ArrearsCase[], strategy: CollectionStrategy): ArrearsCase[] {
  return cases.filter(arrearsCase => arrearsCase.recommendedStrategy === strategy);
}

/**
 * Get arrears statistics
 */
export function getArrearsStatistics(cases: ArrearsCase[]): {
  totalCases: number;
  totalAmountOverdue: number;
  averageDaysOverdue: number;
  byPriorityLevel: Record<PriorityLevel, number>;
  byStrategy: Record<CollectionStrategy, number>;
  averageRecoveryProbability: number;
  highValueCases: number;
} {
  const totalAmountOverdue = cases.reduce((sum, c) => sum + c.amountOverdue, 0);
  const averageDaysOverdue = cases.length > 0
    ? cases.reduce((sum, c) => sum + c.daysOverdue, 0) / cases.length
    : 0;
  
  const byPriorityLevel: Record<PriorityLevel, number> = {
    [PriorityLevel.URGENT]: 0,
    [PriorityLevel.HIGH]: 0,
    [PriorityLevel.MEDIUM]: 0,
    [PriorityLevel.LOW]: 0,
  };
  
  const byStrategy: Record<CollectionStrategy, number> = {
    [CollectionStrategy.IMMEDIATE_CONTACT]: 0,
    [CollectionStrategy.PAYMENT_PLAN]: 0,
    [CollectionStrategy.LEGAL_NOTICE]: 0,
    [CollectionStrategy.ESCALATION]: 0,
    [CollectionStrategy.WRITE_OFF]: 0,
  };
  
  let totalRecoveryProbability = 0;
  let highValueCases = 0;
  
  for (const arrearsCase of cases) {
    byPriorityLevel[arrearsCase.priorityLevel]++;
    byStrategy[arrearsCase.recommendedStrategy]++;
    totalRecoveryProbability += arrearsCase.recoveryProbability;
    
    if (arrearsCase.amountOverdue > 10000) {
      highValueCases++;
    }
  }
  
  const averageRecoveryProbability = cases.length > 0 ? totalRecoveryProbability / cases.length : 0;
  
  return {
    totalCases: cases.length,
    totalAmountOverdue,
    averageDaysOverdue,
    byPriorityLevel,
    byStrategy,
    averageRecoveryProbability,
    highValueCases,
  };
}

/**
 * Get priority level label
 */
export function getPriorityLevelLabel(level: PriorityLevel): string {
  const labels: Record<PriorityLevel, string> = {
    [PriorityLevel.URGENT]: 'Urgent',
    [PriorityLevel.HIGH]: 'High',
    [PriorityLevel.MEDIUM]: 'Medium',
    [PriorityLevel.LOW]: 'Low',
  };

  return labels[level];
}

/**
 * Get collection strategy label
 */
export function getCollectionStrategyLabel(strategy: CollectionStrategy): string {
  const labels: Record<CollectionStrategy, string> = {
    [CollectionStrategy.IMMEDIATE_CONTACT]: 'Immediate Contact',
    [CollectionStrategy.PAYMENT_PLAN]: 'Payment Plan',
    [CollectionStrategy.LEGAL_NOTICE]: 'Legal Notice',
    [CollectionStrategy.ESCALATION]: 'Escalation',
    [CollectionStrategy.WRITE_OFF]: 'Write Off',
  };

  return labels[strategy];
}

/**
 * Generate collection report
 */
export function generateCollectionReport(cases: ArrearsCase[]): {
  reportDate: Date;
  summary: ReturnType<typeof getArrearsStatistics>;
  urgentCases: ArrearsCase[];
  highValueCases: ArrearsCase[];
  recommendations: string[];
} {
  const summary = getArrearsStatistics(cases);
  const urgentCases = filterByPriorityLevel(cases, PriorityLevel.URGENT);
  const highValueCases = cases.filter(c => c.amountOverdue > 10000);
  
  const recommendations: string[] = [];
  
  if (summary.byPriorityLevel[PriorityLevel.URGENT] > 0) {
    recommendations.push(`Immediate action required for ${summary.byPriorityLevel[PriorityLevel.URGENT]} urgent cases`);
  }
  
  if (summary.averageRecoveryProbability < 0.5) {
    recommendations.push('Consider escalating to legal action for low-recovery cases');
  }
  
  if (summary.byStrategy[CollectionStrategy.PAYMENT_PLAN] > 0) {
    recommendations.push(`Offer payment plans to ${summary.byStrategy[CollectionStrategy.PAYMENT_PLAN]} eligible tenants`);
  }
  
  return {
    reportDate: new Date(),
    summary,
    urgentCases,
    highValueCases,
    recommendations,
  };
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
