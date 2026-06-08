/**
 * Utility Integrations
 * 
 * Implements utility provider integrations with:
 * - Utility account management
 * - Meter reading integration
 * - Bill processing
 * - Payment automation
 * - Usage analytics
 * - Provider API integration
 * - Dispute handling
 */

// Utility type
export enum UtilityType {
  ELECTRICITY = 'electricity',
  WATER = 'water',
  GAS = 'gas',
  INTERNET = 'internet',
  WASTE = 'waste',
  SEWER = 'sewer',
}

// Utility provider
export interface UtilityProvider {
  id: string;
  name: string;
  type: UtilityType;
  apiEndpoint: string;
  apiKey?: string;
  isActive: boolean;
  supportedRegions: string[];
  accountNumberFormat: string;
}

// Utility account
export interface UtilityAccount {
  id: string;
  propertyId: string;
  unitId?: string;
  providerId: string;
  accountNumber: string;
  type: UtilityType;
  status: 'active' | 'inactive' | 'suspended';
  startDate: Date;
  endDate?: Date;
  isTenantResponsible: boolean;
  autoPayEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Meter reading
export interface MeterReading {
  id: string;
  accountId: string;
  readingDate: Date;
  previousReading: number;
  currentReading: number;
  unit: string;
  readingType: 'actual' | 'estimated';
  submittedBy: string;
  verified: boolean;
  images?: string[];
}

// Utility bill
export interface UtilityBill {
  id: string;
  accountId: string;
  providerId: string;
  billNumber: string;
  billingPeriod: {
    startDate: Date;
    endDate: Date;
  };
  dueDate: Date;
  amount: number;
  currency: string;
  usage: number;
  unit: string;
  ratePerUnit: number;
  status: 'pending' | 'paid' | 'overdue' | 'disputed';
  paidAt?: Date;
  paidAmount?: number;
  createdAt: Date;
}

// Utility payment
export interface UtilityPayment {
  id: string;
  billId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: Date;
}

// Usage analytics
export interface UsageAnalytics {
  accountId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalUsage: number;
  averageDailyUsage: number;
  peakUsage: number;
  cost: number;
  comparison: {
    previousPeriod: number;
    changePercentage: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Create utility account
 */
export function createUtilityAccount(
  propertyId: string,
  providerId: string,
  accountNumber: string,
  type: UtilityType,
  isTenantResponsible: boolean,
  unitId?: string
): UtilityAccount {
  return {
    id: `utility_account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    propertyId,
    unitId,
    providerId,
    accountNumber,
    type,
    status: 'active',
    startDate: new Date(),
    isTenantResponsible,
    autoPayEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Update utility account
 */
export function updateUtilityAccount(
  account: UtilityAccount,
  updates: Partial<Omit<UtilityAccount, 'id' | 'createdAt'>>
): UtilityAccount {
  return {
    ...account,
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * Create meter reading
 */
export function createMeterReading(
  accountId: string,
  previousReading: number,
  currentReading: number,
  unit: string,
  readingType: 'actual' | 'estimated',
  submittedBy: string,
  images?: string[]
): MeterReading {
  return {
    id: `meter_reading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    accountId,
    readingDate: new Date(),
    previousReading,
    currentReading,
    unit,
    readingType,
    submittedBy,
    verified: false,
    images,
  };
}

/**
 * Verify meter reading
 */
export function verifyMeterReading(reading: MeterReading): MeterReading {
  return {
    ...reading,
    verified: true,
  };
}

/**
 * Calculate usage from reading
 */
export function calculateUsage(reading: MeterReading): number {
  return reading.currentReading - reading.previousReading;
}

/**
 * Create utility bill
 */
export function createUtilityBill(
  accountId: string,
  providerId: string,
  billNumber: string,
  billingPeriod: { startDate: Date; endDate: Date },
  dueDate: Date,
  amount: number,
  usage: number,
  unit: string,
  ratePerUnit: number
): UtilityBill {
  return {
    id: `utility_bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    accountId,
    providerId,
    billNumber,
    billingPeriod,
    dueDate,
    amount,
    currency: 'KES',
    usage,
    unit,
    ratePerUnit,
    status: 'pending',
    createdAt: new Date(),
  };
}

/**
 * Pay utility bill
 */
export function payUtilityBill(
  bill: UtilityBill,
  amount: number,
  _paymentMethod: string,
  _transactionId?: string
): UtilityBill {
  return {
    ...bill,
    status: 'paid',
    paidAt: new Date(),
    paidAmount: amount,
  };
}

/**
 * Create utility payment
 */
export function createUtilityPayment(
  billId: string,
  amount: number,
  paymentMethod: string,
  transactionId?: string
): UtilityPayment {
  return {
    id: `utility_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    billId,
    amount,
    paymentDate: new Date(),
    paymentMethod,
    transactionId,
    status: 'completed',
    createdAt: new Date(),
  };
}

/**
 * Sync bill from provider
 */
export async function syncBillFromProvider(
  _account: UtilityAccount,
  _provider: UtilityProvider
): Promise<UtilityBill | null> {
  // In production, this would call the provider's API to fetch the latest bill
  // For now, we'll simulate the sync
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return null to indicate no new bill (simulation)
    return null;
  } catch (error) {
    console.error('Failed to sync bill from provider:', error);
    return null;
  }
}

/**
 * Submit meter reading to provider
 */
export async function submitReadingToProvider(
  _reading: MeterReading,
  _provider: UtilityProvider
): Promise<boolean> {
  // In production, this would call the provider's API to submit the reading
  // For now, we'll simulate the submission
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true;
  } catch (error) {
    console.error('Failed to submit reading to provider:', error);
    return false;
  }
}

/**
 * Calculate usage analytics
 */
export function calculateUsageAnalytics(
  _readings: MeterReading[],
  bills: UtilityBill[],
  period: { startDate: Date; endDate: Date }
): UsageAnalytics {
  const accountId = _readings[0]?.accountId || '';
  
  // Filter readings by period
  const periodReadings = _readings.filter(r => 
    r.readingDate >= period.startDate && r.readingDate <= period.endDate
  );
  
  // Calculate total usage
  const totalUsage = periodReadings.reduce((sum, r) => sum + calculateUsage(r), 0);
  
  // Calculate average daily usage
  const daysInPeriod = Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24));
  const averageDailyUsage = totalUsage / daysInPeriod;
  
  // Find peak usage
  const peakUsage = Math.max(...periodReadings.map(r => calculateUsage(r)));
  
  // Calculate cost
  const periodBills = bills.filter(b => 
    b.billingPeriod.startDate >= period.startDate && b.billingPeriod.endDate <= period.endDate
  );
  const cost = periodBills.reduce((sum, b) => sum + b.amount, 0);
  
  // Calculate comparison with previous period
  const previousPeriodStart = new Date(period.startDate);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
  const previousPeriodEnd = new Date(period.startDate);
  
  const previousReadings = _readings.filter(r => 
    r.readingDate >= previousPeriodStart && r.readingDate <= previousPeriodEnd
  );
  const previousUsage = previousReadings.reduce((sum, r) => sum + calculateUsage(r), 0);
  
  const changePercentage = previousUsage > 0 ? ((totalUsage - previousUsage) / previousUsage) * 100 : 0;
  
  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (changePercentage > 5) {
    trend = 'increasing';
  } else if (changePercentage < -5) {
    trend = 'decreasing';
  }
  
  return {
    accountId,
    period,
    totalUsage,
    averageDailyUsage,
    peakUsage,
    cost,
    comparison: {
      previousPeriod: previousUsage,
      changePercentage,
    },
    trend,
  };
}

/**
 * Get utility type label
 */
export function getUtilityTypeLabel(type: UtilityType): string {
  const labels: Record<UtilityType, string> = {
    [UtilityType.ELECTRICITY]: 'Electricity',
    [UtilityType.WATER]: 'Water',
    [UtilityType.GAS]: 'Gas',
    [UtilityType.INTERNET]: 'Internet',
    [UtilityType.WASTE]: 'Waste',
    [UtilityType.SEWER]: 'Sewer',
  };

  return labels[type];
}

/**
 * Filter accounts by type
 */
export function filterAccountsByType(accounts: UtilityAccount[], type: UtilityType): UtilityAccount[] {
  return accounts.filter(account => account.type === type);
}

/**
 * Filter accounts by status
 */
export function filterAccountsByStatus(accounts: UtilityAccount[], status: 'active' | 'inactive' | 'suspended'): UtilityAccount[] {
  return accounts.filter(account => account.status === status);
}

/**
 * Filter bills by status
 */
export function filterBillsByStatus(bills: UtilityBill[], status: 'pending' | 'paid' | 'overdue' | 'disputed'): UtilityBill[] {
  return bills.filter(bill => bill.status === status);
}

/**
 * Get overdue bills
 */
export function getOverdueBills(bills: UtilityBill[]): UtilityBill[] {
  const now = new Date();
  return bills.filter(bill => bill.status === 'pending' && bill.dueDate < now);
}

/**
 * Get utility statistics
 */
export function getUtilityStatistics(
  accounts: UtilityAccount[],
  bills: UtilityBill[],
  _readings: MeterReading[]
): {
  totalAccounts: number;
  activeAccounts: number;
  tenantResponsible: number;
  landlordResponsible: number;
  totalBills: number;
  pendingBills: number;
  overdueBills: number;
  paidBills: number;
  totalAmountDue: number;
  totalAmountPaid: number;
  byType: Record<UtilityType, number>;
  byStatus: Record<'active' | 'inactive' | 'suspended', number>;
} {
  const activeAccounts = accounts.filter(a => a.status === 'active').length;
  const tenantResponsible = accounts.filter(a => a.isTenantResponsible).length;
  const landlordResponsible = accounts.filter(a => !a.isTenantResponsible).length;
  
  const pendingBills = bills.filter(b => b.status === 'pending').length;
  const overdueBills = getOverdueBills(bills).length;
  const paidBills = bills.filter(b => b.status === 'paid').length;
  
  const totalAmountDue = bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);
  const totalAmountPaid = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.paidAmount || 0), 0);
  
  const byType: Record<UtilityType, number> = {
    [UtilityType.ELECTRICITY]: 0,
    [UtilityType.WATER]: 0,
    [UtilityType.GAS]: 0,
    [UtilityType.INTERNET]: 0,
    [UtilityType.WASTE]: 0,
    [UtilityType.SEWER]: 0,
  };
  
  const byStatus: Record<'active' | 'inactive' | 'suspended', number> = {
    active: 0,
    inactive: 0,
    suspended: 0,
  };
  
  for (const account of accounts) {
    byType[account.type]++;
    byStatus[account.status]++;
  }
  
  return {
    totalAccounts: accounts.length,
    activeAccounts,
    tenantResponsible,
    landlordResponsible,
    totalBills: bills.length,
    pendingBills,
    overdueBills,
    paidBills,
    totalAmountDue,
    totalAmountPaid,
    byType,
    byStatus,
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
