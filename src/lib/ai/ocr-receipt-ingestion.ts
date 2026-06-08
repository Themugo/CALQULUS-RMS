/**
 * OCR Receipt Ingestion
 * 
 * Implements OCR-based receipt processing with:
 * - Receipt image processing
 * - Text extraction
 * - Data parsing
 * - Amount recognition
 * - Date extraction
 * - Merchant identification
 * - Line item extraction
 */

// Receipt data
export interface ReceiptData {
  merchantName: string;
  merchantAddress?: string;
  merchantPhone?: string;
  date: Date;
  totalAmount: number;
  taxAmount?: number;
  subtotal?: number;
  lineItems: ReceiptLineItem[];
  paymentMethod?: string;
  cardLast4?: string;
  confidence: number; // 0-1
  extractedFields: string[];
  missingFields: string[];
}

// Receipt line item
export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// OCR result
export interface OCRResult {
  success: boolean;
  text?: string;
  confidence: number;
  error?: string;
}

// Parsed receipt result
export interface ParsedReceiptResult {
  success: boolean;
  data?: ReceiptData;
  errors: string[];
  warnings: string[];
}

/**
 * Process receipt image
 */
export async function processReceiptImage(imageData: ArrayBuffer): Promise<ParsedReceiptResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Perform OCR (simulated - in production, use actual OCR service)
  const ocrResult = await performOCR(imageData);
  
  if (!ocrResult.success || !ocrResult.text) {
    return {
      success: false,
      errors: ['OCR processing failed'],
      warnings,
    };
  }
  
  const text = ocrResult.text;
  
  // Extract receipt data
  const receiptData = extractReceiptData(text);
  
  // Validate extracted data
  const validationErrors = validateReceiptData(receiptData);
  errors.push(...validationErrors);
  
  if (validationErrors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
    };
  }
  
  return {
    success: true,
    data: receiptData,
    errors,
    warnings,
  };
}

/**
 * Perform OCR (simulated)
 */
async function performOCR(_imageData: ArrayBuffer): Promise<OCRResult> {
  // In production, this would call an actual OCR service like Tesseract.js, Google Vision, or AWS Textract
  // For now, we'll simulate the OCR process
  
  try {
    // Simulate OCR processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate extracted text
    const simulatedText = `
RECEINT
ABC Store
123 Main Street
Nairobi, Kenya
+254 700 123 456

Date: 2024-06-01
Time: 14:30

Item                Qty    Price    Total
Coffee              2      150      300
Sandwich            1      500      500
Juice               1      200      200

Subtotal:                            1000
Tax (16%):                             160
TOTAL:                               1160

Payment Method: M-PESA
Card: **** 1234

Thank you for shopping with us!
    `.trim();
    
    return {
      success: true,
      text: simulatedText,
      confidence: 0.85,
    };
  } catch (error) {
    return {
      success: false,
      confidence: 0,
      error: String(error),
    };
  }
}

/**
 * Extract receipt data from text
 */
function extractReceiptData(text: string): ReceiptData {
  const extractedFields: string[] = [];
  const missingFields: string[] = [];
  
  // Extract merchant name
  const merchantName = extractMerchantName(text);
  if (merchantName) {
    extractedFields.push('merchantName');
  } else {
    missingFields.push('merchantName');
  }
  
  // Extract merchant address
  const merchantAddress = extractMerchantAddress(text);
  if (merchantAddress) {
    extractedFields.push('merchantAddress');
  } else {
    missingFields.push('merchantAddress');
  }
  
  // Extract merchant phone
  const merchantPhone = extractPhoneNumber(text);
  if (merchantPhone) {
    extractedFields.push('merchantPhone');
  } else {
    missingFields.push('merchantPhone');
  }
  
  // Extract date
  const date = extractDate(text);
  if (date) {
    extractedFields.push('date');
  } else {
    missingFields.push('date');
  }
  
  // Extract total amount
  const totalAmount = extractTotalAmount(text);
  if (totalAmount) {
    extractedFields.push('totalAmount');
  } else {
    missingFields.push('totalAmount');
  }
  
  // Extract tax amount
  const taxAmount = extractTaxAmount(text);
  if (taxAmount) {
    extractedFields.push('taxAmount');
  } else {
    missingFields.push('taxAmount');
  }
  
  // Extract subtotal
  const subtotal = extractSubtotal(text);
  if (subtotal) {
    extractedFields.push('subtotal');
  } else {
    missingFields.push('subtotal');
  }
  
  // Extract line items
  const lineItems = extractLineItems(text);
  if (lineItems.length > 0) {
    extractedFields.push('lineItems');
  } else {
    missingFields.push('lineItems');
  }
  
  // Extract payment method
  const paymentMethod = extractPaymentMethod(text);
  if (paymentMethod) {
    extractedFields.push('paymentMethod');
  } else {
    missingFields.push('paymentMethod');
  }
  
  // Extract card last 4
  const cardLast4 = extractCardLast4(text);
  if (cardLast4) {
    extractedFields.push('cardLast4');
  } else {
    missingFields.push('cardLast4');
  }
  
  // Calculate confidence
  const confidence = calculateConfidence(extractedFields.length, missingFields.length);
  
  return {
    merchantName: merchantName || 'Unknown Merchant',
    merchantAddress: merchantAddress || undefined,
    merchantPhone: merchantPhone || undefined,
    date: date || new Date(),
    totalAmount: totalAmount || 0,
    taxAmount: taxAmount || undefined,
    subtotal: subtotal || undefined,
    lineItems,
    paymentMethod: paymentMethod || undefined,
    cardLast4: cardLast4 || undefined,
    confidence,
    extractedFields,
    missingFields,
  };
}

/**
 * Extract merchant name
 */
function extractMerchantName(text: string): string | null {
  const lines = text.split('\n');
  // Merchant name is typically the first non-empty line
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.match(/date|time|total|subtotal|tax/i)) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Extract merchant address
 */
function extractMerchantAddress(text: string): string | null {
  const addressPattern = /^\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/m;
  const match = text.match(addressPattern);
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
 * Extract date
 */
function extractDate(text: string): Date | null {
  const patterns = [
    /date[:\s]+(\d{4}-\d{2}-\d{2})/i,
    /date[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    /(\d{4}-\d{2}-\d{2})/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1];
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}

/**
 * Extract total amount
 */
function extractTotalAmount(text: string): number | null {
  const patterns = [
    /total[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
    /amount[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
    /grand total[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        return amount;
      }
    }
  }
  
  return null;
}

/**
 * Extract tax amount
 */
function extractTaxAmount(text: string): number | null {
  const patterns = [
    /tax[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
    /vat[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        return amount;
      }
    }
  }
  
  return null;
}

/**
 * Extract subtotal
 */
function extractSubtotal(text: string): number | null {
  const pattern = /subtotal[:\s]+\$?([\d,]+(?:\.\d{2})?)/i;
  const match = text.match(pattern);
  
  if (match) {
    const amountStr = match[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (!isNaN(amount)) {
      return amount;
    }
  }
  
  return null;
}

/**
 * Extract line items
 */
function extractLineItems(text: string): ReceiptLineItem[] {
  const lineItems: ReceiptLineItem[] = [];
  const lines = text.split('\n');
  
  // Look for lines with item, quantity, price, total pattern
  const itemPattern = /^([A-Za-z][A-Za-z\s]+)\s+(\d+)\s+(\d+)\s+(\d+)$/;
  
  for (const line of lines) {
    const match = line.match(itemPattern);
    if (match) {
      lineItems.push({
        description: match[1].trim(),
        quantity: parseInt(match[2], 10),
        unitPrice: parseFloat(match[3]),
        totalPrice: parseFloat(match[4]),
      });
    }
  }
  
  return lineItems;
}

/**
 * Extract payment method
 */
function extractPaymentMethod(text: string): string | null {
  const patterns = [
    /payment method[:\s]+(\w+)/i,
    /paid by[:\s]+(\w+)/i,
    /cash|card|credit|debit|m-pesa|mpesa/i,
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
 * Extract card last 4
 */
function extractCardLast4(text: string): string | null {
  const pattern = /\*\*\*\*\s*(\d{4})/;
  const match = text.match(pattern);
  return match ? match[1] : null;
}

/**
 * Calculate confidence
 */
function calculateConfidence(extractedCount: number, _missingCount: number): number {
  const totalFields = 9; // Approximate total number of important fields
  return Math.max(0, Math.min(1, extractedCount / totalFields));
}

/**
 * Validate receipt data
 */
function validateReceiptData(data: ReceiptData): string[] {
  const errors: string[] = [];
  
  if (!data.merchantName || data.merchantName === 'Unknown Merchant') {
    errors.push('Merchant name is required');
  }
  
  if (!data.date || isNaN(data.date.getTime())) {
    errors.push('Valid date is required');
  }
  
  if (data.totalAmount <= 0) {
    errors.push('Total amount must be greater than 0');
  }
  
  if (data.lineItems.length === 0) {
    errors.push('At least one line item is required');
  }
  
  // Verify line items total matches receipt total
  const lineItemsTotal = data.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  if (Math.abs(lineItemsTotal - data.totalAmount) > data.totalAmount * 0.1) {
    errors.push('Line items total does not match receipt total');
  }
  
  return errors;
}

/**
 * Format receipt data for display
 */
export function formatReceiptData(data: ReceiptData): string {
  return `
Receipt Data:
=============
Merchant: ${data.merchantName}
Address: ${data.merchantAddress || 'N/A'}
Phone: ${data.merchantPhone || 'N/A'}
Date: ${data.date.toDateString()}
Total: KES ${data.totalAmount.toLocaleString()}
Tax: ${data.taxAmount ? `KES ${data.taxAmount.toLocaleString()}` : 'N/A'}
Subtotal: ${data.subtotal ? `KES ${data.subtotal.toLocaleString()}` : 'N/A'}
Payment Method: ${data.paymentMethod || 'N/A'}
Card: ${data.cardLast4 ? `**** ${data.cardLast4}` : 'N/A'}
Confidence: ${(data.confidence * 100).toFixed(0)}%

Line Items:
${data.lineItems.map(item => 
  `- ${item.description} x${item.quantity}: KES ${item.totalPrice.toLocaleString()}`
).join('\n')}
  `.trim();
}

/**
 * Batch process receipts
 */
export async function batchProcessReceipts(images: ArrayBuffer[]): Promise<ParsedReceiptResult[]> {
  const results: ParsedReceiptResult[] = [];
  
  for (const image of images) {
    const result = await processReceiptImage(image);
    results.push(result);
  }
  
  return results;
}

/**
 * Get processing statistics
 */
export function getProcessingStatistics(results: ParsedReceiptResult[]): {
  totalReceipts: number;
  successfulProcessing: number;
  failedProcessing: number;
  averageConfidence: number;
  commonErrors: Record<string, number>;
} {
  const successfulProcessing = results.filter(r => r.success).length;
  const failedProcessing = results.filter(r => !r.success).length;
  
  const successfulResults = results.filter(r => r.success && r.data);
  const averageConfidence = successfulResults.length > 0
    ? successfulResults.reduce((sum, r) => sum + (r.data?.confidence || 0), 0) / successfulResults.length
    : 0;
  
  const commonErrors: Record<string, number> = {};
  
  for (const result of results) {
    for (const error of result.errors) {
      commonErrors[error] = (commonErrors[error] || 0) + 1;
    }
  }
  
  return {
    totalReceipts: results.length,
    successfulProcessing,
    failedProcessing,
    averageConfidence,
    commonErrors,
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
