/**
 * AI Maintenance Classification
 * 
 * Implements AI-powered maintenance request classification with:
 * - Automatic category classification
 * - Priority scoring
 * - Urgency prediction
 * - Contractor recommendation
 * - Cost estimation
 * - SLA assignment
 */

// Maintenance category
export enum MaintenanceCategory {
  PLUMBING = 'plumbing',
  ELECTRICAL = 'electrical',
  HVAC = 'hvac',
  STRUCTURAL = 'structural',
  APPLIANCE = 'appliance',
  PEST_CONTROL = 'pest_control',
  CLEANING = 'cleaning',
  SECURITY = 'security',
  LANDSCAPING = 'landscaping',
  OTHER = 'other',
}

// Priority level
export enum MaintenancePriority {
  EMERGENCY = 'emergency',
  URGENT = 'urgent',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// Urgency level
export enum UrgencyLevel {
  IMMEDIATE = 'immediate',
  SAME_DAY = 'same_day',
  NEXT_DAY = 'next_day',
  WEEK = 'week',
  MONTH = 'month',
}

// Maintenance request
export interface MaintenanceRequest {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  urgency: UrgencyLevel;
  estimatedCost?: number;
  recommendedContractor?: string;
  slaHours?: number;
  keywords: string[];
  sentiment: 'negative' | 'neutral' | 'positive';
  createdAt: Date;
}

// Classification result
export interface ClassificationResult {
  category: MaintenanceCategory;
  confidence: number; // 0-1
  priority: MaintenancePriority;
  urgency: UrgencyLevel;
  estimatedCost: {
    min: number;
    max: number;
    average: number;
  };
  recommendedContractors: string[];
  slaHours: number;
  keywords: string[];
}

/**
 * Classify maintenance request
 */
export function classifyMaintenanceRequest(
  description: string,
  propertyId: string,
  unitId: string,
  tenantId: string
): MaintenanceRequest {
  const classification = classifyDescription(description);
  const priority = determinePriority(classification);
  const urgency = determineUrgency(classification);
  const recommendedContractor = recommendContractor(classification);
  const slaHours = calculateSLA(classification);
  const keywords = extractKeywords(description);
  const sentiment = analyzeSentiment(description);
  
  return {
    id: `maintenance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    propertyId,
    unitId,
    description,
    category: classification.category,
    priority,
    urgency,
    estimatedCost: classification.estimatedCost.average,
    recommendedContractor: recommendedContractor[0],
    slaHours,
    keywords,
    sentiment,
    createdAt: new Date(),
  };
}

/**
 * Classify description
 */
function classifyDescription(description: string): ClassificationResult {
  const lowerDescription = description.toLowerCase();
  
  // Category classification
  const category = classifyCategory(lowerDescription);
  const confidence = calculateConfidence(lowerDescription, category);
  
  // Priority classification
  const priority = classifyPriority(lowerDescription);
  
  // Urgency classification
  const urgency = classifyUrgency(lowerDescription);
  
  // Cost estimation
  const estimatedCost = estimateCostByCategory(category);
  
  // Contractor recommendation
  const recommendedContractors = getContractorsByCategory(category);
  
  // SLA calculation
  const slaHours = getSLAByCategory(category, priority);
  
  // Keyword extraction
  const keywords = extractKeywords(description);
  
  return {
    category,
    confidence,
    priority,
    urgency,
    estimatedCost,
    recommendedContractors,
    slaHours,
    keywords,
  };
}

/**
 * Classify category
 */
function classifyCategory(description: string): MaintenanceCategory {
  const plumbingKeywords = ['water', 'leak', 'pipe', 'drain', 'toilet', 'sink', 'faucet', 'shower', 'plumbing'];
  const electricalKeywords = ['electric', 'power', 'outlet', 'switch', 'light', 'wire', 'circuit', 'breaker'];
  const hvacKeywords = ['air', 'heat', 'cooling', 'heating', 'ac', 'furnace', 'thermostat', 'ventilation'];
  const structuralKeywords = ['wall', 'ceiling', 'floor', 'roof', 'foundation', 'crack', 'door', 'window'];
  const applianceKeywords = ['refrigerator', 'stove', 'oven', 'dishwasher', 'washer', 'dryer', 'appliance'];
  const pestKeywords = ['pest', 'bug', 'insect', 'rodent', 'mouse', 'rat', 'cockroach', 'ant'];
  const cleaningKeywords = ['clean', 'dirty', 'mess', 'stain', 'spill', 'trash'];
  const securityKeywords = ['lock', 'key', 'security', 'alarm', 'camera', 'safe'];
  const landscapingKeywords = ['lawn', 'garden', 'tree', 'grass', 'landscape', 'outdoor'];
  
  const keywordSets: Record<MaintenanceCategory, string[]> = {
    [MaintenanceCategory.PLUMBING]: plumbingKeywords,
    [MaintenanceCategory.ELECTRICAL]: electricalKeywords,
    [MaintenanceCategory.HVAC]: hvacKeywords,
    [MaintenanceCategory.STRUCTURAL]: structuralKeywords,
    [MaintenanceCategory.APPLIANCE]: applianceKeywords,
    [MaintenanceCategory.PEST_CONTROL]: pestKeywords,
    [MaintenanceCategory.CLEANING]: cleaningKeywords,
    [MaintenanceCategory.SECURITY]: securityKeywords,
    [MaintenanceCategory.LANDSCAPING]: landscapingKeywords,
    [MaintenanceCategory.OTHER]: [],
  };
  
  let maxMatches = 0;
  let bestCategory = MaintenanceCategory.OTHER;
  
  for (const [category, keywords] of Object.entries(keywordSets)) {
    const matches = keywords.filter(keyword => description.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestCategory = category as MaintenanceCategory;
    }
  }
  
  return bestCategory;
}

/**
 * Calculate confidence
 */
function calculateConfidence(description: string, category: MaintenanceCategory): number {
  const keywordSets: Record<MaintenanceCategory, string[]> = {
    [MaintenanceCategory.PLUMBING]: ['water', 'leak', 'pipe', 'drain', 'toilet', 'sink', 'faucet', 'shower', 'plumbing'],
    [MaintenanceCategory.ELECTRICAL]: ['electric', 'power', 'outlet', 'switch', 'light', 'wire', 'circuit', 'breaker'],
    [MaintenanceCategory.HVAC]: ['air', 'heat', 'cooling', 'heating', 'ac', 'furnace', 'thermostat', 'ventilation'],
    [MaintenanceCategory.STRUCTURAL]: ['wall', 'ceiling', 'floor', 'roof', 'foundation', 'crack', 'door', 'window'],
    [MaintenanceCategory.APPLIANCE]: ['refrigerator', 'stove', 'oven', 'dishwasher', 'washer', 'dryer', 'appliance'],
    [MaintenanceCategory.PEST_CONTROL]: ['pest', 'bug', 'insect', 'rodent', 'mouse', 'rat', 'cockroach', 'ant'],
    [MaintenanceCategory.CLEANING]: ['clean', 'dirty', 'mess', 'stain', 'spill', 'trash'],
    [MaintenanceCategory.SECURITY]: ['lock', 'key', 'security', 'alarm', 'camera', 'safe'],
    [MaintenanceCategory.LANDSCAPING]: ['lawn', 'garden', 'tree', 'grass', 'landscape', 'outdoor'],
    [MaintenanceCategory.OTHER]: [],
  };
  
  const keywords = keywordSets[category];
  const matches = keywords.filter(keyword => description.includes(keyword)).length;
  
  return Math.min(1, matches / 3);
}

/**
 * Classify priority
 */
function classifyPriority(description: string): MaintenancePriority {
  const emergencyKeywords = ['emergency', 'flood', 'fire', 'gas', 'danger', 'immediate', 'critical', 'safety'];
  const urgentKeywords = ['urgent', 'asap', 'broken', 'not working', 'major', 'severe'];
  const highKeywords = ['important', 'need', 'problem', 'issue'];
  const lowKeywords = ['minor', 'small', 'later', 'when convenient'];
  
  if (emergencyKeywords.some(keyword => description.includes(keyword))) {
    return MaintenancePriority.EMERGENCY;
  }
  
  if (urgentKeywords.some(keyword => description.includes(keyword))) {
    return MaintenancePriority.URGENT;
  }
  
  if (highKeywords.some(keyword => description.includes(keyword))) {
    return MaintenancePriority.HIGH;
  }
  
  if (lowKeywords.some(keyword => description.includes(keyword))) {
    return MaintenancePriority.LOW;
  }
  
  return MaintenancePriority.MEDIUM;
}

/**
 * Classify urgency
 */
function classifyUrgency(description: string): UrgencyLevel {
  const immediateKeywords = ['emergency', 'immediate', 'now', 'asap', 'urgent'];
  const sameDayKeywords = ['today', 'same day'];
  const nextDayKeywords = ['tomorrow', 'next day'];
  const weekKeywords = ['week', 'this week'];
  const monthKeywords = ['month', 'later', 'when convenient'];
  
  if (immediateKeywords.some(keyword => description.includes(keyword))) {
    return UrgencyLevel.IMMEDIATE;
  }
  
  if (sameDayKeywords.some(keyword => description.includes(keyword))) {
    return UrgencyLevel.SAME_DAY;
  }
  
  if (nextDayKeywords.some(keyword => description.includes(keyword))) {
    return UrgencyLevel.NEXT_DAY;
  }
  
  if (weekKeywords.some(keyword => description.includes(keyword))) {
    return UrgencyLevel.WEEK;
  }
  
  if (monthKeywords.some(keyword => description.includes(keyword))) {
    return UrgencyLevel.MONTH;
  }
  
  return UrgencyLevel.NEXT_DAY;
}

/**
 * Estimate cost by category
 */
function estimateCostByCategory(category: MaintenanceCategory): {
  min: number;
  max: number;
  average: number;
} {
  const costRanges: Record<MaintenanceCategory, { min: number; max: number; average: number }> = {
    [MaintenanceCategory.PLUMBING]: { min: 500, max: 5000, average: 2000 },
    [MaintenanceCategory.ELECTRICAL]: { min: 300, max: 4000, average: 1500 },
    [MaintenanceCategory.HVAC]: { min: 1000, max: 8000, average: 3500 },
    [MaintenanceCategory.STRUCTURAL]: { min: 2000, max: 15000, average: 6000 },
    [MaintenanceCategory.APPLIANCE]: { min: 200, max: 2000, average: 800 },
    [MaintenanceCategory.PEST_CONTROL]: { min: 150, max: 800, average: 400 },
    [MaintenanceCategory.CLEANING]: { min: 100, max: 500, average: 250 },
    [MaintenanceCategory.SECURITY]: { min: 300, max: 2000, average: 800 },
    [MaintenanceCategory.LANDSCAPING]: { min: 200, max: 3000, average: 1000 },
    [MaintenanceCategory.OTHER]: { min: 100, max: 2000, average: 500 },
  };
  
  return costRanges[category];
}

/**
 * Get contractors by category
 */
function getContractorsByCategory(category: MaintenanceCategory): string[] {
  const contractors: Record<MaintenanceCategory, string[]> = {
    [MaintenanceCategory.PLUMBING]: ['PlumbingPro', 'QuickFix Plumbing', 'Emergency Plumbers'],
    [MaintenanceCategory.ELECTRICAL]: ['ElectricMaster', 'PowerPro Electric', 'SafeWiring'],
    [MaintenanceCategory.HVAC]: ['ClimateControl', 'AirComfort HVAC', 'HeatingCooling Pros'],
    [MaintenanceCategory.STRUCTURAL]: ['BuildRight Construction', 'StructuralFix', 'FoundationRepair Co'],
    [MaintenanceCategory.APPLIANCE]: ['ApplianceRepair Pro', 'FixIt Appliances', 'QuickAppliance'],
    [MaintenanceCategory.PEST_CONTROL]: ['PestAway', 'BugBusters', 'EcoPest Control'],
    [MaintenanceCategory.CLEANING]: ['CleanTeam', 'SparkleClean', 'ProClean Services'],
    [MaintenanceCategory.SECURITY]: ['SecureLock', 'AlarmPro', 'SecurityFirst'],
    [MaintenanceCategory.LANDSCAPING]: ['GreenThumb', 'LawnCare Pro', 'LandscapeMasters'],
    [MaintenanceCategory.OTHER]: ['GeneralMaintenance', 'FixAll Services', 'PropertyCare'],
  };
  
  return contractors[category];
}

/**
 * Get SLA by category
 */
function getSLAByCategory(category: MaintenanceCategory, priority: MaintenancePriority): number {
  const baseSLA: Record<MaintenanceCategory, number> = {
    [MaintenanceCategory.PLUMBING]: 24,
    [MaintenanceCategory.ELECTRICAL]: 12,
    [MaintenanceCategory.HVAC]: 48,
    [MaintenanceCategory.STRUCTURAL]: 72,
    [MaintenanceCategory.APPLIANCE]: 72,
    [MaintenanceCategory.PEST_CONTROL]: 48,
    [MaintenanceCategory.CLEANING]: 48,
    [MaintenanceCategory.SECURITY]: 12,
    [MaintenanceCategory.LANDSCAPING]: 168,
    [MaintenanceCategory.OTHER]: 72,
  };
  
  const priorityMultipliers: Record<MaintenancePriority, number> = {
    [MaintenancePriority.EMERGENCY]: 0.25,
    [MaintenancePriority.URGENT]: 0.5,
    [MaintenancePriority.HIGH]: 0.75,
    [MaintenancePriority.MEDIUM]: 1,
    [MaintenancePriority.LOW]: 2,
  };
  
  return baseSLA[category] * priorityMultipliers[priority];
}

/**
 * Extract keywords
 */
function extractKeywords(description: string): string[] {
  const words = description.toLowerCase().split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once']);
  
  return words.filter(word => word.length > 3 && !stopWords.has(word));
}

/**
 * Analyze sentiment
 */
function analyzeSentiment(description: string): 'negative' | 'neutral' | 'positive' {
  const negativeWords = ['broken', 'leaking', 'not working', 'damaged', 'failed', 'emergency', 'urgent', 'problem', 'issue', 'worried', 'concerned', 'frustrated', 'angry'];
  const positiveWords = ['please', 'thank', 'appreciate', 'helpful', 'thanks', 'great', 'good'];
  
  const lowerDescription = description.toLowerCase();
  
  const negativeCount = negativeWords.filter(word => lowerDescription.includes(word)).length;
  const positiveCount = positiveWords.filter(word => lowerDescription.includes(word)).length;
  
  if (negativeCount > positiveCount) {
    return 'negative';
  } else if (positiveCount > negativeCount) {
    return 'positive';
  }
  
  return 'neutral';
}

/**
 * Determine priority
 */
function determinePriority(classification: ClassificationResult): MaintenancePriority {
  return classification.priority;
}

/**
 * Determine urgency
 */
function determineUrgency(classification: ClassificationResult): UrgencyLevel {
  return classification.urgency;
}

/**
 * Recommend contractor
 */
function recommendContractor(classification: ClassificationResult): string[] {
  return classification.recommendedContractors;
}

/**
 * Calculate SLA
 */
function calculateSLA(classification: ClassificationResult): number {
  return classification.slaHours;
}

/**
 * Batch classify requests
 */
export function batchClassifyRequests(requests: Array<{
  description: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
}>): MaintenanceRequest[] {
  return requests.map(request => 
    classifyMaintenanceRequest(request.description, request.propertyId, request.unitId, request.tenantId)
  );
}

/**
 * Get maintenance category label
 */
export function getMaintenanceCategoryLabel(category: MaintenanceCategory): string {
  const labels: Record<MaintenanceCategory, string> = {
    [MaintenanceCategory.PLUMBING]: 'Plumbing',
    [MaintenanceCategory.ELECTRICAL]: 'Electrical',
    [MaintenanceCategory.HVAC]: 'HVAC',
    [MaintenanceCategory.STRUCTURAL]: 'Structural',
    [MaintenanceCategory.APPLIANCE]: 'Appliance',
    [MaintenanceCategory.PEST_CONTROL]: 'Pest Control',
    [MaintenanceCategory.CLEANING]: 'Cleaning',
    [MaintenanceCategory.SECURITY]: 'Security',
    [MaintenanceCategory.LANDSCAPING]: 'Landscaping',
    [MaintenanceCategory.OTHER]: 'Other',
  };

  return labels[category];
}

/**
 * Get maintenance priority label
 */
export function getMaintenancePriorityLabel(priority: MaintenancePriority): string {
  const labels: Record<MaintenancePriority, string> = {
    [MaintenancePriority.EMERGENCY]: 'Emergency',
    [MaintenancePriority.URGENT]: 'Urgent',
    [MaintenancePriority.HIGH]: 'High',
    [MaintenancePriority.MEDIUM]: 'Medium',
    [MaintenancePriority.LOW]: 'Low',
  };

  return labels[priority];
}

/**
 * Get urgency level label
 */
export function getUrgencyLevelLabel(urgency: UrgencyLevel): string {
  const labels: Record<UrgencyLevel, string> = {
    [UrgencyLevel.IMMEDIATE]: 'Immediate',
    [UrgencyLevel.SAME_DAY]: 'Same Day',
    [UrgencyLevel.NEXT_DAY]: 'Next Day',
    [UrgencyLevel.WEEK]: 'This Week',
    [UrgencyLevel.MONTH]: 'This Month',
  };

  return labels[urgency];
}

/**
 * Filter by category
 */
export function filterByCategory(requests: MaintenanceRequest[], category: MaintenanceCategory): MaintenanceRequest[] {
  return requests.filter(request => request.category === category);
}

/**
 * Filter by priority
 */
export function filterByPriority(requests: MaintenanceRequest[], priority: MaintenancePriority): MaintenanceRequest[] {
  return requests.filter(request => request.priority === priority);
}

/**
 * Get maintenance statistics
 */
export function getMaintenanceStatistics(requests: MaintenanceRequest[]): {
  totalRequests: number;
  byCategory: Record<MaintenanceCategory, number>;
  byPriority: Record<MaintenancePriority, number>;
  byUrgency: Record<UrgencyLevel, number>;
  averageEstimatedCost: number;
  bySentiment: Record<'negative' | 'neutral' | 'positive', number>;
} {
  const byCategory: Record<MaintenanceCategory, number> = {
    [MaintenanceCategory.PLUMBING]: 0,
    [MaintenanceCategory.ELECTRICAL]: 0,
    [MaintenanceCategory.HVAC]: 0,
    [MaintenanceCategory.STRUCTURAL]: 0,
    [MaintenanceCategory.APPLIANCE]: 0,
    [MaintenanceCategory.PEST_CONTROL]: 0,
    [MaintenanceCategory.CLEANING]: 0,
    [MaintenanceCategory.SECURITY]: 0,
    [MaintenanceCategory.LANDSCAPING]: 0,
    [MaintenanceCategory.OTHER]: 0,
  };
  
  const byPriority: Record<MaintenancePriority, number> = {
    [MaintenancePriority.EMERGENCY]: 0,
    [MaintenancePriority.URGENT]: 0,
    [MaintenancePriority.HIGH]: 0,
    [MaintenancePriority.MEDIUM]: 0,
    [MaintenancePriority.LOW]: 0,
  };
  
  const byUrgency: Record<UrgencyLevel, number> = {
    [UrgencyLevel.IMMEDIATE]: 0,
    [UrgencyLevel.SAME_DAY]: 0,
    [UrgencyLevel.NEXT_DAY]: 0,
    [UrgencyLevel.WEEK]: 0,
    [UrgencyLevel.MONTH]: 0,
  };
  
  const bySentiment: Record<'negative' | 'neutral' | 'positive', number> = {
    negative: 0,
    neutral: 0,
    positive: 0,
  };
  
  let totalEstimatedCost = 0;
  
  for (const request of requests) {
    byCategory[request.category]++;
    byPriority[request.priority]++;
    byUrgency[request.urgency]++;
    bySentiment[request.sentiment]++;
    
    if (request.estimatedCost) {
      totalEstimatedCost += request.estimatedCost;
    }
  }
  
  const averageEstimatedCost = requests.length > 0 ? totalEstimatedCost / requests.length : 0;
  
  return {
    totalRequests: requests.length,
    byCategory,
    byPriority,
    byUrgency,
    averageEstimatedCost,
    bySentiment,
  };
}
