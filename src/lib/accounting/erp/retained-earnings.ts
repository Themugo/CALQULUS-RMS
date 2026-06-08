/**
 * Retained Earnings
 * 
 * Implements ERP-grade retained earnings with:
 * - Beginning retained earnings
 * - Net income calculation
 * - Dividend distribution
 * - Retained earnings statement
 * - Period tracking
 * - Historical analysis
 */

// Retained earnings entry
export interface RetainedEarningsEntry {
  id: string;
  periodId: string;
  startDate: Date;
  endDate: Date;
  beginningBalance: number;
  netIncome: number;
  dividends: number;
  otherAdjustments: number;
  endingBalance: number;
  createdAt: Date;
}

// Dividend declaration
export interface DividendDeclaration {
  id: string;
  declarationDate: Date;
  paymentDate: Date;
  amountPerShare: number;
  totalShares: number;
  totalAmount: number;
  type: 'cash' | 'stock';
  approvedBy: string;
  status: 'declared' | 'paid' | 'cancelled';
}

// Retained earnings statement
export interface RetainedEarningsStatement {
  periodId: string;
  startDate: Date;
  endDate: Date;
  beginningRetainedEarnings: number;
  add: {
    netIncome: number;
    otherComprehensiveIncome: number;
  };
  less: {
    dividends: number;
    stockDividends: number;
    treasuryStock: number;
  };
  endingRetainedEarnings: number;
  generatedAt: Date;
}

/**
 * Retained Earnings Calculator
 */
export class RetainedEarningsCalculator {
  private entries: RetainedEarningsEntry[];
  private dividendDeclarations: DividendDeclaration[];

  constructor() {
    this.entries = [];
    this.dividendDeclarations = [];
  }

  /**
   * Calculate retained earnings for period
   */
  calculateRetainedEarnings(
    period: {
      id: string;
      startDate: Date;
      endDate: Date;
    },
    beginningBalance: number,
    netIncome: number,
    dividends: number,
    otherAdjustments: number = 0
  ): RetainedEarningsEntry {
    const endingBalance = beginningBalance + netIncome - dividends + otherAdjustments;

    const entry: RetainedEarningsEntry = {
      id: `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      periodId: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      beginningBalance,
      netIncome,
      dividends,
      otherAdjustments,
      endingBalance,
      createdAt: new Date(),
    };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Get beginning balance for period
   */
  getBeginningBalance(_periodId: string): number {
    // Find the most recent entry before this period
    const sortedEntries = [...this.entries].sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
    
    for (const entry of sortedEntries) {
      if (entry.endDate < new Date()) {
        return entry.endingBalance;
      }
    }

    return 0; // No previous period, start at zero
  }

  /**
   * Declare dividend
   */
  declareDividend(
    declarationDate: Date,
    paymentDate: Date,
    amountPerShare: number,
    totalShares: number,
    type: 'cash' | 'stock' = 'cash',
    approvedBy: string
  ): DividendDeclaration {
    const declaration: DividendDeclaration = {
      id: `div_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      declarationDate,
      paymentDate,
      amountPerShare,
      totalShares,
      totalAmount: amountPerShare * totalShares,
      type,
      approvedBy,
      status: 'declared',
    };

    this.dividendDeclarations.push(declaration);
    return declaration;
  }

  /**
   * Pay dividend
   */
  payDividend(dividendId: string): DividendDeclaration | null {
    const dividend = this.dividendDeclarations.find(d => d.id === dividendId);
    if (dividend) {
      dividend.status = 'paid';
      return dividend;
    }
    return null;
  }

  /**
   * Cancel dividend
   */
  cancelDividend(dividendId: string): DividendDeclaration | null {
    const dividend = this.dividendDeclarations.find(d => d.id === dividendId);
    if (dividend && dividend.status === 'declared') {
      dividend.status = 'cancelled';
      return dividend;
    }
    return null;
  }

  /**
   * Generate retained earnings statement
   */
  generateStatement(
    period: {
      id: string;
      startDate: Date;
      endDate: Date;
    },
    netIncome: number,
    otherComprehensiveIncome: number = 0
  ): RetainedEarningsStatement {
    const beginningBalance = this.getBeginningBalance(period.id);
    
    // Calculate dividends for the period
    const periodDividends = this.dividendDeclarations
      .filter(d => d.declarationDate >= period.startDate && d.declarationDate <= period.endDate && d.status === 'declared')
      .reduce((sum, d) => sum + d.totalAmount, 0);

    const stockDividends = this.dividendDeclarations
      .filter(d => d.declarationDate >= period.startDate && d.declarationDate <= period.endDate && d.type === 'stock' && d.status === 'declared')
      .reduce((sum, d) => sum + d.totalAmount, 0);

    const endingRetainedEarnings = beginningBalance + netIncome + otherComprehensiveIncome - periodDividends;

    return {
      periodId: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      beginningRetainedEarnings: beginningBalance,
      add: {
        netIncome,
        otherComprehensiveIncome,
      },
      less: {
        dividends: periodDividends,
        stockDividends,
        treasuryStock: 0,
      },
      endingRetainedEarnings,
      generatedAt: new Date(),
    };
  }

  /**
   * Get retained earnings history
   */
  getHistory(limit?: number): RetainedEarningsEntry[] {
    const sorted = [...this.entries].sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
    if (limit) {
      return sorted.slice(0, limit);
    }
    return sorted;
  }

  /**
   * Get dividend history
   */
  getDividendHistory(limit?: number): DividendDeclaration[] {
    const sorted = [...this.dividendDeclarations].sort((a, b) => b.declarationDate.getTime() - a.declarationDate.getTime());
    if (limit) {
      return sorted.slice(0, limit);
    }
    return sorted;
  }

  /**
   * Calculate retained earnings growth rate
   */
  calculateGrowthRate(periods: number = 12): number {
    const history = this.getHistory(periods + 1);
    if (history.length < 2) {
      return 0;
    }

    const current = history[0].endingBalance;
    const previous = history[history.length - 1].endingBalance;

    if (previous === 0) {
      return 0;
    }

    return ((current - previous) / previous) * 100;
  }

  /**
   * Get pending dividend payments
   */
  getPendingDividends(): DividendDeclaration[] {
    const now = new Date();
    return this.dividendDeclarations.filter(d => d.status === 'declared' && d.paymentDate > now);
  }

  /**
   * Get overdue dividend payments
   */
  getOverdueDividends(): DividendDeclaration[] {
    const now = new Date();
    return this.dividendDeclarations.filter(d => d.status === 'declared' && d.paymentDate < now);
  }
}

/**
 * Retained Earnings Analyzer
 */
export class RetainedEarningsAnalyzer {
  /**
   * Analyze retained earnings trends
   */
  analyzeTrends(entries: RetainedEarningsEntry[]): {
    trend: 'increasing' | 'decreasing' | 'stable';
    averageGrowth: number;
    volatility: number;
    recommendations: string[];
  } {
    if (entries.length < 2) {
      return {
        trend: 'stable',
        averageGrowth: 0,
        volatility: 0,
        recommendations: ['Insufficient data for trend analysis'],
      };
    }

    const sorted = [...entries].sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
    const growthRates: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i].endingBalance;
      const previous = sorted[i - 1].endingBalance;
      
      if (previous !== 0) {
        growthRates.push(((current - previous) / previous) * 100);
      }
    }

    const averageGrowth = growthRates.length > 0
      ? growthRates.reduce((sum, g) => sum + g, 0) / growthRates.length
      : 0;

    const volatility = growthRates.length > 0
      ? Math.sqrt(growthRates.reduce((sum, g) => sum + Math.pow(g - averageGrowth, 2), 0) / growthRates.length)
      : 0;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (averageGrowth > 5) {
      trend = 'increasing';
    } else if (averageGrowth < -5) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    const recommendations: string[] = [];
    if (trend === 'decreasing') {
      recommendations.push('Retained earnings are declining - review dividend policy and profitability');
    }
    if (volatility > 20) {
      recommendations.push('High volatility in retained earnings - consider more stable dividend policy');
    }
    if (averageGrowth > 20) {
      recommendations.push('Strong growth in retained earnings - consider increasing dividends or reinvestment');
    }

    return {
      trend,
      averageGrowth,
      volatility,
      recommendations,
    };
  }

  /**
   * Calculate dividend payout ratio
   */
  calculatePayoutRatio(netIncome: number, dividends: number): number {
    if (netIncome === 0) {
      return 0;
    }
    return (dividends / netIncome) * 100;
  }

  /**
   * Analyze dividend sustainability
   */
  analyzeDividendSustainability(
    netIncome: number,
    retainedEarnings: number,
    dividends: number
  ): {
    isSustainable: boolean;
    payoutRatio: number;
    coverageRatio: number;
    recommendations: string[];
  } {
    const payoutRatio = this.calculatePayoutRatio(netIncome, dividends);
    const coverageRatio = netIncome > 0 ? netIncome / dividends : 0;

    const recommendations: string[] = [];
    let isSustainable = true;

    if (payoutRatio > 100) {
      isSustainable = false;
      recommendations.push('Payout ratio exceeds 100% - dividends are not covered by earnings');
    } else if (payoutRatio > 70) {
      recommendations.push('Payout ratio is high - consider reducing dividends to retain more earnings');
    }

    if (coverageRatio < 1) {
      isSustainable = false;
      recommendations.push('Dividend coverage ratio is less than 1 - dividends not covered by earnings');
    } else if (coverageRatio < 1.5) {
      recommendations.push('Dividend coverage ratio is low - consider building buffer');
    }

    if (retainedEarnings < dividends * 12) {
      recommendations.push('Retained earnings may not support current dividend level for extended period');
    }

    return {
      isSustainable,
      payoutRatio,
      coverageRatio,
      recommendations,
    };
  }
}
