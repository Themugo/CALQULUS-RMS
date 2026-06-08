/**
 * Invoice Numbering System
 * 
 * Implements invoice numbering standards with:
 * - Sequential numbering
 * - Fiscal year-based numbering
 * - Document type prefixes
 * - Gap detection and prevention
 * - Compliance with local regulations
 */

// Document type
export enum DocumentType {
  INVOICE = 'invoice',
  CREDIT_NOTE = 'credit_note',
  DEBIT_NOTE = 'debit_note',
  RECEIPT = 'receipt',
  PURCHASE_ORDER = 'purchase_order',
  QUOTATION = 'quotation',
}

// Numbering pattern
export enum NumberingPattern {
  SEQUENTIAL = 'sequential',
  FISCAL_YEAR = 'fiscal_year',
  CALENDAR_YEAR = 'calendar_year',
  CUSTOM = 'custom',
}

// Invoice number configuration
export interface InvoiceNumberConfig {
  documentType: DocumentType;
  pattern: NumberingPattern;
  prefix: string;
  fiscalYearStartMonth?: number; // 0-11, default 0 (January)
  resetPeriod?: 'yearly' | 'monthly' | 'never';
  padding: number; // Number of digits for sequence
  separator: string;
}

// Invoice number sequence
export interface InvoiceNumberSequence {
  id: string;
  documentType: DocumentType;
  fiscalYear: number;
  calendarYear: number;
  sequence: number;
  lastUsedAt: Date;
  createdBy: string;
  createdAt: Date;
}

// Invoice number
export interface InvoiceNumber {
  documentType: DocumentType;
  number: string;
  sequence: number;
  fiscalYear: number;
  calendarYear: number;
  issuedAt: Date;
}

// Default configurations
const DEFAULT_CONFIGS: Record<DocumentType, InvoiceNumberConfig> = {
  [DocumentType.INVOICE]: {
    documentType: DocumentType.INVOICE,
    pattern: NumberingPattern.FISCAL_YEAR,
    prefix: 'INV',
    fiscalYearStartMonth: 0,
    resetPeriod: 'yearly',
    padding: 6,
    separator: '-',
  },
  [DocumentType.CREDIT_NOTE]: {
    documentType: DocumentType.CREDIT_NOTE,
    pattern: NumberingPattern.FISCAL_YEAR,
    prefix: 'CN',
    fiscalYearStartMonth: 0,
    resetPeriod: 'yearly',
    padding: 6,
    separator: '-',
  },
  [DocumentType.DEBIT_NOTE]: {
    documentType: DocumentType.DEBIT_NOTE,
    pattern: NumberingPattern.FISCAL_YEAR,
    prefix: 'DN',
    fiscalYearStartMonth: 0,
    resetPeriod: 'yearly',
    padding: 6,
    separator: '-',
  },
  [DocumentType.RECEIPT]: {
    documentType: DocumentType.RECEIPT,
    pattern: NumberingPattern.CALENDAR_YEAR,
    prefix: 'RCP',
    resetPeriod: 'yearly',
    padding: 6,
    separator: '-',
  },
  [DocumentType.PURCHASE_ORDER]: {
    documentType: DocumentType.PURCHASE_ORDER,
    pattern: NumberingPattern.CALENDAR_YEAR,
    prefix: 'PO',
    resetPeriod: 'yearly',
    padding: 6,
    separator: '-',
  },
  [DocumentType.QUOTATION]: {
    documentType: DocumentType.QUOTATION,
    pattern: NumberingPattern.CALENDAR_YEAR,
    prefix: 'QT',
    resetPeriod: 'yearly',
    padding: 6,
    separator: '-',
  },
};

/**
 * Get fiscal year
 */
export function getFiscalYear(date: Date, startMonth: number = 0): number {
  const month = date.getMonth();
  const year = date.getFullYear();
  
  if (month >= startMonth) {
    return year;
  } else {
    return year - 1;
  }
}

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(
  documentType: DocumentType,
  sequence: number,
  date: Date,
  config: InvoiceNumberConfig
): string {
  const paddedSequence = sequence.toString().padStart(config.padding, '0');
  
  switch (config.pattern) {
    case NumberingPattern.SEQUENTIAL:
      return `${config.prefix}${config.separator}${paddedSequence}`;
    
    case NumberingPattern.FISCAL_YEAR: {
      const fiscalYear = getFiscalYear(date, config.fiscalYearStartMonth);
      const fiscalYearShort = fiscalYear.toString().slice(-2);
      return `${config.prefix}${config.separator}${fiscalYearShort}${config.separator}${paddedSequence}`;
    }
    
    case NumberingPattern.CALENDAR_YEAR: {
      const calendarYear = date.getFullYear();
      const calendarYearShort = calendarYear.toString().slice(-2);
      return `${config.prefix}${config.separator}${calendarYearShort}${config.separator}${paddedSequence}`;
    }
    
    case NumberingPattern.CUSTOM:
      // Custom pattern would be defined by user
      return `${config.prefix}${config.separator}${paddedSequence}`;
    
    default:
      return `${config.prefix}${config.separator}${paddedSequence}`;
  }
}

/**
 * Parse invoice number
 */
export function parseInvoiceNumber(
  invoiceNumber: string,
  config: InvoiceNumberConfig
): InvoiceNumber | null {
  const parts = invoiceNumber.split(config.separator);
  
  if (parts.length < 2) {
    return null;
  }
  
  const prefix = parts[0];
  if (prefix !== config.prefix) {
    return null;
  }
  
  let sequence = 0;
  let fiscalYear = new Date().getFullYear();
  let calendarYear = new Date().getFullYear();
  
  switch (config.pattern) {
    case NumberingPattern.SEQUENTIAL:
      sequence = parseInt(parts[1], 10);
      break;
    
    case NumberingPattern.FISCAL_YEAR:
      if (parts.length >= 3) {
        const yearShort = parts[1];
        fiscalYear = parseInt(`20${yearShort}`, 10);
        sequence = parseInt(parts[2], 10);
      }
      break;
    
    case NumberingPattern.CALENDAR_YEAR:
      if (parts.length >= 3) {
        const yearShort = parts[1];
        calendarYear = parseInt(`20${yearShort}`, 10);
        sequence = parseInt(parts[2], 10);
      }
      break;
    
    default:
      sequence = parseInt(parts[1], 10);
  }
  
  if (isNaN(sequence)) {
    return null;
  }
  
  return {
    documentType: config.documentType,
    number: invoiceNumber,
    sequence,
    fiscalYear,
    calendarYear,
    issuedAt: new Date(),
  };
}

/**
 * Get next sequence number
 */
export function getNextSequenceNumber(
  documentType: DocumentType,
  date: Date,
  sequences: InvoiceNumberSequence[],
  config: InvoiceNumberConfig
): number {
  const fiscalYear = getFiscalYear(date, config.fiscalYearStartMonth);
  const calendarYear = date.getFullYear();
  
  // Find the last sequence for this document type and period
  const relevantSequences = sequences.filter(seq => {
    if (seq.documentType !== documentType) return false;
    
    switch (config.pattern) {
      case NumberingPattern.FISCAL_YEAR:
        return seq.fiscalYear === fiscalYear;
      case NumberingPattern.CALENDAR_YEAR:
        return seq.calendarYear === calendarYear;
      default:
        return true;
    }
  });
  
  if (relevantSequences.length === 0) {
    return 1;
  }
  
  const lastSequence = Math.max(...relevantSequences.map(seq => seq.sequence));
  return lastSequence + 1;
}

/**
 * Create invoice number sequence
 */
export function createInvoiceNumberSequence(
  documentType: DocumentType,
  sequence: number,
  date: Date,
  userId: string,
  config: InvoiceNumberConfig
): InvoiceNumberSequence {
  const fiscalYear = getFiscalYear(date, config.fiscalYearStartMonth);
  const calendarYear = date.getFullYear();
  
  return {
    id: `seq_${documentType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    documentType,
    fiscalYear,
    calendarYear,
    sequence,
    lastUsedAt: date,
    createdBy: userId,
    createdAt: new Date(),
  };
}

/**
 * Validate invoice number format
 */
export function validateInvoiceNumberFormat(
  invoiceNumber: string,
  config: InvoiceNumberConfig
): boolean {
  const parsed = parseInvoiceNumber(invoiceNumber, config);
  return parsed !== null;
}

/**
 * Detect gaps in sequence
 */
export function detectSequenceGaps(
  sequences: InvoiceNumberSequence[],
  config: InvoiceNumberConfig
): Array<{ fiscalYear?: number; calendarYear?: number; expected: number; actual: number; gap: number }> {
  const gaps: Array<{ fiscalYear?: number; calendarYear?: number; expected: number; actual: number; gap: number }> = [];
  
  // Group sequences by period
  const groupedByPeriod = new Map<string, InvoiceNumberSequence[]>();
  
  for (const seq of sequences) {
    const periodKey = config.pattern === NumberingPattern.FISCAL_YEAR 
      ? seq.fiscalYear.toString()
      : seq.calendarYear.toString();
    
    if (!groupedByPeriod.has(periodKey)) {
      groupedByPeriod.set(periodKey, []);
    }
    
    groupedByPeriod.get(periodKey)!.push(seq);
  }
  
  // Check for gaps in each period
  for (const [periodKey, periodSequences] of groupedByPeriod) {
    const sortedSequences = periodSequences.sort((a, b) => a.sequence - b.sequence);
    
    for (let i = 0; i < sortedSequences.length; i++) {
      const expected = i + 1;
      const actual = sortedSequences[i].sequence;
      
      if (actual !== expected) {
        const gap = actual - expected;
        
        if (config.pattern === NumberingPattern.FISCAL_YEAR) {
          gaps.push({
            fiscalYear: parseInt(periodKey, 10),
            expected,
            actual,
            gap,
          });
        } else {
          gaps.push({
            calendarYear: parseInt(periodKey, 10),
            expected,
            actual,
            gap,
          });
        }
      }
    }
  }
  
  return gaps;
}

/**
 * Get default configuration
 */
export function getDefaultConfig(documentType: DocumentType): InvoiceNumberConfig {
  return DEFAULT_CONFIGS[documentType];
}

/**
 * Update configuration
 */
export function updateConfiguration(
  documentType: DocumentType,
  updates: Partial<InvoiceNumberConfig>
): InvoiceNumberConfig {
  return {
    ...DEFAULT_CONFIGS[documentType],
    ...updates,
  };
}

/**
 * Validate configuration
 */
export function validateConfiguration(config: InvoiceNumberConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.prefix || config.prefix.trim() === '') {
    errors.push('Prefix is required');
  }
  
  if (config.padding < 1 || config.padding > 10) {
    errors.push('Padding must be between 1 and 10');
  }
  
  if (config.fiscalYearStartMonth !== undefined && (config.fiscalYearStartMonth < 0 || config.fiscalYearStartMonth > 11)) {
    errors.push('Fiscal year start month must be between 0 and 11');
  }
  
  if (config.separator.length > 3) {
    errors.push('Separator must be 3 characters or less');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get document type label
 */
export function getDocumentTypeLabel(documentType: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    [DocumentType.INVOICE]: 'Invoice',
    [DocumentType.CREDIT_NOTE]: 'Credit Note',
    [DocumentType.DEBIT_NOTE]: 'Debit Note',
    [DocumentType.RECEIPT]: 'Receipt',
    [DocumentType.PURCHASE_ORDER]: 'Purchase Order',
    [DocumentType.QUOTATION]: 'Quotation',
  };

  return labels[documentType];
}

/**
 * Get numbering pattern label
 */
export function getNumberingPatternLabel(pattern: NumberingPattern): string {
  const labels: Record<NumberingPattern, string> = {
    [NumberingPattern.SEQUENTIAL]: 'Sequential',
    [NumberingPattern.FISCAL_YEAR]: 'Fiscal Year',
    [NumberingPattern.CALENDAR_YEAR]: 'Calendar Year',
    [NumberingPattern.CUSTOM]: 'Custom',
  };

  return labels[pattern];
}

/**
 * Export numbering configuration
 */
export function exportConfiguration(config: InvoiceNumberConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Import numbering configuration
 */
export function importConfiguration(configJson: string): InvoiceNumberConfig | null {
  try {
    const config = JSON.parse(configJson) as InvoiceNumberConfig;
    const validation = validateConfiguration(config);
    
    if (!validation.isValid) {
      return null;
    }
    
    return config;
  } catch {
    return null;
  }
}

/**
 * Reset sequence for period
 */
export function resetSequenceForPeriod(
  documentType: DocumentType,
  fiscalYear?: number,
  calendarYear?: number
): InvoiceNumberSequence {
  const now = new Date();
  
  return {
    id: `seq_${documentType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    documentType,
    fiscalYear: fiscalYear || now.getFullYear(),
    calendarYear: calendarYear || now.getFullYear(),
    sequence: 0,
    lastUsedAt: now,
    createdBy: 'system',
    createdAt: now,
  };
}

/**
 * Get sequence statistics
 */
export function getSequenceStatistics(sequences: InvoiceNumberSequence[]): {
  totalSequences: number;
  byDocumentType: Record<DocumentType, number>;
  byFiscalYear: Record<number, number>;
  byCalendarYear: Record<number, number>;
} {
  const stats = {
    totalSequences: sequences.length,
    byDocumentType: {
      [DocumentType.INVOICE]: 0,
      [DocumentType.CREDIT_NOTE]: 0,
      [DocumentType.DEBIT_NOTE]: 0,
      [DocumentType.RECEIPT]: 0,
      [DocumentType.PURCHASE_ORDER]: 0,
      [DocumentType.QUOTATION]: 0,
    },
    byFiscalYear: {} as Record<number, number>,
    byCalendarYear: {} as Record<number, number>,
  };
  
  for (const seq of sequences) {
    stats.byDocumentType[seq.documentType]++;
    stats.byFiscalYear[seq.fiscalYear] = (stats.byFiscalYear[seq.fiscalYear] || 0) + 1;
    stats.byCalendarYear[seq.calendarYear] = (stats.byCalendarYear[seq.calendarYear] || 0) + 1;
  }
  
  return stats;
}
