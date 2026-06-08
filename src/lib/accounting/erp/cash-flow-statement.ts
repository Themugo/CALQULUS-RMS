/**
 * Cash Flow Statement
 * 
 * Implements ERP-grade cash flow statement with:
 * - Operating activities
 * - Investing activities
 * - Financing activities
 * - Direct method
 * - Indirect method
 * - Cash reconciliation
 * - Period comparison
 */

// Cash flow activity type
export enum CashFlowActivityType {
  OPERATING = 'operating',
  INVESTING = 'investing',
  FINANCING = 'financing',
}

// Cash flow entry
export interface CashFlowEntry {
  id: string;
  activityType: CashFlowActivityType;
  description: string;
  amount: number;
  date: Date;
  periodId: string;
  category: string;
  createdAt: Date;
}

// Cash flow statement
export interface CashFlowStatement {
  periodId: string;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  operatingActivities: {
    entries: CashFlowEntry[];
    total: number;
  };
  investingActivities: {
    entries: CashFlowEntry[];
    total: number;
  };
  financingActivities: {
    entries: CashFlowEntry[];
    total: number;
  };
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
  method: 'direct' | 'indirect';
}

// Indirect method reconciliation
export interface IndirectMethodReconciliation {
  netIncome: number;
  adjustments: Array<{
    description: string;
    amount: number;
  }>;
  operatingCashFlow: number;
}

/**
 * Cash Flow Statement Generator
 */
export class CashFlowStatementGenerator {
  private entries: CashFlowEntry[];

  constructor() {
    this.entries = [];
  }

  /**
   * Add cash flow entry
   */
  addEntry(entry: Omit<CashFlowEntry, 'id' | 'createdAt'>): CashFlowEntry {
    const cashFlowEntry: CashFlowEntry = {
      id: `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...entry,
      createdAt: new Date(),
    };

    this.entries.push(cashFlowEntry);
    return cashFlowEntry;
  }

  /**
   * Generate cash flow statement (direct method)
   */
  generateDirectMethod(
    period: {
      id: string;
      startDate: Date;
      endDate: Date;
    },
    beginningCash: number
  ): CashFlowStatement {
    const periodEntries = this.entries.filter(
      e => e.periodId === period.id && e.date >= period.startDate && e.date <= period.endDate
    );

    const operatingEntries = periodEntries.filter(e => e.activityType === CashFlowActivityType.OPERATING);
    const investingEntries = periodEntries.filter(e => e.activityType === CashFlowActivityType.INVESTING);
    const financingEntries = periodEntries.filter(e => e.activityType === CashFlowActivityType.FINANCING);

    const operatingTotal = operatingEntries.reduce((sum, e) => sum + e.amount, 0);
    const investingTotal = investingEntries.reduce((sum, e) => sum + e.amount, 0);
    const financingTotal = financingEntries.reduce((sum, e) => sum + e.amount, 0);

    const netCashFlow = operatingTotal + investingTotal + financingTotal;
    const endingCash = beginningCash + netCashFlow;

    return {
      periodId: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      generatedAt: new Date(),
      operatingActivities: {
        entries: operatingEntries,
        total: operatingTotal,
      },
      investingActivities: {
        entries: investingEntries,
        total: investingTotal,
      },
      financingActivities: {
        entries: financingEntries,
        total: financingTotal,
      },
      netCashFlow,
      beginningCash,
      endingCash,
      method: 'direct',
    };
  }

  /**
   * Generate cash flow statement (indirect method)
   */
  generateIndirectMethod(
    period: {
      id: string;
      startDate: Date;
      endDate: Date;
    },
    beginningCash: number,
    netIncome: number,
    reconciliation: IndirectMethodReconciliation
  ): CashFlowStatement {
    const periodEntries = this.entries.filter(
      e => e.periodId === period.id && e.date >= period.startDate && e.date <= period.endDate
    );

    const operatingEntries = periodEntries.filter(e => e.activityType === CashFlowActivityType.OPERATING);
    const investingEntries = periodEntries.filter(e => e.activityType === CashFlowActivityType.INVESTING);
    const financingEntries = periodEntries.filter(e => e.activityType === CashFlowActivityType.FINANCING);

    const operatingTotal = reconciliation.operatingCashFlow;
    const investingTotal = investingEntries.reduce((sum, e) => sum + e.amount, 0);
    const financingTotal = financingEntries.reduce((sum, e) => sum + e.amount, 0);

    const netCashFlow = operatingTotal + investingTotal + financingTotal;
    const endingCash = beginningCash + netCashFlow;

    return {
      periodId: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      generatedAt: new Date(),
      operatingActivities: {
        entries: operatingEntries,
        total: operatingTotal,
      },
      investingActivities: {
        entries: investingEntries,
        total: investingTotal,
      },
      financingActivities: {
        entries: financingEntries,
        total: financingTotal,
      },
      netCashFlow,
      beginningCash,
      endingCash,
      method: 'indirect',
    };
  }

  /**
   * Add operating activity
   */
  addOperatingActivity(
    description: string,
    amount: number,
    date: Date,
    periodId: string,
    category: string
  ): CashFlowEntry {
    return this.addEntry({
      activityType: CashFlowActivityType.OPERATING,
      description,
      amount,
      date,
      periodId,
      category,
    });
  }

  /**
   * Add investing activity
   */
  addInvestingActivity(
    description: string,
    amount: number,
    date: Date,
    periodId: string,
    category: string
  ): CashFlowEntry {
    return this.addEntry({
      activityType: CashFlowActivityType.INVESTING,
      description,
      amount,
      date,
      periodId,
      category,
    });
  }

  /**
   * Add financing activity
   */
  addFinancingActivity(
    description: string,
    amount: number,
    date: Date,
    periodId: string,
    category: string
  ): CashFlowEntry {
    return this.addEntry({
      activityType: CashFlowActivityType.FINANCING,
      description,
      amount,
      date,
      periodId,
      category,
    });
  }

  /**
   * Get entries by period
   */
  getEntriesByPeriod(periodId: string): CashFlowEntry[] {
    return this.entries.filter(e => e.periodId === periodId);
  }

  /**
   * Get entries by activity type
   */
  getEntriesByActivityType(activityType: CashFlowActivityType): CashFlowEntry[] {
    return this.entries.filter(e => e.activityType === activityType);
  }

  /**
   * Get cash flow summary
   */
  getCashFlowSummary(periodId: string): {
    operating: number;
    investing: number;
    financing: number;
    net: number;
  } {
    const periodEntries = this.entries.filter(e => e.periodId === periodId);

    const operating = periodEntries
      .filter(e => e.activityType === CashFlowActivityType.OPERATING)
      .reduce((sum, e) => sum + e.amount, 0);
    const investing = periodEntries
      .filter(e => e.activityType === CashFlowActivityType.INVESTING)
      .reduce((sum, e) => sum + e.amount, 0);
    const financing = periodEntries
      .filter(e => e.activityType === CashFlowActivityType.FINANCING)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      operating,
      investing,
      financing,
      net: operating + investing + financing,
    };
  }

  /**
   * Compare periods
   */
  comparePeriods(period1Id: string, period2Id: string): {
    period1: {
      operating: number;
      investing: number;
      financing: number;
      net: number;
    };
    period2: {
      operating: number;
      investing: number;
      financing: number;
      net: number;
    };
    changes: {
      operating: number;
      investing: number;
      financing: number;
      net: number;
    };
    percentages: {
      operating: number;
      investing: number;
      financing: number;
      net: number;
    };
  } {
    const period1 = this.getCashFlowSummary(period1Id);
    const period2 = this.getCashFlowSummary(period2Id);

    const changes = {
      operating: period2.operating - period1.operating,
      investing: period2.investing - period1.investing,
      financing: period2.financing - period1.financing,
      net: period2.net - period1.net,
    };

    const percentages = {
      operating: period1.operating !== 0 ? (changes.operating / Math.abs(period1.operating)) * 100 : 0,
      investing: period1.investing !== 0 ? (changes.investing / Math.abs(period1.investing)) * 100 : 0,
      financing: period1.financing !== 0 ? (changes.financing / Math.abs(period1.financing)) * 100 : 0,
      net: period1.net !== 0 ? (changes.net / Math.abs(period1.net)) * 100 : 0,
    };

    return {
      period1,
      period2,
      changes,
      percentages,
    };
  }
}

/**
 * Indirect Method Calculator
 */
export class IndirectMethodCalculator {
  /**
   * Calculate operating cash flow from net income
   */
  calculateOperatingCashFlow(
    _netIncome: number,
    adjustments: Array<{
      type: 'depreciation' | 'amortization' | 'gain' | 'loss' | 'accounts_receivable' | 'accounts_payable' | 'inventory' | 'other';
      description: string;
      amount: number;
    }>
  ): IndirectMethodReconciliation {
    const reconciliationAdjustments: Array<{
      description: string;
      amount: number;
    }> = [];

    let operatingCashFlow = _netIncome;

    for (const adjustment of adjustments) {
      const amount = adjustment.amount;

      // Adjust based on type
      switch (adjustment.type) {
        case 'depreciation':
        case 'amortization':
          // Add back non-cash expenses
          reconciliationAdjustments.push({
            description: adjustment.description,
            amount: Math.abs(amount),
          });
          operatingCashFlow += Math.abs(amount);
          break;
        case 'gain':
          // Subtract gains (non-operating)
          reconciliationAdjustments.push({
            description: adjustment.description,
            amount: -Math.abs(amount),
          });
          operatingCashFlow -= Math.abs(amount);
          break;
        case 'loss':
          // Add back losses (non-operating)
          reconciliationAdjustments.push({
            description: adjustment.description,
            amount: Math.abs(amount),
          });
          operatingCashFlow += Math.abs(amount);
          break;
        case 'accounts_receivable':
          // Decrease in AR = add, Increase in AR = subtract
          if (amount < 0) {
            reconciliationAdjustments.push({
              description: adjustment.description,
              amount: Math.abs(amount),
            });
            operatingCashFlow += Math.abs(amount);
          } else {
            reconciliationAdjustments.push({
              description: adjustment.description,
              amount: -Math.abs(amount),
            });
            operatingCashFlow -= Math.abs(amount);
          }
          break;
        case 'accounts_payable':
          // Increase in AP = add, Decrease in AP = subtract
          if (amount > 0) {
            reconciliationAdjustments.push({
              description: adjustment.description,
              amount: Math.abs(amount),
            });
            operatingCashFlow += Math.abs(amount);
          } else {
            reconciliationAdjustments.push({
              description: adjustment.description,
              amount: -Math.abs(amount),
            });
            operatingCashFlow -= Math.abs(amount);
          }
          break;
        case 'inventory':
          // Decrease in inventory = add, Increase in inventory = subtract
          if (amount < 0) {
            reconciliationAdjustments.push({
              description: adjustment.description,
              amount: Math.abs(amount),
            });
            operatingCashFlow += Math.abs(amount);
          } else {
            reconciliationAdjustments.push({
              description: adjustment.description,
              amount: -Math.abs(amount),
            });
            operatingCashFlow -= Math.abs(amount);
          }
          break;
        case 'other':
          reconciliationAdjustments.push({
            description: adjustment.description,
            amount,
          });
          operatingCashFlow += amount;
          break;
      }
    }

    return {
      netIncome: _netIncome,
      adjustments: reconciliationAdjustments,
      operatingCashFlow,
    };
  }

  /**
   * Create common adjustments
   */
  createCommonAdjustments(
    depreciation: number,
    amortization: number,
    accountsReceivableChange: number,
    accountsPayableChange: number,
    inventoryChange: number
  ): Array<{
    type: 'depreciation' | 'amortization' | 'gain' | 'loss' | 'accounts_receivable' | 'accounts_payable' | 'inventory' | 'other';
    description: string;
    amount: number;
  }> {
    const adjustments: Array<{
      type: 'depreciation' | 'amortization' | 'gain' | 'loss' | 'accounts_receivable' | 'accounts_payable' | 'inventory' | 'other';
      description: string;
      amount: number;
    }> = [];

    if (depreciation !== 0) {
      adjustments.push({
        type: 'depreciation',
        description: 'Depreciation expense',
        amount: depreciation,
      });
    }

    if (amortization !== 0) {
      adjustments.push({
        type: 'amortization',
        description: 'Amortization expense',
        amount: amortization,
      });
    }

    if (accountsReceivableChange !== 0) {
      adjustments.push({
        type: 'accounts_receivable',
        description: 'Change in accounts receivable',
        amount: accountsReceivableChange,
      });
    }

    if (accountsPayableChange !== 0) {
      adjustments.push({
        type: 'accounts_payable',
        description: 'Change in accounts payable',
        amount: accountsPayableChange,
      });
    }

    if (inventoryChange !== 0) {
      adjustments.push({
        type: 'inventory',
        description: 'Change in inventory',
        amount: inventoryChange,
      });
    }

    return adjustments;
  }
}

/**
 * Cash Flow Analyzer
 */
export class CashFlowAnalyzer {
  /**
   * Analyze cash flow trends
   */
  analyzeTrends(statements: CashFlowStatement[]): {
    trend: 'improving' | 'declining' | 'stable';
    averageOperatingCashFlow: number;
    volatility: number;
    recommendations: string[];
  } {
    if (statements.length < 2) {
      return {
        trend: 'stable',
        averageOperatingCashFlow: 0,
        volatility: 0,
        recommendations: ['Insufficient data for trend analysis'],
      };
    }

    const operatingCashFlows = statements.map(s => s.operatingActivities.total);
    const averageOperatingCashFlow = operatingCashFlows.reduce((sum, cf) => sum + cf, 0) / operatingCashFlows.length;

    const volatility = Math.sqrt(
      operatingCashFlows.reduce((sum, cf) => sum + Math.pow(cf - averageOperatingCashFlow, 2), 0) / operatingCashFlows.length
    );

    const recentTrend = operatingCashFlows.slice(-3);
    let trend: 'improving' | 'declining' | 'stable';

    if (recentTrend.every((cf, i) => i === 0 || cf >= recentTrend[i - 1])) {
      trend = 'improving';
    } else if (recentTrend.every((cf, i) => i === 0 || cf <= recentTrend[i - 1])) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    const recommendations: string[] = [];
    if (trend === 'declining') {
      recommendations.push('Operating cash flow is declining - review revenue collection and expense management');
    }
    if (volatility > averageOperatingCashFlow * 0.5) {
      recommendations.push('High cash flow volatility - improve cash flow forecasting and management');
    }
    if (averageOperatingCashFlow < 0) {
      recommendations.push('Negative average operating cash flow - immediate action required to improve cash generation');
    }

    return {
      trend,
      averageOperatingCashFlow,
      volatility,
      recommendations,
    };
  }

  /**
   * Calculate cash flow ratios
   */
  calculateRatios(statement: CashFlowStatement): {
    operatingCashFlowRatio: number;
    cashFlowToDebtRatio: number;
    freeCashFlow: number;
  } {
    const operatingCashFlowRatio = statement.netCashFlow !== 0
      ? statement.operatingActivities.total / Math.abs(statement.netCashFlow)
      : 0;

    const cashFlowToDebtRatio = 0; // Would need debt information
    const freeCashFlow = statement.operatingActivities.total; // Would subtract capital expenditures

    return {
      operatingCashFlowRatio,
      cashFlowToDebtRatio,
      freeCashFlow,
    };
  }

  /**
   * Generate cash flow forecast
   */
  generateForecast(
    historicalStatements: CashFlowStatement[],
    periods: number = 12
  ): Array<{
    period: number;
    operating: number;
    investing: number;
    financing: number;
    net: number;
  }> {
    const forecast: Array<{
      period: number;
      operating: number;
      investing: number;
      financing: number;
      net: number;
    }> = [];

    if (historicalStatements.length === 0) {
      return forecast;
    }

    // Calculate averages from historical data
    const avgOperating = historicalStatements.reduce((sum, s) => sum + s.operatingActivities.total, 0) / historicalStatements.length;
    const avgInvesting = historicalStatements.reduce((sum, s) => sum + s.investingActivities.total, 0) / historicalStatements.length;
    const avgFinancing = historicalStatements.reduce((sum, s) => sum + s.financingActivities.total, 0) / historicalStatements.length;

    // Apply slight growth trend
    const growthRate = 0.02; // 2% growth per period

    for (let i = 1; i <= periods; i++) {
      const operating = avgOperating * Math.pow(1 + growthRate, i);
      const investing = avgInvesting * Math.pow(1 + growthRate, i);
      const financing = avgFinancing * Math.pow(1 + growthRate, i);
      const net = operating + investing + financing;

      forecast.push({
        period: i,
        operating,
        investing,
        financing,
        net,
      });
    }

    return forecast;
  }
}
