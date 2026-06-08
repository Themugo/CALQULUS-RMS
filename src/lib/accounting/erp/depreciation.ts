/**
 * Depreciation Calculation
 * 
 * Implements ERP-grade depreciation with:
 * - Straight-line depreciation
 * - Declining balance depreciation
 * - Sum-of-years depreciation
 * - Units of production depreciation
 * - Asset management
 * - Depreciation schedules
 * - Disposal handling
 */

// Depreciation method
export enum DepreciationMethod {
  STRAIGHT_LINE = 'straight_line',
  DECLINING_BALANCE = 'declining_balance',
  DOUBLE_DECLINING_BALANCE = 'double_declining_balance',
  SUM_OF_YEARS = 'sum_of_years',
  UNITS_OF_PRODUCTION = 'units_of_production',
}

// Fixed asset
export interface FixedAsset {
  id: string;
  assetNumber: string;
  description: string;
  assetType: string;
  acquisitionDate: Date;
  cost: number;
  salvageValue: number;
  usefulLife: number; // in years
  depreciationMethod: DepreciationMethod;
  accumulatedDepreciation: number;
  netBookValue: number;
  status: 'active' | 'disposed' | 'fully_depreciated';
  disposalDate?: Date;
  disposalValue?: number;
}

// Depreciation entry
export interface DepreciationEntry {
  id: string;
  assetId: string;
  periodId: string;
  depreciationDate: Date;
  amount: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  method: DepreciationMethod;
  createdAt: Date;
}

// Depreciation schedule
export interface DepreciationSchedule {
  assetId: string;
  entries: Array<{
    year: number;
    depreciation: number;
    accumulatedDepreciation: number;
    netBookValue: number;
  }>;
}

/**
 * Depreciation Calculator
 */
export class DepreciationCalculator {
  /**
   * Calculate straight-line depreciation
   */
  calculateStraightLine(
    cost: number,
    salvageValue: number,
    usefulLife: number
  ): number {
    return (cost - salvageValue) / usefulLife;
  }

  /**
   * Calculate declining balance depreciation
   */
  calculateDecliningBalance(
    netBookValue: number,
    rate: number
  ): number {
    return netBookValue * rate;
  }

  /**
   * Calculate double declining balance depreciation
   */
  calculateDoubleDecliningBalance(
    netBookValue: number,
    usefulLife: number
  ): number {
    const rate = 2 / usefulLife;
    return netBookValue * rate;
  }

  /**
   * Calculate sum-of-years depreciation
   */
  calculateSumOfYears(
    cost: number,
    salvageValue: number,
    usefulLife: number,
    year: number
  ): number {
    const sumOfYears = (usefulLife * (usefulLife + 1)) / 2;
    const remainingLife = usefulLife - year + 1;
    return ((cost - salvageValue) * remainingLife) / sumOfYears;
  }

  /**
   * Calculate units of production depreciation
   */
  calculateUnitsOfProduction(
    cost: number,
    salvageValue: number,
    totalEstimatedUnits: number,
    unitsProduced: number
  ): number {
    const depreciationPerUnit = (cost - salvageValue) / totalEstimatedUnits;
    return depreciationPerUnit * unitsProduced;
  }

  /**
   * Generate depreciation schedule
   */
  generateSchedule(
    cost: number,
    salvageValue: number,
    usefulLife: number,
    method: DepreciationMethod,
    rate?: number
  ): DepreciationSchedule {
    const entries: Array<{
      year: number;
      depreciation: number;
      accumulatedDepreciation: number;
      netBookValue: number;
    }> = [];

    let netBookValue = cost;
    let accumulatedDepreciation = 0;

    for (let year = 1; year <= usefulLife; year++) {
      let depreciation = 0;

      switch (method) {
        case DepreciationMethod.STRAIGHT_LINE:
          depreciation = this.calculateStraightLine(cost, salvageValue, usefulLife);
          break;
        case DepreciationMethod.DECLINING_BALANCE:
          depreciation = this.calculateDecliningBalance(netBookValue, rate || 0.2);
          // Ensure depreciation doesn't reduce below salvage value
          if (netBookValue - depreciation < salvageValue) {
            depreciation = netBookValue - salvageValue;
          }
          break;
        case DepreciationMethod.DOUBLE_DECLINING_BALANCE:
          depreciation = this.calculateDoubleDecliningBalance(netBookValue, usefulLife);
          // Ensure depreciation doesn't reduce below salvage value
          if (netBookValue - depreciation < salvageValue) {
            depreciation = netBookValue - salvageValue;
          }
          break;
        case DepreciationMethod.SUM_OF_YEARS:
          depreciation = this.calculateSumOfYears(cost, salvageValue, usefulLife, year);
          break;
        case DepreciationMethod.UNITS_OF_PRODUCTION:
          // This requires actual production data, so we'll use straight-line as fallback
          depreciation = this.calculateStraightLine(cost, salvageValue, usefulLife);
          break;
      }

      // Ensure final year brings to salvage value
      if (year === usefulLife) {
        depreciation = netBookValue - salvageValue;
      }

      accumulatedDepreciation += depreciation;
      netBookValue -= depreciation;

      entries.push({
        year,
        depreciation,
        accumulatedDepreciation,
        netBookValue: Math.max(salvageValue, netBookValue),
      });
    }

    return {
      assetId: '',
      entries,
    };
  }
}

/**
 * Fixed Asset Manager
 */
export class FixedAssetManager {
  private assets: Map<string, FixedAsset>;
  private depreciationEntries: DepreciationEntry[];
  private calculator: DepreciationCalculator;

  constructor() {
    this.assets = new Map();
    this.depreciationEntries = [];
    this.calculator = new DepreciationCalculator();
  }

  /**
   * Add fixed asset
   */
  addAsset(asset: Omit<FixedAsset, 'id' | 'accumulatedDepreciation' | 'netBookValue' | 'status'>): FixedAsset {
    const fixedAsset: FixedAsset = {
      id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...asset,
      accumulatedDepreciation: 0,
      netBookValue: asset.cost,
      status: 'active',
    };

    this.assets.set(fixedAsset.id, fixedAsset);
    return fixedAsset;
  }

  /**
   * Get asset
   */
  getAsset(assetId: string): FixedAsset | undefined {
    return this.assets.get(assetId);
  }

  /**
   * Get all assets
   */
  getAllAssets(): FixedAsset[] {
    return Array.from(this.assets.values());
  }

  /**
   * Get active assets
   */
  getActiveAssets(): FixedAsset[] {
    return Array.from(this.assets.values()).filter(a => a.status === 'active');
  }

  /**
   * Calculate depreciation for asset
   */
  calculateDepreciation(
    assetId: string,
    periodId: string,
    depreciationDate: Date
  ): DepreciationEntry | null {
    const asset = this.assets.get(assetId);
    if (!asset || asset.status !== 'active') {
      return null;
    }

    let depreciation = 0;

    switch (asset.depreciationMethod) {
      case DepreciationMethod.STRAIGHT_LINE:
        depreciation = this.calculator.calculateStraightLine(
          asset.cost,
          asset.salvageValue,
          asset.usefulLife
        );
        break;
      case DepreciationMethod.DOUBLE_DECLINING_BALANCE:
        depreciation = this.calculator.calculateDoubleDecliningBalance(
          asset.netBookValue,
          asset.usefulLife
        );
        break;
      case DepreciationMethod.SUM_OF_YEARS: {
        const yearsElapsed = Math.floor((depreciationDate.getTime() - asset.acquisitionDate.getTime()) / (365 * 24 * 60 * 60 * 1000));
        depreciation = this.calculator.calculateSumOfYears(
          asset.cost,
          asset.salvageValue,
          asset.usefulLife,
          yearsElapsed + 1
        );
        break;
      }
      default:
        depreciation = this.calculator.calculateStraightLine(
          asset.cost,
          asset.salvageValue,
          asset.usefulLife
        );
    }

    // Ensure depreciation doesn't exceed net book value minus salvage value
    const maxDepreciation = asset.netBookValue - asset.salvageValue;
    if (depreciation > maxDepreciation) {
      depreciation = maxDepreciation;
    }

    // Update asset
    asset.accumulatedDepreciation += depreciation;
    asset.netBookValue -= depreciation;

    // Check if fully depreciated
    if (asset.netBookValue <= asset.salvageValue) {
      asset.status = 'fully_depreciated';
      asset.netBookValue = asset.salvageValue;
    }

    const entry: DepreciationEntry = {
      id: `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assetId,
      periodId,
      depreciationDate,
      amount: depreciation,
      accumulatedDepreciation: asset.accumulatedDepreciation,
      netBookValue: asset.netBookValue,
      method: asset.depreciationMethod,
      createdAt: new Date(),
    };

    this.depreciationEntries.push(entry);
    return entry;
  }

  /**
   * Calculate depreciation for all active assets
   */
  calculateDepreciationForPeriod(periodId: string, depreciationDate: Date): DepreciationEntry[] {
    const entries: DepreciationEntry[] = [];
    const activeAssets = this.getActiveAssets();

    for (const asset of activeAssets) {
      const entry = this.calculateDepreciation(asset.id, periodId, depreciationDate);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Dispose asset
   */
  disposeAsset(assetId: string, disposalDate: Date, disposalValue: number): FixedAsset | null {
    const asset = this.assets.get(assetId);
    if (!asset) {
      return null;
    }

    asset.status = 'disposed';
    asset.disposalDate = disposalDate;
    asset.disposalValue = disposalValue;

    return asset;
  }

  /**
   * Get depreciation entries for asset
   */
  getDepreciationEntries(assetId: string): DepreciationEntry[] {
    return this.depreciationEntries.filter(e => e.assetId === assetId);
  }

  /**
   * Get depreciation entries for period
   */
  getDepreciationEntriesForPeriod(periodId: string): DepreciationEntry[] {
    return this.depreciationEntries.filter(e => e.periodId === periodId);
  }

  /**
   * Generate depreciation schedule for asset
   */
  generateSchedule(assetId: string): DepreciationSchedule | null {
    const asset = this.assets.get(assetId);
    if (!asset) {
      return null;
    }

    const schedule = this.calculator.generateSchedule(
      asset.cost,
      asset.salvageValue,
      asset.usefulLife,
      asset.depreciationMethod
    );

    schedule.assetId = assetId;
    return schedule;
  }

  /**
   * Get total depreciation for period
   */
  getTotalDepreciationForPeriod(periodId: string): number {
    const entries = this.getDepreciationEntriesForPeriod(periodId);
    return entries.reduce((sum, e) => sum + e.amount, 0);
  }

  /**
   * Get total accumulated depreciation
   */
  getTotalAccumulatedDepreciation(): number {
    return Array.from(this.assets.values()).reduce((sum, a) => sum + a.accumulatedDepreciation, 0);
  }

  /**
   * Get total net book value
   */
  getTotalNetBookValue(): number {
    return Array.from(this.assets.values()).reduce((sum, a) => sum + a.netBookValue, 0);
  }

  /**
   * Get asset summary
   */
  getAssetSummary(): {
    totalAssets: number;
    activeAssets: number;
    disposedAssets: number;
    fullyDepreciatedAssets: number;
    totalCost: number;
    totalAccumulatedDepreciation: number;
    totalNetBookValue: number;
    byType: Record<string, number>;
  } {
    const assets = Array.from(this.assets.values());
    const byType: Record<string, number> = {};

    for (const asset of assets) {
      byType[asset.assetType] = (byType[asset.assetType] || 0) + 1;
    }

    return {
      totalAssets: assets.length,
      activeAssets: assets.filter(a => a.status === 'active').length,
      disposedAssets: assets.filter(a => a.status === 'disposed').length,
      fullyDepreciatedAssets: assets.filter(a => a.status === 'fully_depreciated').length,
      totalCost: assets.reduce((sum, a) => sum + a.cost, 0),
      totalAccumulatedDepreciation: this.getTotalAccumulatedDepreciation(),
      totalNetBookValue: this.getTotalNetBookValue(),
      byType,
    };
  }
}
