/**
 * Automated Lease Extraction
 * 
 * Implements AI-powered lease data extraction with:
 * - Document parsing
 * - Key field extraction
 * - Date recognition
 * - Amount parsing
 * - Clause identification
 * - Validation and verification
 */

// Extracted lease data
export interface ExtractedLeaseData {
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  landlordName: string;
  propertyAddress: string;
  unitNumber?: string;
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  rentFrequency: 'monthly' | 'weekly' | 'bi-weekly' | 'quarterly' | 'yearly';
  securityDeposit: number;
  leaseType: 'residential' | 'commercial';
  clauses: LeaseClause[];
  confidence: number; // 0-1
  extractedFields: string[];
  missingFields: string[];
}

// Lease clause
export interface LeaseClause {
  type: string;
  content: string;
  section?: string;
}

// Extraction result
export interface ExtractionResult {
  success: boolean;
  data?: ExtractedLeaseData;
  errors: ExtractionError[];
  warnings: ExtractionWarning[];
}

// Extraction error
export interface ExtractionError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// Extraction warning
export interface ExtractionWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Extract lease data from text
 */
export function extractLeaseData(documentText: string): ExtractionResult {
  const errors: ExtractionError[] = [];
  const warnings: ExtractionWarning[] = [];
  const extractedFields: string[] = [];
  const missingFields: string[] = [];
  
  // Extract tenant name
  const tenantName = extractTenantName(documentText);
  if (tenantName) {
    extractedFields.push('tenantName');
  } else {
    missingFields.push('tenantName');
    errors.push({
      field: 'tenantName',
      message: 'Tenant name could not be extracted',
      severity: 'critical',
    });
  }
  
  // Extract tenant email
  const tenantEmail = extractEmail(documentText);
  if (tenantEmail) {
    extractedFields.push('tenantEmail');
  } else {
    missingFields.push('tenantEmail');
    warnings.push({
      field: 'tenantEmail',
      message: 'Tenant email could not be extracted',
      severity: 'low',
    });
  }
  
  // Extract tenant phone
  const tenantPhone = extractPhoneNumber(documentText);
  if (tenantPhone) {
    extractedFields.push('tenantPhone');
  } else {
    missingFields.push('tenantPhone');
    warnings.push({
      field: 'tenantPhone',
      message: 'Tenant phone could not be extracted',
      severity: 'low',
    });
  }
  
  // Extract landlord name
  const landlordName = extractLandlordName(documentText);
  if (landlordName) {
    extractedFields.push('landlordName');
  } else {
    missingFields.push('landlordName');
    errors.push({
      field: 'landlordName',
      message: 'Landlord name could not be extracted',
      severity: 'critical',
    });
  }
  
  // Extract property address
  const propertyAddress = extractPropertyAddress(documentText);
  if (propertyAddress) {
    extractedFields.push('propertyAddress');
  } else {
    missingFields.push('propertyAddress');
    errors.push({
      field: 'propertyAddress',
      message: 'Property address could not be extracted',
      severity: 'critical',
    });
  }
  
  // Extract unit number
  const unitNumber = extractUnitNumber(documentText);
  if (unitNumber) {
    extractedFields.push('unitNumber');
  } else {
    missingFields.push('unitNumber');
    warnings.push({
      field: 'unitNumber',
      message: 'Unit number could not be extracted',
      severity: 'low',
    });
  }
  
  // Extract start date
  const startDate = extractDate(documentText, ['start', 'commencement', 'begin', 'effective']);
  if (startDate) {
    extractedFields.push('startDate');
  } else {
    missingFields.push('startDate');
    errors.push({
      field: 'startDate',
      message: 'Start date could not be extracted',
      severity: 'critical',
    });
  }
  
  // Extract end date
  const endDate = extractDate(documentText, ['end', 'expire', 'termination', 'conclusion']);
  if (endDate) {
    extractedFields.push('endDate');
  } else {
    missingFields.push('endDate');
    errors.push({
      field: 'endDate',
      message: 'End date could not be extracted',
      severity: 'critical',
    });
  }
  
  // Extract rent amount
  const rentAmount = extractAmount(documentText, ['rent', 'monthly rent', 'payment']);
  if (rentAmount) {
    extractedFields.push('rentAmount');
  } else {
    missingFields.push('rentAmount');
    errors.push({
      field: 'rentAmount',
      message: 'Rent amount could not be extracted',
      severity: 'critical',
    });
  }
  
  // Extract rent frequency
  const rentFrequency = extractRentFrequency(documentText);
  if (rentFrequency) {
    extractedFields.push('rentFrequency');
  } else {
    missingFields.push('rentFrequency');
    warnings.push({
      field: 'rentFrequency',
      message: 'Rent frequency could not be extracted, defaulting to monthly',
      severity: 'medium',
    });
  }
  
  // Extract security deposit
  const securityDeposit = extractAmount(documentText, ['security deposit', 'deposit', 'security']);
  if (securityDeposit) {
    extractedFields.push('securityDeposit');
  } else {
    missingFields.push('securityDeposit');
    warnings.push({
      field: 'securityDeposit',
      message: 'Security deposit could not be extracted',
      severity: 'medium',
    });
  }
  
  // Extract lease type
  const leaseType = extractLeaseType(documentText);
  extractedFields.push('leaseType');
  
  // Extract clauses
  const clauses = extractClauses(documentText);
  extractedFields.push('clauses');
  
  // Calculate confidence
  const confidence = calculateConfidence(extractedFields.length, missingFields.length);
  
  // Check if critical fields are missing
  const criticalFields = ['tenantName', 'landlordName', 'propertyAddress', 'startDate', 'endDate', 'rentAmount'];
  const missingCriticalFields = criticalFields.filter(field => missingFields.includes(field));
  
  if (missingCriticalFields.length > 0) {
    return {
      success: false,
      errors,
      warnings,
    };
  }
  
  const data: ExtractedLeaseData = {
    tenantName: tenantName || '',
    tenantEmail: tenantEmail || undefined,
    tenantPhone: tenantPhone || undefined,
    landlordName: landlordName || '',
    propertyAddress: propertyAddress || '',
    unitNumber: unitNumber || undefined,
    startDate: startDate || new Date(),
    endDate: endDate || new Date(),
    rentAmount: rentAmount || 0,
    rentFrequency: rentFrequency || 'monthly',
    securityDeposit: securityDeposit || 0,
    leaseType: leaseType || 'residential',
    clauses,
    confidence,
    extractedFields,
    missingFields,
  };
  
  return {
    success: true,
    data,
    errors,
    warnings,
  };
}

/**
 * Extract tenant name
 */
function extractTenantName(text: string): string | null {
  const patterns = [
    /tenant[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /between[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+and/i,
    /lessee[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Extract email
 */
function extractEmail(text: string): string | null {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailPattern);
  return match ? match[0] : null;
}

/**
 * Extract phone number
 */
function extractPhoneNumber(text: string): string | null {
  const patterns = [
    /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return null;
}

/**
 * Extract landlord name
 */
function extractLandlordName(text: string): string | null {
  const patterns = [
    /landlord[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /owner[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /lessor[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Extract property address
 */
function extractPropertyAddress(text: string): string | null {
  const patterns = [
    /property[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+\d+)?(?:\s+[A-Z][a-z]+)?)/i,
    /premises[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+\d+)?(?:\s+[A-Z][a-z]+)?)/i,
    /located at[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+\d+)?(?:\s+[A-Z][a-z]+)?)/i,
    /\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)?/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  
  return null;
}

/**
 * Extract unit number
 */
function extractUnitNumber(text: string): string | null {
  const patterns = [
    /unit[:\s]+(\w+)/i,
    /apartment[:\s]+(\w+)/i,
    /apt[:\s]+(\w+)/i,
    /#\s*(\w+)/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Extract date
 */
function extractDate(text: string, keywords: string[]): Date | null {
  const keywordPattern = new RegExp(`(?:${keywords.join('|')})[:\\s]+(${datePattern})`, 'i');
  const match = text.match(keywordPattern);
  
  if (match) {
    const dateStr = match[1];
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Try to find any date pattern
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    const date = new Date(dateMatch[0]);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

const datePattern = '\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},?\\s+\\d{4}';

/**
 * Extract amount
 */
function extractAmount(text: string, keywords: string[]): number | null {
  const keywordPattern = new RegExp(`(?:${keywords.join('|')})[:\\s]+\\$?([\\d,]+(?:\\.\\d{2})?)`, 'i');
  const match = text.match(keywordPattern);
  
  if (match) {
    const amountStr = match[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (!isNaN(amount)) {
      return amount;
    }
  }
  
  // Try to find any currency pattern
  const currencyPattern = /\$?([\d,]+(?:\.\d{2})?)/;
  const currencyMatch = text.match(currencyPattern);
  
  if (currencyMatch) {
    const amountStr = currencyMatch[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (!isNaN(amount) && amount > 0) {
      return amount;
    }
  }
  
  return null;
}

/**
 * Extract rent frequency
 */
function extractRentFrequency(text: string): 'monthly' | 'weekly' | 'bi-weekly' | 'quarterly' | 'yearly' | null {
  const patterns = [
    { pattern: /monthly/i, frequency: 'monthly' as const },
    { pattern: /weekly/i, frequency: 'weekly' as const },
    { pattern: /bi[-\s]?weekly/i, frequency: 'bi-weekly' as const },
    { pattern: /quarterly/i, frequency: 'quarterly' as const },
    { pattern: /yearly|annually/i, frequency: 'yearly' as const },
  ];
  
  for (const { pattern, frequency } of patterns) {
    if (pattern.test(text)) {
      return frequency;
    }
  }
  
  return null;
}

/**
 * Extract lease type
 */
function extractLeaseType(text: string): 'residential' | 'commercial' {
  if (/commercial|business|office/i.test(text)) {
    return 'commercial';
  }
  return 'residential';
}

/**
 * Extract clauses
 */
function extractClauses(text: string): LeaseClause[] {
  const clauses: LeaseClause[] = [];
  
  // Common lease clauses
  const clausePatterns = [
    { type: 'Termination', pattern: /termination[:\s]+([^.\n]+)/i },
    { type: 'Renewal', pattern: /renewal[:\s]+([^.\n]+)/i },
    { type: 'Security Deposit', pattern: /security deposit[:\s]+([^.\n]+)/i },
    { type: 'Maintenance', pattern: /maintenance[:\s]+([^.\n]+)/i },
    { type: 'Utilities', pattern: /utilities[:\s]+([^.\n]+)/i },
    { type: 'Pets', pattern: /pets?[:\s]+([^.\n]+)/i },
    { type: 'Subletting', pattern: /sublet(ting)?[:\s]+([^.\n]+)/i },
    { type: 'Quiet Enjoyment', pattern: /quiet enjoyment[:\s]+([^.\n]+)/i },
  ];
  
  for (const { type, pattern } of clausePatterns) {
    const match = text.match(pattern);
    if (match) {
      clauses.push({
        type,
        content: match[1].trim(),
      });
    }
  }
  
  return clauses;
}

/**
 * Calculate confidence
 */
function calculateConfidence(extractedCount: number, _missingCount: number): number {
  const totalFields = 10; // Approximate total number of important fields
  return Math.max(0, Math.min(1, extractedCount / totalFields));
}

/**
 * Validate extracted data
 */
export function validateExtractedData(data: ExtractedLeaseData): {
  isValid: boolean;
  validationErrors: string[];
} {
  const validationErrors: string[] = [];
  
  if (!data.tenantName) {
    validationErrors.push('Tenant name is required');
  }
  
  if (!data.landlordName) {
    validationErrors.push('Landlord name is required');
  }
  
  if (!data.propertyAddress) {
    validationErrors.push('Property address is required');
  }
  
  if (!data.startDate || isNaN(data.startDate.getTime())) {
    validationErrors.push('Valid start date is required');
  }
  
  if (!data.endDate || isNaN(data.endDate.getTime())) {
    validationErrors.push('Valid end date is required');
  }
  
  if (data.startDate && data.endDate && data.startDate >= data.endDate) {
    validationErrors.push('End date must be after start date');
  }
  
  if (data.rentAmount <= 0) {
    validationErrors.push('Rent amount must be greater than 0');
  }
  
  return {
    isValid: validationErrors.length === 0,
    validationErrors,
  };
}

/**
 * Format extracted data for display
 */
export function formatExtractedData(data: ExtractedLeaseData): string {
  return `
Extracted Lease Data:
======================
Tenant Name: ${data.tenantName}
Tenant Email: ${data.tenantEmail || 'N/A'}
Tenant Phone: ${data.tenantPhone || 'N/A'}
Landlord Name: ${data.landlordName}
Property Address: ${data.propertyAddress}
Unit Number: ${data.unitNumber || 'N/A'}
Start Date: ${data.startDate.toDateString()}
End Date: ${data.endDate.toDateString()}
Rent Amount: $${data.rentAmount.toLocaleString()}
Rent Frequency: ${data.rentFrequency}
Security Deposit: $${data.securityDeposit.toLocaleString()}
Lease Type: ${data.leaseType}
Confidence: ${(data.confidence * 100).toFixed(0)}%
Extracted Fields: ${data.extractedFields.join(', ')}
Missing Fields: ${data.missingFields.join(', ') || 'None'}
Clauses: ${data.clauses.length} found
  `.trim();
}

/**
 * Batch extract leases
 */
export function batchExtractLeases(documents: string[]): ExtractionResult[] {
  return documents.map(doc => extractLeaseData(doc));
}

/**
 * Get extraction statistics
 */
export function getExtractionStatistics(results: ExtractionResult[]): {
  totalDocuments: number;
  successfulExtractions: number;
  failedExtractions: number;
  averageConfidence: number;
  commonMissingFields: Record<string, number>;
} {
  const successfulExtractions = results.filter(r => r.success).length;
  const failedExtractions = results.filter(r => !r.success).length;
  
  const successfulResults = results.filter(r => r.success && r.data);
  const averageConfidence = successfulResults.length > 0
    ? successfulResults.reduce((sum, r) => sum + (r.data?.confidence || 0), 0) / successfulResults.length
    : 0;
  
  const commonMissingFields: Record<string, number> = {};
  
  for (const result of results) {
    if (result.data) {
      for (const field of result.data.missingFields) {
        commonMissingFields[field] = (commonMissingFields[field] || 0) + 1;
      }
    }
  }
  
  return {
    totalDocuments: results.length,
    successfulExtractions,
    failedExtractions,
    averageConfidence,
    commonMissingFields,
  };
}
