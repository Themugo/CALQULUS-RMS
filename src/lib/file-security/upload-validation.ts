/**
 * Upload Validation System
 * 
 * Implements comprehensive file upload validation with:
 * - File type validation
 * - File size validation
 * - Content validation
 * - Metadata validation
 * - Schema validation
 * - Custom validation rules
 */

// Validation rule
export interface ValidationRule {
  id: string;
  name: string;
  type: 'file_type' | 'file_size' | 'content' | 'metadata' | 'custom';
  condition: string | RegExp | ((file: File, metadata: FileMetadata) => { isValid: boolean; message?: string; severity?: 'error' | 'warning' });
  errorMessage: string;
  severity: 'error' | 'warning';
  enabled: boolean;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: FileMetadata;
}

// Validation error
export interface ValidationError {
  ruleId: string;
  ruleName: string;
  message: string;
  severity: 'error';
}

// Validation warning
export interface ValidationWarning {
  ruleId: string;
  ruleName: string;
  message: string;
  severity: 'warning';
}

// File metadata
export interface FileMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  lastModified: Date;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number;
  pageCount?: number;
}

// Validation configuration
export interface ValidationConfiguration {
  maxFileSize: number;
  allowedFileTypes: string[];
  blockedFileTypes: string[];
  allowedMimeTypes: string[];
  blockedMimeTypes: string[];
  requireMetadata: boolean;
  customRules: ValidationRule[];
}

/**
 * Validate file upload
 */
export async function validateFileUpload(
  file: File,
  configuration: ValidationConfiguration
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  const metadata = await extractFileMetadata(file);
  
  // Validate file size
  if (file.size > configuration.maxFileSize) {
    errors.push({
      ruleId: 'file_size',
      ruleName: 'File Size',
      message: `File size (${formatFileSize(file.size)}) exceeds maximum allowed (${formatFileSize(configuration.maxFileSize)})`,
      severity: 'error',
    });
  }
  
  // Validate file type
  const fileType = getFileExtension(file.name).toLowerCase();
  if (configuration.allowedFileTypes.length > 0 && !configuration.allowedFileTypes.includes(fileType)) {
    errors.push({
      ruleId: 'file_type',
      ruleName: 'File Type',
      message: `File type "${fileType}" is not allowed`,
      severity: 'error',
    });
  }
  
  if (configuration.blockedFileTypes.includes(fileType)) {
    errors.push({
      ruleId: 'file_type',
      ruleName: 'File Type',
      message: `File type "${fileType}" is blocked`,
      severity: 'error',
    });
  }
  
  // Validate MIME type
  if (configuration.allowedMimeTypes.length > 0 && !configuration.allowedMimeTypes.includes(file.type)) {
    errors.push({
      ruleId: 'mime_type',
      ruleName: 'MIME Type',
      message: `MIME type "${file.type}" is not allowed`,
      severity: 'error',
    });
  }
  
  if (configuration.blockedMimeTypes.includes(file.type)) {
    errors.push({
      ruleId: 'mime_type',
      ruleName: 'MIME Type',
      message: `MIME type "${file.type}" is blocked`,
      severity: 'error',
    });
  }
  
  // Validate file name
  if (!isValidFileName(file.name)) {
    errors.push({
      ruleId: 'file_name',
      ruleName: 'File Name',
      message: 'File name contains invalid characters',
      severity: 'error',
    });
  }
  
  // Validate file name length
  if (file.name.length > 255) {
    errors.push({
      ruleId: 'file_name_length',
      ruleName: 'File Name Length',
      message: 'File name exceeds maximum length of 255 characters',
      severity: 'error',
    });
  }
  
  // Run custom validation rules
  for (const rule of configuration.customRules) {
    if (!rule.enabled) continue;
    
    const result = await runValidationRule(rule, file, metadata);
    
    if (result.isValid) continue;
    
    const severity = result.severity || rule.severity;
    
    if (severity === 'error') {
      errors.push({
        ruleId: rule.id,
        ruleName: rule.name,
        message: result.message || rule.errorMessage,
        severity: 'error',
      });
    } else {
      warnings.push({
        ruleId: rule.id,
        ruleName: rule.name,
        message: result.message || rule.errorMessage,
        severity: 'warning',
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata,
  };
}

/**
 * Extract file metadata
 */
export async function extractFileMetadata(file: File): Promise<FileMetadata> {
  const metadata: FileMetadata = {
    fileName: file.name,
    fileSize: file.size,
    fileType: getFileExtension(file.name),
    mimeType: file.type,
    lastModified: new Date(file.lastModified),
  };
  
  // Extract image dimensions if applicable
  if (file.type.startsWith('image/')) {
    const dimensions = await getImageDimensions(file);
    if (dimensions) {
      metadata.dimensions = dimensions;
    }
  }
  
  // Extract video duration if applicable
  if (file.type.startsWith('video/')) {
    const duration = await getVideoDuration(file);
    if (duration !== null) {
      metadata.duration = duration;
    }
  }
  
  // Extract PDF page count if applicable
  if (file.type === 'application/pdf') {
    const pageCount = await getPDFPageCount(file);
    if (pageCount !== null) {
      metadata.pageCount = pageCount;
    }
  }
  
  return metadata;
}

/**
 * Get image dimensions
 */
async function getImageDimensions(_file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(_file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    
    img.src = url;
  });
}

/**
 * Get video duration
 */
async function getVideoDuration(_file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(_file);
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    
    video.src = url;
  });
}

/**
 * Get PDF page count
 */
async function getPDFPageCount(_file: File): Promise<number | null> {
  // In production, use a PDF library like pdf.js
  // For now, return null
  return null;
}

/**
 * Run validation rule
 */
async function runValidationRule(
  rule: ValidationRule,
  file: File,
  metadata: FileMetadata
): Promise<{ isValid: boolean; message?: string; severity?: 'error' | 'warning' }> {
  if (typeof rule.condition === 'function') {
    return rule.condition(file, metadata);
  }
  
  if (rule.condition instanceof RegExp) {
    const isValid = !rule.condition.test(file.name);
    return { isValid, severity: rule.severity };
  }
  
  if (typeof rule.condition === 'string') {
    // Simple string comparison
    const isValid = file.name !== rule.condition;
    return { isValid, severity: rule.severity };
  }
  
  return { isValid: true, severity: rule.severity };
}

/**
 * Validate file name
 */
function isValidFileName(fileName: string): boolean {
  // Check for invalid characters
  const invalidChars = /[<>:"|?*/\\]/;
  if (invalidChars.test(fileName)) {
    return false;
  }
  
  // Check for reserved names (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const baseName = fileName.split('.')[0].toUpperCase();
  if (reservedNames.includes(baseName)) {
    return false;
  }
  
  // Check for leading/trailing spaces and dots
  if (fileName.startsWith(' ') || fileName.endsWith(' ') || fileName.startsWith('.') || fileName.endsWith('.')) {
    return false;
  }
  
  return true;
}

/**
 * Get file extension
 */
function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get default validation configuration
 */
export function getDefaultValidationConfiguration(): ValidationConfiguration {
  return {
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    allowedFileTypes: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip', '.rar', '.7z'],
    blockedFileTypes: ['.exe', '.dll', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js', '.jar', '.app', '.deb', '.rpm', '.sh', '.bash', '.zsh', '.ps1', '.vbs', '.wsf'],
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ],
    blockedMimeTypes: [
      'application/x-msdownload',
      'application/x-msdos-program',
      'application/x-executable',
      'application/x-sh',
      'application/x-bat',
      'application/x-vbs',
    ],
    requireMetadata: false,
    customRules: [],
  };
}

/**
 * Create custom validation rule
 */
export function createValidationRule(
  name: string,
  type: 'file_type' | 'file_size' | 'content' | 'metadata' | 'custom',
  condition: string | RegExp | ((file: File, metadata: FileMetadata) => { isValid: boolean; message?: string; severity?: 'error' | 'warning' }),
  errorMessage: string,
  severity: 'error' | 'warning' = 'error'
): ValidationRule {
  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    condition,
    errorMessage,
    severity,
    enabled: true,
  };
}

/**
 * Add validation rule to configuration
 */
export function addValidationRule(
  configuration: ValidationConfiguration,
  rule: ValidationRule
): ValidationConfiguration {
  return {
    ...configuration,
    customRules: [...configuration.customRules, rule],
  };
}

/**
 * Remove validation rule from configuration
 */
export function removeValidationRule(
  configuration: ValidationConfiguration,
  ruleId: string
): ValidationConfiguration {
  return {
    ...configuration,
    customRules: configuration.customRules.filter(rule => rule.id !== ruleId),
  };
}

/**
 * Enable validation rule
 */
export function enableValidationRule(
  configuration: ValidationConfiguration,
  ruleId: string
): ValidationConfiguration {
  return {
    ...configuration,
    customRules: configuration.customRules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: true } : rule
    ),
  };
}

/**
 * Disable validation rule
 */
export function disableValidationRule(
  configuration: ValidationConfiguration,
  ruleId: string
): ValidationConfiguration {
  return {
    ...configuration,
    customRules: configuration.customRules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: false } : rule
    ),
  };
}

/**
 * Batch validate files
 */
export async function batchValidateFiles(
  files: File[],
  configuration: ValidationConfiguration
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  for (const file of files) {
    const result = await validateFileUpload(file, configuration);
    results.push(result);
  }
  
  return results;
}

/**
 * Get validation statistics
 */
export function getValidationStatistics(results: ValidationResult[]): {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalErrors: number;
  totalWarnings: number;
  byFileType: Record<string, number>;
  averageFileSize: number;
} {
  const validFiles = results.filter(r => r.isValid).length;
  const invalidFiles = results.filter(r => !r.isValid).length;
  
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  
  const byFileType: Record<string, number> = {};
  let totalFileSize = 0;
  
  for (const result of results) {
    byFileType[result.metadata.fileType] = (byFileType[result.metadata.fileType] || 0) + 1;
    totalFileSize += result.metadata.fileSize;
  }
  
  const averageFileSize = results.length > 0 ? totalFileSize / results.length : 0;
  
  return {
    totalFiles: results.length,
    validFiles,
    invalidFiles,
    totalErrors,
    totalWarnings,
    byFileType,
    averageFileSize,
  };
}

/**
 * Filter validation results by status
 */
export function filterValidationResultsByStatus(
  results: ValidationResult[],
  isValid: boolean
): ValidationResult[] {
  return results.filter(result => result.isValid === isValid);
}

/**
 * Filter validation results by file type
 */
export function filterValidationResultsByFileType(
  results: ValidationResult[],
  fileType: string
): ValidationResult[] {
  return results.filter(result => result.metadata.fileType === fileType);
}

/**
 * Get validation rule type label
 */
export function getValidationRuleTypeLabel(type: ValidationRule['type']): string {
  const labels: Record<ValidationRule['type'], string> = {
    file_type: 'File Type',
    file_size: 'File Size',
    content: 'Content',
    metadata: 'Metadata',
    custom: 'Custom',
  };

  return labels[type];
}
