/**
 * AI Accounting Assistant
 * 
 * Implements AI-powered accounting assistance with:
 * - Expense categorization
 * - Anomaly detection
 * - Cash flow forecasting
 * - Budget recommendations
 * - Tax preparation assistance
 * - Financial insights
 */

// Expense category
export enum ExpenseCategory {
  RENT = 'rent',
  UTILITIES = 'utilities',
  MAINTENANCE = 'maintenance',
  INSURANCE = 'insurance',
  TAXES = 'taxes',
  SALARIES = 'salaries',
  MARKETING = 'marketing',
  SUPPLIES = 'supplies',
  LEGAL = 'legal',
  OTHER = 'other',
}

// Anomaly type
export enum AnomalyType {
  UNUSUAL_AMOUNT = 'unusual_amount',
  UNUSUAL_FREQUENCY = 'unusual_frequency',
  UNUSUAL_CATEGORY = 'unusual_category',
  DUPLICATE_TRANSACTION = 'duplicate_transaction',
  OUT_OF_RANGE = 'out_of_range',
}

// Transaction
export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category: ExpenseCategory;
  confidence: number;
  isRecurring: boolean;
  tags: string[];
}

// Anomaly
export interface Anomaly {
  id: string;
  transactionId: string;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedAction: string;
}

// Cash flow forecast
export interface CashFlowForecast {
  period: string;
  projectedIncome: number;
  projectedExpenses: number;
  netCashFlow: number;
  confidence: number;
}

// Budget recommendation
export interface BudgetRecommendation {
  category: ExpenseCategory;
  currentSpend: number;
  recommendedBudget: number;
  variance: number;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Categorize transaction
 */
export function categorizeTransaction(description: string, amount: number): Transaction {
  const category = classifyCategory(description);
  const confidence = calculateClassificationConfidence(description, category);
  const isRecurring = detectRecurring(description);
  const tags = extractTags(description);
  
  return {
    id: `transaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: new Date(),
    description,
    amount,
    category,
    confidence,
    isRecurring,
    tags,
  };
}

/**
 * Classify category
 */
function classifyCategory(description: string): ExpenseCategory {
  const lowerDescription = description.toLowerCase();
  
  const categoryKeywords: Record<ExpenseCategory, string[]> = {
    [ExpenseCategory.RENT]: ['rent', 'lease', 'housing', 'apartment', 'property'],
    [ExpenseCategory.UTILITIES]: ['water', 'electric', 'power', 'gas', 'internet', 'utility'],
    [ExpenseCategory.MAINTENANCE]: ['repair', 'maintenance', 'fix', 'service', 'plumbing', 'electrical'],
    [ExpenseCategory.INSURANCE]: ['insurance', 'coverage', 'premium', 'policy'],
    [ExpenseCategory.TAXES]: ['tax', 'vat', 'government', 'levy', 'duty'],
    [ExpenseCategory.SALARIES]: ['salary', 'wage', 'payroll', 'staff', 'employee'],
    [ExpenseCategory.MARKETING]: ['marketing', 'advertising', 'promotion', 'campaign'],
    [ExpenseCategory.SUPPLIES]: ['supply', 'material', 'inventory', 'stock'],
    [ExpenseCategory.LEGAL]: ['legal', 'lawyer', 'attorney', 'court', 'fee'],
    [ExpenseCategory.OTHER]: [],
  };
  
  let maxMatches = 0;
  let bestCategory = ExpenseCategory.OTHER;
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const matches = keywords.filter(keyword => lowerDescription.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestCategory = category as ExpenseCategory;
    }
  }
  
  return bestCategory;
}

/**
 * Calculate classification confidence
 */
function calculateClassificationConfidence(description: string, category: ExpenseCategory): number {
  const categoryKeywords: Record<ExpenseCategory, string[]> = {
    [ExpenseCategory.RENT]: ['rent', 'lease', 'housing', 'apartment', 'property'],
    [ExpenseCategory.UTILITIES]: ['water', 'electric', 'power', 'gas', 'internet', 'utility'],
    [ExpenseCategory.MAINTENANCE]: ['repair', 'maintenance', 'fix', 'service', 'plumbing', 'electrical'],
    [ExpenseCategory.INSURANCE]: ['insurance', 'coverage', 'premium', 'policy'],
    [ExpenseCategory.TAXES]: ['tax', 'vat', 'government', 'levy', 'duty'],
    [ExpenseCategory.SALARIES]: ['salary', 'wage', 'payroll', 'staff', 'employee'],
    [ExpenseCategory.MARKETING]: ['marketing', 'advertising', 'promotion', 'campaign'],
    [ExpenseCategory.SUPPLIES]: ['supply', 'material', 'inventory', 'stock'],
    [ExpenseCategory.LEGAL]: ['legal', 'lawyer', 'attorney', 'court', 'fee'],
    [ExpenseCategory.OTHER]: [],
  };
  
  const keywords = categoryKeywords[category];
  const lowerDescription = description.toLowerCase();
  const matches = keywords.filter(keyword => lowerDescription.includes(keyword)).length;
  
  return Math.min(1, matches / 2);
}

/**
 * Detect recurring
 */
function detectRecurring(description: string): boolean {
  const recurringKeywords = ['monthly', 'subscription', 'recurring', 'automatic', 'standing order'];
  const lowerDescription = description.toLowerCase();
  
  return recurringKeywords.some(keyword => lowerDescription.includes(keyword));
}

/**
 * Extract tags
 */
function extractTags(description: string): string[] {
  const words = description.toLowerCase().split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once']);
  
  return words.filter(word => word.length > 3 && !stopWords.has(word));
}

/**
 * Detect anomalies
 */
export function detectAnomalies(transactions: Transaction[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // Calculate average amounts by category
  const categoryAverages: Record<ExpenseCategory, { avg: number; count: number }> = {} as any;
  
  for (const transaction of transactions) {
    if (!categoryAverages[transaction.category]) {
      categoryAverages[transaction.category] = { avg: 0, count: 0 };
    }
    categoryAverages[transaction.category].avg += transaction.amount;
    categoryAverages[transaction.category].count++;
  }
  
  for (const category in categoryAverages) {
    categoryAverages[category].avg /= categoryAverages[category].count;
  }
  
  // Detect unusual amounts
  for (const transaction of transactions) {
    const avgAmount = categoryAverages[transaction.category]?.avg || 0;
    const deviation = Math.abs(transaction.amount - avgAmount) / avgAmount;
    
    if (deviation > 2) {
      anomalies.push({
        id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionId: transaction.id,
        type: AnomalyType.UNUSUAL_AMOUNT,
        severity: deviation > 5 ? 'high' : 'medium',
        description: `Transaction amount (${transaction.amount}) deviates significantly from category average (${avgAmount.toFixed(2)})`,
        suggestedAction: 'Review transaction for accuracy',
      });
    }
  }
  
  // Detect duplicates
  const seenDescriptions = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const key = `${transaction.description}_${transaction.amount}`;
    if (!seenDescriptions.has(key)) {
      seenDescriptions.set(key, []);
    }
    seenDescriptions.get(key)!.push(transaction);
  }
  
  for (const [key, matchingTransactions] of seenDescriptions) {
    if (matchingTransactions.length > 1) {
      for (const transaction of matchingTransactions.slice(1)) {
        anomalies.push({
          id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          transactionId: transaction.id,
          type: AnomalyType.DUPLICATE_TRANSACTION,
          severity: 'medium',
          description: `Potential duplicate transaction: ${transaction.description}`,
          suggestedAction: 'Verify if this is a legitimate duplicate or processing error',
        });
      }
    }
  }
  
  return anomalies;
}

/**
 * Forecast cash flow
 */
export function forecastCashFlow(
  transactions: Transaction[],
  months: number = 6
): CashFlowForecast[] {
  const forecasts: CashFlowForecast[] = [];
  
  // Calculate monthly averages
  const monthlyIncome: Record<number, number> = {};
  const monthlyExpenses: Record<number, number> = {};
  
  for (const transaction of transactions) {
    const monthKey = transaction.date.getMonth();
    
    if (transaction.amount > 0) {
      monthlyIncome[monthKey] = (monthlyIncome[monthKey] || 0) + transaction.amount;
    } else {
      monthlyExpenses[monthKey] = (monthlyExpenses[monthKey] || 0) + Math.abs(transaction.amount);
    }
  }
  
  // Calculate averages
  const avgIncome = Object.values(monthlyIncome).length > 0
    ? Object.values(monthlyIncome).reduce((sum, val) => sum + val, 0) / Object.values(monthlyIncome).length
    : 0;
  
  const avgExpenses = Object.values(monthlyExpenses).length > 0
    ? Object.values(monthlyExpenses).reduce((sum, val) => sum + val, 0) / Object.values(monthlyExpenses).length
    : 0;
  
  // Generate forecasts
  const now = new Date();
  for (let i = 1; i <= months; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const period = forecastDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Add some variance based on seasonality
    const seasonalFactor = 1 + Math.sin(i * Math.PI / 6) * 0.1;
    
    const projectedIncome = avgIncome * seasonalFactor;
    const projectedExpenses = avgExpenses * seasonalFactor;
    const netCashFlow = projectedIncome - projectedExpenses;
    
    forecasts.push({
      period,
      projectedIncome,
      projectedExpenses,
      netCashFlow,
      confidence: Math.max(0.5, 1 - (i * 0.1)), // Confidence decreases with time
    });
  }
  
  return forecasts;
}

/**
 * Generate budget recommendations
 */
export function generateBudgetRecommendations(
  transactions: Transaction[],
  currentBudgets: Record<ExpenseCategory, number>
): BudgetRecommendation[] {
  const recommendations: BudgetRecommendation[] = [];
  
  // Calculate actual spending by category
  const categorySpend: Record<ExpenseCategory, number> = {} as any;
  
  for (const transaction of transactions) {
    if (transaction.amount < 0) {
      categorySpend[transaction.category] = (categorySpend[transaction.category] || 0) + Math.abs(transaction.amount);
    }
  }
  
  // Generate recommendations
  for (const category of Object.values(ExpenseCategory)) {
    const currentSpend = categorySpend[category] || 0;
    const currentBudget = currentBudgets[category] || 0;
    const variance = currentSpend - currentBudget;
    
    let recommendation = '';
    let priority: 'low' | 'medium' | 'high' = 'low';
    let recommendedBudget = currentBudget;
    
    if (variance > 0) {
      // Over budget
      const overBudgetPercentage = (variance / currentBudget) * 100;
      
      if (overBudgetPercentage > 20) {
        recommendation = `Spending is ${overBudgetPercentage.toFixed(0)}% over budget. Consider reviewing ${category} expenses and implementing cost controls.`;
        priority = 'high';
        recommendedBudget = currentSpend * 1.1; // Recommend 10% buffer
      } else if (overBudgetPercentage > 10) {
        recommendation = `Spending is ${overBudgetPercentage.toFixed(0)}% over budget. Monitor ${category} expenses closely.`;
        priority = 'medium';
        recommendedBudget = currentSpend * 1.05; // Recommend 5% buffer
      } else {
        recommendation = `Spending is slightly over budget for ${category}.`;
        priority = 'low';
      }
    } else if (variance < -currentBudget * 0.3) {
      // Significantly under budget
      recommendation = `Spending is significantly under budget for ${category}. Consider reallocating funds or investing in property improvements.`;
      priority = 'medium';
      recommendedBudget = currentSpend * 1.1; // Recommend realistic budget
    } else {
      recommendation = `Spending is within budget for ${category}.`;
    }
    
    recommendations.push({
      category,
      currentSpend,
      recommendedBudget,
      variance,
      recommendation,
      priority,
    });
  }
  
  return recommendations;
}

/**
 * Get financial insights
 */
export function getFinancialInsights(transactions: Transaction[]): {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  topExpenseCategories: Array<{ category: ExpenseCategory; amount: number }>;
  monthlyTrend: Array<{ month: string; income: number; expenses: number }>;
  savingsRate: number;
} {
  const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const netCashFlow = totalIncome - totalExpenses;
  
  // Top expense categories
  const categorySpend: Record<ExpenseCategory, number> = {} as any;
  for (const transaction of transactions) {
    if (transaction.amount < 0) {
      categorySpend[transaction.category] = (categorySpend[transaction.category] || 0) + Math.abs(transaction.amount);
    }
  }
  
  const topExpenseCategories = Object.entries(categorySpend)
    .map(([category, amount]) => ({ category: category as ExpenseCategory, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  
  // Monthly trend
  const monthlyTrend: Record<string, { income: number; expenses: number }> = {};
  for (const transaction of transactions) {
    const monthKey = transaction.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!monthlyTrend[monthKey]) {
      monthlyTrend[monthKey] = { income: 0, expenses: 0 };
    }
    
    if (transaction.amount > 0) {
      monthlyTrend[monthKey].income += transaction.amount;
    } else {
      monthlyTrend[monthKey].expenses += Math.abs(transaction.amount);
    }
  }
  
  const monthlyTrendArray = Object.entries(monthlyTrend)
    .map(([month, data]) => ({ month, income: data.income, expenses: data.expenses }))
    .sort((a, b) => a.month.localeCompare(b.month));
  
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  
  return {
    totalIncome,
    totalExpenses,
    netCashFlow,
    topExpenseCategories,
    monthlyTrend: monthlyTrendArray,
    savingsRate,
  };
}

/**
 * Batch categorize transactions
 */
export function batchCategorizeTransactions(transactions: Array<{ description: string; amount: number }>): Transaction[] {
  return transactions.map(t => categorizeTransaction(t.description, t.amount));
}

/**
 * Get expense category label
 */
export function getExpenseCategoryLabel(category: ExpenseCategory): string {
  const labels: Record<ExpenseCategory, string> = {
    [ExpenseCategory.RENT]: 'Rent',
    [ExpenseCategory.UTILITIES]: 'Utilities',
    [ExpenseCategory.MAINTENANCE]: 'Maintenance',
    [ExpenseCategory.INSURANCE]: 'Insurance',
    [ExpenseCategory.TAXES]: 'Taxes',
    [ExpenseCategory.SALARIES]: 'Salaries',
    [ExpenseCategory.MARKETING]: 'Marketing',
    [ExpenseCategory.SUPPLIES]: 'Supplies',
    [ExpenseCategory.LEGAL]: 'Legal',
    [ExpenseCategory.OTHER]: 'Other',
  };

  return labels[category];
}

/**
 * Get anomaly type label
 */
export function getAnomalyTypeLabel(type: AnomalyType): string {
  const labels: Record<AnomalyType, string> = {
    [AnomalyType.UNUSUAL_AMOUNT]: 'Unusual Amount',
    [AnomalyType.UNUSUAL_FREQUENCY]: 'Unusual Frequency',
    [AnomalyType.UNUSUAL_CATEGORY]: 'Unusual Category',
    [AnomalyType.DUPLICATE_TRANSACTION]: 'Duplicate Transaction',
    [AnomalyType.OUT_OF_RANGE]: 'Out of Range',
  };

  return labels[type];
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
