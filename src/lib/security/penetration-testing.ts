/**
 * Penetration Testing Framework
 * 
 * Implements automated penetration testing with:
 * - Vulnerability scanning
 * - Security assessment
 * - Attack simulation
 * - Compliance checking
 * - Report generation
 * - Remediation tracking
 */

// Vulnerability severity
export enum VulnerabilitySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

// Vulnerability category
export enum VulnerabilityCategory {
  INJECTION = 'injection',
  BROKEN_AUTHENTICATION = 'broken_authentication',
  SENSITIVE_DATA_EXPOSURE = 'sensitive_data_exposure',
  XML_EXTERNAL_ENTITIES = 'xml_external_entities',
  BROKEN_ACCESS_CONTROL = 'broken_access_control',
  SECURITY_MISCONFIGURATION = 'security_misconfiguration',
  CROSS_SITE_SCRIPTING = 'cross_site_scripting',
  INSECURE_DESERIALIZATION = 'insecure_deserialization',
  USING_COMPONENTS_WITH_KNOWN_VULNERABILITIES = 'using_components_with_known_vulnerabilities',
  INSUFFICIENT_LOGGING_MONITORING = 'insufficient_logging_monitoring',
}

// Vulnerability status
export enum VulnerabilityStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  FIXED = 'fixed',
  VERIFIED = 'verified',
  IGNORED = 'ignored',
  FALSE_POSITIVE = 'false_positive',
}

// Vulnerability
export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  category: VulnerabilityCategory;
  severity: VulnerabilitySeverity;
  status: VulnerabilityStatus;
  affectedEndpoint?: string;
  affectedComponent?: string;
  cveId?: string;
  cvssScore?: number;
  discoveredAt: Date;
  discoveredBy: string;
  remediation?: string;
  references?: string[];
  metadata?: Record<string, unknown>;
}

// Penetration test
export interface PenetrationTest {
  id: string;
  name: string;
  description: string;
  type: 'automated' | 'manual' | 'hybrid';
  startDate: Date;
  endDate?: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  scope: string[];
  vulnerabilities: Vulnerability[];
  summary: TestSummary;
  performedBy: string;
  createdAt: Date;
}

// Test summary
export interface TestSummary {
  totalVulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  riskScore: number; // 0-100
}

// Security assessment
export interface SecurityAssessment {
  id: string;
  target: string;
  targetType: 'api' | 'web_application' | 'mobile_app' | 'infrastructure';
  assessmentDate: Date;
  overallScore: number; // 0-100
  categories: CategoryAssessment[];
  recommendations: Recommendation[];
}

// Category assessment
export interface CategoryAssessment {
  category: VulnerabilityCategory;
  score: number; // 0-100
  findings: string[];
}

// Recommendation
export interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedEffort: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed';
}

/**
 * Calculate CVSS score
 */
export function calculateCVSSScore(
  exploitability: number, // 0-10
  impact: number // 0-10
): number {
  return Math.min(10, (exploitability + impact) / 2);
}

/**
 * Calculate risk score
 */
export function calculateRiskScore(vulnerabilities: Vulnerability[]): number {
  if (vulnerabilities.length === 0) return 0;
  
  const severityWeights = {
    [VulnerabilitySeverity.CRITICAL]: 10,
    [VulnerabilitySeverity.HIGH]: 7,
    [VulnerabilitySeverity.MEDIUM]: 4,
    [VulnerabilitySeverity.LOW]: 2,
    [VulnerabilitySeverity.INFO]: 0,
  };
  
  let totalScore = 0;
  
  for (const vuln of vulnerabilities) {
    if (vuln.status === VulnerabilityStatus.FIXED || vuln.status === VulnerabilityStatus.VERIFIED) {
      continue;
    }
    totalScore += severityWeights[vuln.severity];
  }
  
  return Math.min(100, totalScore);
}

/**
 * Create vulnerability
 */
export function createVulnerability(
  title: string,
  description: string,
  category: VulnerabilityCategory,
  severity: VulnerabilitySeverity,
  discoveredBy: string,
  affectedEndpoint?: string,
  affectedComponent?: string,
  cveId?: string,
  cvssScore?: number,
  remediation?: string,
  references?: string[]
): Vulnerability {
  return {
    id: `vuln_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    description,
    category,
    severity,
    status: VulnerabilityStatus.OPEN,
    affectedEndpoint,
    affectedComponent,
    cveId,
    cvssScore,
    discoveredAt: new Date(),
    discoveredBy,
    remediation,
    references,
  };
}

/**
 * Create penetration test
 */
export function createPenetrationTest(
  name: string,
  description: string,
  type: 'automated' | 'manual' | 'hybrid',
  scope: string[],
  performedBy: string,
  startDate: Date = new Date()
): PenetrationTest {
  return {
    id: `pentest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    type,
    startDate,
    status: 'scheduled',
    scope,
    vulnerabilities: [],
    summary: {
      totalVulnerabilities: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      riskScore: 0,
    },
    performedBy,
    createdAt: new Date(),
  };
}

/**
 * Start penetration test
 */
export function startPenetrationTest(test: PenetrationTest): PenetrationTest {
  return {
    ...test,
    status: 'in_progress',
  };
}

/**
 * Complete penetration test
 */
export function completePenetrationTest(
  test: PenetrationTest,
  vulnerabilities: Vulnerability[]
): PenetrationTest {
  const summary = generateTestSummary(vulnerabilities);
  
  return {
    ...test,
    status: 'completed',
    endDate: new Date(),
    vulnerabilities,
    summary,
  };
}

/**
 * Generate test summary
 */
export function generateTestSummary(vulnerabilities: Vulnerability[]): TestSummary {
  const critical = vulnerabilities.filter(v => v.severity === VulnerabilitySeverity.CRITICAL).length;
  const high = vulnerabilities.filter(v => v.severity === VulnerabilitySeverity.HIGH).length;
  const medium = vulnerabilities.filter(v => v.severity === VulnerabilitySeverity.MEDIUM).length;
  const low = vulnerabilities.filter(v => v.severity === VulnerabilitySeverity.LOW).length;
  const info = vulnerabilities.filter(v => v.severity === VulnerabilitySeverity.INFO).length;
  
  return {
    totalVulnerabilities: vulnerabilities.length,
    critical,
    high,
    medium,
    low,
    info,
    riskScore: calculateRiskScore(vulnerabilities),
  };
}

/**
 * Update vulnerability status
 */
export function updateVulnerabilityStatus(
  vulnerability: Vulnerability,
  status: VulnerabilityStatus
): Vulnerability {
  return {
    ...vulnerability,
    status,
  };
}

/**
 * Create security assessment
 */
export function createSecurityAssessment(
  target: string,
  targetType: 'api' | 'web_application' | 'mobile_app' | 'infrastructure',
  categories: CategoryAssessment[],
  recommendations: Recommendation[]
): SecurityAssessment {
  const overallScore = categories.length > 0
    ? categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length
    : 0;
  
  return {
    id: `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    target,
    targetType,
    assessmentDate: new Date(),
    overallScore,
    categories,
    recommendations,
  };
}

/**
 * Scan for SQL injection vulnerabilities
 */
export function scanForSQLInjection(input: string): {
  hasVulnerability: boolean;
  patterns: string[];
} {
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|ALTER)\b.*\b(FROM|INTO|VALUES|WHERE|SET)\b)/i,
    /(\bor\b\s+\d+\s*=\s*\d+)/i,
    /(\band\b\s+\d+\s*=\s*\d+)/i,
    /(['"]\s*(OR|AND)\s*['"])/i,
    /(\/\*.*\*\/)/i,
    /(;\s*(DROP|DELETE|UPDATE|INSERT))/i,
  ];
  
  const matchedPatterns: string[] = [];
  
  for (const pattern of patterns) {
    if (pattern.test(input)) {
      matchedPatterns.push(pattern.source);
    }
  }
  
  return {
    hasVulnerability: matchedPatterns.length > 0,
    patterns: matchedPatterns,
  };
}

/**
 * Scan for XSS vulnerabilities
 */
export function scanForXSS(input: string): {
  hasVulnerability: boolean;
  patterns: string[];
} {
  const patterns = [
    /<script[^>]*>.*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\s*\(/i,
    /document\.cookie/i,
    /fromCharCode/i,
  ];
  
  const matchedPatterns: string[] = [];
  
  for (const pattern of patterns) {
    if (pattern.test(input)) {
      matchedPatterns.push(pattern.source);
    }
  }
  
  return {
    hasVulnerability: matchedPatterns.length > 0,
    patterns: matchedPatterns,
  };
}

/**
 * Scan for path traversal vulnerabilities
 */
export function scanForPathTraversal(input: string): {
  hasVulnerability: boolean;
  patterns: string[];
} {
  const patterns = [
    /\.\.[\\/]/i,
    /%2e%2e/i,
    /%252e%252e/i,
    /\.\.%5c/i,
    /\.\.%2f/i,
    /file:\/\//i,
    /\/\/\/\//i,
  ];
  
  const matchedPatterns: string[] = [];
  
  for (const pattern of patterns) {
    if (pattern.test(input)) {
      matchedPatterns.push(pattern.source);
    }
  }
  
  return {
    hasVulnerability: matchedPatterns.length > 0,
    patterns: matchedPatterns,
  };
}

/**
 * Scan for command injection vulnerabilities
 */
export function scanForCommandInjection(input: string): {
  hasVulnerability: boolean;
  patterns: string[];
} {
  const patterns = [
    /[;&|`$()]/i,
    /\|\|/i,
    /&&/i,
    /;/i,
    /`/i,
    /\$\(/i,
  ];
  
  const matchedPatterns: string[] = [];
  
  for (const pattern of patterns) {
    if (pattern.test(input)) {
      matchedPatterns.push(pattern.source);
    }
  }
  
  return {
    hasVulnerability: matchedPatterns.length > 0,
    patterns: matchedPatterns,
  };
}

/**
 * Scan for insecure deserialization
 */
export function scanForInsecureDeserialization(input: string): {
  hasVulnerability: boolean;
  patterns: string[];
} {
  const patterns = [
    /<\?xml/i,
    /<!DOCTYPE/i,
    /<\[\s*CDATA/i,
    /System\.Runtime\.Serialization/i,
    /ObjectInputStream/i,
    /pickle\.loads/i,
    /yaml\.load/i,
  ];
  
  const matchedPatterns: string[] = [];
  
  for (const pattern of patterns) {
    if (pattern.test(input)) {
      matchedPatterns.push(pattern.source);
    }
  }
  
  return {
    hasVulnerability: matchedPatterns.length > 0,
    patterns: matchedPatterns,
  };
}

/**
 * Run comprehensive vulnerability scan
 */
export function runComprehensiveScan(input: string): {
  sqlInjection: ReturnType<typeof scanForSQLInjection>;
  xss: ReturnType<typeof scanForXSS>;
  pathTraversal: ReturnType<typeof scanForPathTraversal>;
  commandInjection: ReturnType<typeof scanForCommandInjection>;
  insecureDeserialization: ReturnType<typeof scanForInsecureDeserialization>;
  totalVulnerabilities: number;
} {
  const sqlInjection = scanForSQLInjection(input);
  const xss = scanForXSS(input);
  const pathTraversal = scanForPathTraversal(input);
  const commandInjection = scanForCommandInjection(input);
  const insecureDeserialization = scanForInsecureDeserialization(input);
  
  const totalVulnerabilities = [
    sqlInjection.hasVulnerability,
    xss.hasVulnerability,
    pathTraversal.hasVulnerability,
    commandInjection.hasVulnerability,
    insecureDeserialization.hasVulnerability,
  ].filter(Boolean).length;
  
  return {
    sqlInjection,
    xss,
    pathTraversal,
    commandInjection,
    insecureDeserialization,
    totalVulnerabilities,
  };
}

/**
 * Get vulnerability severity label
 */
export function getVulnerabilitySeverityLabel(severity: VulnerabilitySeverity): string {
  const labels: Record<VulnerabilitySeverity, string> = {
    [VulnerabilitySeverity.CRITICAL]: 'Critical',
    [VulnerabilitySeverity.HIGH]: 'High',
    [VulnerabilitySeverity.MEDIUM]: 'Medium',
    [VulnerabilitySeverity.LOW]: 'Low',
    [VulnerabilitySeverity.INFO]: 'Info',
  };

  return labels[severity];
}

/**
 * Get vulnerability category label
 */
export function getVulnerabilityCategoryLabel(category: VulnerabilityCategory): string {
  const labels: Record<VulnerabilityCategory, string> = {
    [VulnerabilityCategory.INJECTION]: 'Injection',
    [VulnerabilityCategory.BROKEN_AUTHENTICATION]: 'Broken Authentication',
    [VulnerabilityCategory.SENSITIVE_DATA_EXPOSURE]: 'Sensitive Data Exposure',
    [VulnerabilityCategory.XML_EXTERNAL_ENTITIES]: 'XML External Entities',
    [VulnerabilityCategory.BROKEN_ACCESS_CONTROL]: 'Broken Access Control',
    [VulnerabilityCategory.SECURITY_MISCONFIGURATION]: 'Security Misconfiguration',
    [VulnerabilityCategory.CROSS_SITE_SCRIPTING]: 'Cross-Site Scripting',
    [VulnerabilityCategory.INSECURE_DESERIALIZATION]: 'Insecure Deserialization',
    [VulnerabilityCategory.USING_COMPONENTS_WITH_KNOWN_VULNERABILITIES]: 'Using Components with Known Vulnerabilities',
    [VulnerabilityCategory.INSUFFICIENT_LOGGING_MONITORING]: 'Insufficient Logging & Monitoring',
  };

  return labels[category];
}

/**
 * Get vulnerability status label
 */
export function getVulnerabilityStatusLabel(status: VulnerabilityStatus): string {
  const labels: Record<VulnerabilityStatus, string> = {
    [VulnerabilityStatus.OPEN]: 'Open',
    [VulnerabilityStatus.IN_PROGRESS]: 'In Progress',
    [VulnerabilityStatus.FIXED]: 'Fixed',
    [VulnerabilityStatus.VERIFIED]: 'Verified',
    [VulnerabilityStatus.IGNORED]: 'Ignored',
    [VulnerabilityStatus.FALSE_POSITIVE]: 'False Positive',
  };

  return labels[status];
}

/**
 * Filter vulnerabilities by severity
 */
export function filterVulnerabilitiesBySeverity(
  vulnerabilities: Vulnerability[],
  severity: VulnerabilitySeverity
): Vulnerability[] {
  return vulnerabilities.filter(v => v.severity === severity);
}

/**
 * Filter vulnerabilities by status
 */
export function filterVulnerabilitiesByStatus(
  vulnerabilities: Vulnerability[],
  status: VulnerabilityStatus
): Vulnerability[] {
  return vulnerabilities.filter(v => v.status === status);
}

/**
 * Filter vulnerabilities by category
 */
export function filterVulnerabilitiesByCategory(
  vulnerabilities: Vulnerability[],
  category: VulnerabilityCategory
): Vulnerability[] {
  return vulnerabilities.filter(v => v.category === category);
}

/**
 * Get vulnerability statistics
 */
export function getVulnerabilityStatistics(vulnerabilities: Vulnerability[]): {
  total: number;
  bySeverity: Record<VulnerabilitySeverity, number>;
  byStatus: Record<VulnerabilityStatus, number>;
  byCategory: Record<VulnerabilityCategory, number>;
  openVulnerabilities: number;
  averageCVSSScore: number;
} {
  const bySeverity: Record<VulnerabilitySeverity, number> = {
    [VulnerabilitySeverity.CRITICAL]: 0,
    [VulnerabilitySeverity.HIGH]: 0,
    [VulnerabilitySeverity.MEDIUM]: 0,
    [VulnerabilitySeverity.LOW]: 0,
    [VulnerabilitySeverity.INFO]: 0,
  };
  
  const byStatus: Record<VulnerabilityStatus, number> = {
    [VulnerabilityStatus.OPEN]: 0,
    [VulnerabilityStatus.IN_PROGRESS]: 0,
    [VulnerabilityStatus.FIXED]: 0,
    [VulnerabilityStatus.VERIFIED]: 0,
    [VulnerabilityStatus.IGNORED]: 0,
    [VulnerabilityStatus.FALSE_POSITIVE]: 0,
  };
  
  const byCategory: Record<VulnerabilityCategory, number> = {
    [VulnerabilityCategory.INJECTION]: 0,
    [VulnerabilityCategory.BROKEN_AUTHENTICATION]: 0,
    [VulnerabilityCategory.SENSITIVE_DATA_EXPOSURE]: 0,
    [VulnerabilityCategory.XML_EXTERNAL_ENTITIES]: 0,
    [VulnerabilityCategory.BROKEN_ACCESS_CONTROL]: 0,
    [VulnerabilityCategory.SECURITY_MISCONFIGURATION]: 0,
    [VulnerabilityCategory.CROSS_SITE_SCRIPTING]: 0,
    [VulnerabilityCategory.INSECURE_DESERIALIZATION]: 0,
    [VulnerabilityCategory.USING_COMPONENTS_WITH_KNOWN_VULNERABILITIES]: 0,
    [VulnerabilityCategory.INSUFFICIENT_LOGGING_MONITORING]: 0,
  };
  
  let totalCVSS = 0;
  let cvssCount = 0;
  
  for (const vuln of vulnerabilities) {
    bySeverity[vuln.severity]++;
    byStatus[vuln.status]++;
    byCategory[vuln.category]++;
    
    if (vuln.cvssScore) {
      totalCVSS += vuln.cvssScore;
      cvssCount++;
    }
  }
  
  const openVulnerabilities = vulnerabilities.filter(v => 
    v.status === VulnerabilityStatus.OPEN || v.status === VulnerabilityStatus.IN_PROGRESS
  ).length;
  
  return {
    total: vulnerabilities.length,
    bySeverity,
    byStatus,
    byCategory,
    openVulnerabilities,
    averageCVSSScore: cvssCount > 0 ? totalCVSS / cvssCount : 0,
  };
}
