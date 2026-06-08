/**
 * Contractor Assignment Engine
 * 
 * Advanced contractor assignment with:
 * - Availability management
 * - Rating system
 * - Cost optimization
 * - Workload balancing
 * - Geographic optimization
 * - Skill matching
 * - Performance tracking
 */

// Assignment strategy
export enum AssignmentStrategy {
  COST_OPTIMIZED = 'cost_optimized',
  QUALITY_OPTIMIZED = 'quality_optimized',
  SPEED_OPTIMIZED = 'speed_optimized',
  BALANCED = 'balanced',
  WORKLOAD_BALANCED = 'workload_balanced',
}

// Contractor workload
export interface ContractorWorkload {
  contractorId: string;
  currentAssignments: number;
  totalHours: number;
  utilizationRate: number; // 0-1
  availableHours: number;
}

// Contractor performance
export interface ContractorPerformance {
  contractorId: string;
  totalAssignments: number;
  completedAssignments: number;
  completionRate: number;
  averageRating: number;
  averageResponseTime: number; // hours
  averageCompletionTime: number; // hours
  onTimeCompletionRate: number;
  qualityScore: number;
}

// Assignment optimization result
export interface AssignmentOptimizationResult {
  requestId: string;
  recommendedContractors: Array<{
    contractorId: string;
    score: number;
    estimatedCost: number;
    estimatedCompletionTime: Date;
    confidence: number;
    reasoning: string[];
  }>;
  bestMatch: {
    contractorId: string;
    score: number;
    estimatedCost: number;
    estimatedCompletionTime: Date;
  };
  optimizationStrategy: AssignmentStrategy;
}

// Cost optimization parameters
export interface CostOptimizationParams {
  budget: number;
  maxHourlyRate: number;
  preferFixedPricing: boolean;
  allowOvertime: boolean;
  overtimeMultiplier: number;
}

// Quality optimization parameters
export interface QualityOptimizationParams {
  minRating: number;
  minCompletionRate: number;
  requireCertifications: string[];
  minExperience: number; // years
  preferPremium: boolean;
}

/**
 * Calculate contractor workload
 */
export function calculateContractorWorkload(
  contractorId: string,
  assignments: Array<{ contractorId: string; estimatedDuration: number; status: string }>
): ContractorWorkload {
  const contractorAssignments = assignments.filter(a => a.contractorId === contractorId && a.status !== 'completed');
  const totalHours = contractorAssignments.reduce((sum, a) => sum + a.estimatedDuration, 0);
  
  // Assume 8-hour workday, 5 days per week
  const weeklyCapacity = 40;
  const utilizationRate = Math.min(1, totalHours / weeklyCapacity);
  const availableHours = Math.max(0, weeklyCapacity - totalHours);
  
  return {
    contractorId,
    currentAssignments: contractorAssignments.length,
    totalHours,
    utilizationRate,
    availableHours,
  };
}

/**
 * Calculate contractor performance metrics
 */
export function calculateContractorPerformance(
  contractorId: string,
  history: Array<{
    contractorId: string;
    rating?: number;
    responseTime?: number;
    completionTime?: number;
    completedOnTime?: boolean;
    status: string;
  }>
): ContractorPerformance {
  const contractorHistory = history.filter(h => h.contractorId === contractorId);
  const completed = contractorHistory.filter(h => h.status === 'completed');
  
  const totalAssignments = contractorHistory.length;
  const completedAssignments = completed.length;
  const completionRate = totalAssignments > 0 ? completedAssignments / totalAssignments : 0;
  
  const ratings = completed.filter(h => h.rating !== undefined).map(h => h.rating!);
  const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
  
  const responseTimes = completed.filter(h => h.responseTime !== undefined).map(h => h.responseTime!);
  const averageResponseTime = responseTimes.length > 0 ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length : 0;
  
  const completionTimes = completed.filter(h => h.completionTime !== undefined).map(h => h.completionTime!);
  const averageCompletionTime = completionTimes.length > 0 ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length : 0;
  
  const onTimeCompletions = completed.filter(h => h.completedOnTime === true).length;
  const onTimeCompletionRate = completed.length > 0 ? onTimeCompletions / completed.length : 0;
  
  // Quality score combines rating, on-time rate, and completion rate
  const qualityScore = (averageRating * 0.4) + (onTimeCompletionRate * 0.3) + (completionRate * 0.3);
  
  return {
    contractorId,
    totalAssignments,
    completedAssignments,
    completionRate,
    averageRating,
    averageResponseTime,
    averageCompletionTime,
    onTimeCompletionRate,
    qualityScore,
  };
}

/**
 * Optimize assignment by cost
 */
export function optimizeByCost(
  requestId: string,
  contractors: Array<{
    id: string;
    hourlyRate: number;
    location: { latitude: number; longitude: number };
    skills: Array<{ category: string; level: string }>;
  }>,
  request: {
    requiredSkills: Array<{ category: string; level: string }>;
    location: { latitude: number; longitude: number };
    estimatedDuration: number;
    scheduledDate: Date;
  },
  params: CostOptimizationParams
): AssignmentOptimizationResult {
  const scoredContractors = contractors.map(contractor => {
    const estimatedCost = contractor.hourlyRate * request.estimatedDuration;
    
    // Check budget
    const withinBudget = estimatedCost <= params.budget;
    const withinRateLimit = contractor.hourlyRate <= params.maxHourlyRate;
    
    if (!withinBudget || !withinRateLimit) {
      return {
        contractorId: contractor.id,
        score: 0,
        estimatedCost,
        estimatedCompletionTime: request.scheduledDate,
        confidence: 0,
        reasoning: ['Exceeds budget or rate limit'],
      };
    }
    
    // Cost score (lower is better)
    const costScore = 1 - (estimatedCost / params.budget);
    
    // Skill match
    const skillMatch = calculateSkillMatchScore(
      request.requiredSkills,
      contractor.skills
    );
    
    // Distance score
    const distance = calculateDistance(
      contractor.location.latitude,
      contractor.location.longitude,
      request.location.latitude,
      request.location.longitude
    );
    const distanceScore = Math.max(0, 1 - distance / 50);
    
    // Overall score (weighted towards cost)
    const score = (costScore * 0.5) + (skillMatch * 0.3) + (distanceScore * 0.2);
    
    const reasoning = [
      `Cost: KES ${estimatedCost.toFixed(0)}`,
      `Cost score: ${(costScore * 100).toFixed(0)}%`,
      `Skill match: ${(skillMatch * 100).toFixed(0)}%`,
      `Distance: ${distance.toFixed(1)} km`,
    ];
    
    return {
      contractorId: contractor.id,
      score,
      estimatedCost,
      estimatedCompletionTime: request.scheduledDate,
      confidence: skillMatch,
      reasoning,
    };
  });
  
  // Sort by score
  scoredContractors.sort((a, b) => b.score - a.score);
  
  const bestMatch = scoredContractors[0];
  
  return {
    requestId,
    recommendedContractors: scoredContractors.filter(c => c.score > 0.3),
    bestMatch: {
      contractorId: bestMatch.contractorId,
      score: bestMatch.score,
      estimatedCost: bestMatch.estimatedCost,
      estimatedCompletionTime: bestMatch.estimatedCompletionTime,
    },
    optimizationStrategy: AssignmentStrategy.COST_OPTIMIZED,
  };
}

/**
 * Optimize assignment by quality
 */
export function optimizeByQuality(
  requestId: string,
  contractors: Array<{
    id: string;
    hourlyRate: number;
    skills: Array<{ category: string; level: string; certifications: string[]; yearsExperience: number }>;
    performance: ContractorPerformance;
  }>,
  request: {
    requiredSkills: Array<{ category: string; level: string }>;
    estimatedDuration: number;
    scheduledDate: Date;
  },
  params: QualityOptimizationParams
): AssignmentOptimizationResult {
  const scoredContractors = contractors.map(contractor => {
    const estimatedCost = contractor.hourlyRate * request.estimatedDuration;
    
    // Check quality requirements
    const meetsRating = contractor.performance.averageRating >= params.minRating;
    const meetsCompletionRate = contractor.performance.completionRate >= params.minCompletionRate;
    
    if (!meetsRating || !meetsCompletionRate) {
      return {
        contractorId: contractor.id,
        score: 0,
        estimatedCost,
        estimatedCompletionTime: request.scheduledDate,
        confidence: 0,
        reasoning: ['Does not meet quality requirements'],
      };
    }
    
    // Check certifications
    const hasRequiredCerts = params.requireCertifications.every(cert =>
      contractor.skills.some(s => s.certifications.includes(cert))
    );
    
    if (!hasRequiredCerts) {
      return {
        contractorId: contractor.id,
        score: 0,
        estimatedCost,
        estimatedCompletionTime: request.scheduledDate,
        confidence: 0,
        reasoning: ['Missing required certifications'],
      };
    }
    
    // Quality score
    const qualityScore = contractor.performance.qualityScore;
    
    // Skill match
    const skillMatch = calculateSkillMatchScore(
      request.requiredSkills,
      contractor.skills
    );
    
    // Experience score
    const avgExperience = contractor.skills.reduce((sum, s) => sum + s.yearsExperience, 0) / contractor.skills.length;
    const experienceScore = Math.min(1, avgExperience / params.minExperience);
    
    // Overall score (weighted towards quality)
    const score = (qualityScore * 0.5) + (skillMatch * 0.3) + (experienceScore * 0.2);
    
    const reasoning = [
      `Quality score: ${(qualityScore * 100).toFixed(0)}%`,
      `Rating: ${contractor.performance.averageRating.toFixed(1)}/5`,
      `Skill match: ${(skillMatch * 100).toFixed(0)}%`,
      `Experience: ${avgExperience.toFixed(0)} years`,
    ];
    
    return {
      contractorId: contractor.id,
      score,
      estimatedCost,
      estimatedCompletionTime: request.scheduledDate,
      confidence: qualityScore,
      reasoning,
    };
  });
  
  // Sort by score
  scoredContractors.sort((a, b) => b.score - a.score);
  
  const bestMatch = scoredContractors[0];
  
  return {
    requestId,
    recommendedContractors: scoredContractors.filter(c => c.score > 0.3),
    bestMatch: {
      contractorId: bestMatch.contractorId,
      score: bestMatch.score,
      estimatedCost: bestMatch.estimatedCost,
      estimatedCompletionTime: bestMatch.estimatedCompletionTime,
    },
    optimizationStrategy: AssignmentStrategy.QUALITY_OPTIMIZED,
  };
}

/**
 * Optimize assignment by speed
 */
export function optimizeBySpeed(
  requestId: string,
  contractors: Array<{
    id: string;
    hourlyRate: number;
    location: { latitude: number; longitude: number };
    skills: Array<{ category: string; level: string }>;
    performance: ContractorPerformance;
  }>,
  request: {
    requiredSkills: Array<{ category: string; level: string }>;
    location: { latitude: number; longitude: number };
    estimatedDuration: number;
    scheduledDate: Date;
  }
): AssignmentOptimizationResult {
  const scoredContractors = contractors.map(contractor => {
    const estimatedCost = contractor.hourlyRate * request.estimatedDuration;
    
    // Response time score (faster is better)
    const responseTimeScore = Math.max(0, 1 - contractor.performance.averageResponseTime / 24);
    
    // Completion time score
    const completionTimeScore = Math.max(0, 1 - contractor.performance.averageCompletionTime / 48);
    
    // Distance score
    const distance = calculateDistance(
      contractor.location.latitude,
      contractor.location.longitude,
      request.location.latitude,
      request.location.longitude
    );
    const distanceScore = Math.max(0, 1 - distance / 50);
    
    // Skill match
    const skillMatch = calculateSkillMatchScore(
      request.requiredSkills,
      contractor.skills
    );
    
    // Overall score (weighted towards speed)
    const score = (responseTimeScore * 0.4) + (completionTimeScore * 0.3) + (distanceScore * 0.2) + (skillMatch * 0.1);
    
    const estimatedArrival = new Date(request.scheduledDate);
    estimatedArrival.setHours(estimatedArrival.getHours() + Math.ceil(distance / 40));
    
    const reasoning = [
      `Response time: ${contractor.performance.averageResponseTime.toFixed(1)} hours`,
      `Completion time: ${contractor.performance.averageCompletionTime.toFixed(1)} hours`,
      `Distance: ${distance.toFixed(1)} km`,
      `ETA: ${estimatedArrival.toLocaleString()}`,
    ];
    
    return {
      contractorId: contractor.id,
      score,
      estimatedCost,
      estimatedCompletionTime: estimatedArrival,
      confidence: skillMatch,
      reasoning,
    };
  });
  
  // Sort by score
  scoredContractors.sort((a, b) => b.score - a.score);
  
  const bestMatch = scoredContractors[0];
  
  return {
    requestId,
    recommendedContractors: scoredContractors.filter(c => c.score > 0.3),
    bestMatch: {
      contractorId: bestMatch.contractorId,
      score: bestMatch.score,
      estimatedCost: bestMatch.estimatedCost,
      estimatedCompletionTime: bestMatch.estimatedCompletionTime,
    },
    optimizationStrategy: AssignmentStrategy.SPEED_OPTIMIZED,
  };
}

/**
 * Optimize assignment with balanced approach
 */
export function optimizeBalanced(
  requestId: string,
  contractors: Array<{
    id: string;
    hourlyRate: number;
    location: { latitude: number; longitude: number };
    skills: Array<{ category: string; level: string }>;
    performance: ContractorPerformance;
    workload: ContractorWorkload;
  }>,
  request: {
    requiredSkills: Array<{ category: string; level: string }>;
    location: { latitude: number; longitude: number };
    estimatedDuration: number;
    scheduledDate: Date;
    budget: number;
  }
): AssignmentOptimizationResult {
  const scoredContractors = contractors.map(contractor => {
    const estimatedCost = contractor.hourlyRate * request.estimatedDuration;
    
    // Cost score
    const costScore = estimatedCost <= request.budget ? 1 - (estimatedCost / request.budget) : 0;
    
    // Quality score
    const qualityScore = contractor.performance.qualityScore;
    
    // Speed score
    const responseTimeScore = Math.max(0, 1 - contractor.performance.averageResponseTime / 24);
    
    // Distance score
    const distance = calculateDistance(
      contractor.location.latitude,
      contractor.location.longitude,
      request.location.latitude,
      request.location.longitude
    );
    const distanceScore = Math.max(0, 1 - distance / 50);
    
    // Workload score (prefer less loaded contractors)
    const workloadScore = 1 - contractor.workload.utilizationRate;
    
    // Skill match
    const skillMatch = calculateSkillMatchScore(
      request.requiredSkills,
      contractor.skills
    );
    
    // Balanced score (equal weights)
    const score = (costScore * 0.2) + (qualityScore * 0.2) + (responseTimeScore * 0.2) + 
                  (distanceScore * 0.15) + (workloadScore * 0.15) + (skillMatch * 0.1);
    
    const reasoning = [
      `Cost score: ${(costScore * 100).toFixed(0)}%`,
      `Quality score: ${(qualityScore * 100).toFixed(0)}%`,
      `Speed score: ${(responseTimeScore * 100).toFixed(0)}%`,
      `Workload: ${(contractor.workload.utilizationRate * 100).toFixed(0)}%`,
      `Skill match: ${(skillMatch * 100).toFixed(0)}%`,
    ];
    
    return {
      contractorId: contractor.id,
      score,
      estimatedCost,
      estimatedCompletionTime: request.scheduledDate,
      confidence: skillMatch,
      reasoning,
    };
  });
  
  // Sort by score
  scoredContractors.sort((a, b) => b.score - a.score);
  
  const bestMatch = scoredContractors[0];
  
  return {
    requestId,
    recommendedContractors: scoredContractors.filter(c => c.score > 0.3),
    bestMatch: {
      contractorId: bestMatch.contractorId,
      score: bestMatch.score,
      estimatedCost: bestMatch.estimatedCost,
      estimatedCompletionTime: bestMatch.estimatedCompletionTime,
    },
    optimizationStrategy: AssignmentStrategy.BALANCED,
  };
}

/**
 * Optimize assignment with workload balancing
 */
export function optimizeWorkloadBalanced(
  requestId: string,
  contractors: Array<{
    id: string;
    hourlyRate: number;
    skills: Array<{ category: string; level: string }>;
    performance: ContractorPerformance;
    workload: ContractorWorkload;
  }>,
  request: {
    requiredSkills: Array<{ category: string; level: string }>;
    estimatedDuration: number;
    scheduledDate: Date;
  }
): AssignmentOptimizationResult {
  const scoredContractors = contractors.map(contractor => {
    const estimatedCost = contractor.hourlyRate * request.estimatedDuration;
    
    // Workload score (primary factor)
    const workloadScore = 1 - contractor.workload.utilizationRate;
    
    // Quality score
    const qualityScore = contractor.performance.qualityScore;
    
    // Skill match
    const skillMatch = calculateSkillMatchScore(
      request.requiredSkills,
      contractor.skills
    );
    
    // Overall score (weighted towards workload)
    const score = (workloadScore * 0.5) + (qualityScore * 0.3) + (skillMatch * 0.2);
    
    const reasoning = [
      `Workload: ${(contractor.workload.utilizationRate * 100).toFixed(0)}%`,
      `Available hours: ${contractor.workload.availableHours.toFixed(1)}`,
      `Quality score: ${(qualityScore * 100).toFixed(0)}%`,
      `Skill match: ${(skillMatch * 100).toFixed(0)}%`,
    ];
    
    return {
      contractorId: contractor.id,
      score,
      estimatedCost,
      estimatedCompletionTime: request.scheduledDate,
      confidence: skillMatch,
      reasoning,
    };
  });
  
  // Sort by score
  scoredContractors.sort((a, b) => b.score - a.score);
  
  const bestMatch = scoredContractors[0];
  
  return {
    requestId,
    recommendedContractors: scoredContractors.filter(c => c.score > 0.3),
    bestMatch: {
      contractorId: bestMatch.contractorId,
      score: bestMatch.score,
      estimatedCost: bestMatch.estimatedCost,
      estimatedCompletionTime: bestMatch.estimatedCompletionTime,
    },
    optimizationStrategy: AssignmentStrategy.WORKLOAD_BALANCED,
  };
}

/**
 * Calculate skill match score (simplified version)
 */
function calculateSkillMatchScore(
  requiredSkills: Array<{ category: string; level: string }>,
  contractorSkills: Array<{ category: string; level: string; certifications?: string[]; yearsExperience?: number }>
): number {
  if (requiredSkills.length === 0) return 1;
  
  let totalScore = 0;
  let matchedSkills = 0;
  
  for (const required of requiredSkills) {
    const contractorSkill = contractorSkills.find(s => s.category === required.category);
    
    if (!contractorSkill) {
      continue;
    }
    
    const levelValues: Record<string, number> = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
      expert: 4,
    };
    
    const requiredLevel = levelValues[required.level.toLowerCase()] || 1;
    const contractorLevel = levelValues[contractorSkill.level.toLowerCase()] || 1;
    
    if (contractorLevel >= requiredLevel) {
      const score = Math.min(contractorLevel / requiredLevel, 1);
      totalScore += score;
      matchedSkills++;
    }
  }
  
  return matchedSkills > 0 ? totalScore / requiredSkills.length : 0;
}

/**
 * Calculate distance (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Get assignment strategy label
 */
export function getAssignmentStrategyLabel(strategy: AssignmentStrategy): string {
  const labels: Record<AssignmentStrategy, string> = {
    [AssignmentStrategy.COST_OPTIMIZED]: 'Cost Optimized',
    [AssignmentStrategy.QUALITY_OPTIMIZED]: 'Quality Optimized',
    [AssignmentStrategy.SPEED_OPTIMIZED]: 'Speed Optimized',
    [AssignmentStrategy.BALANCED]: 'Balanced',
    [AssignmentStrategy.WORKLOAD_BALANCED]: 'Workload Balanced',
  };

  return labels[strategy];
}

/**
 * Auto-select optimization strategy based on request characteristics
 */
export function autoSelectStrategy(
  request: {
    priority: 'low' | 'medium' | 'high' | 'emergency';
    budget?: number;
    urgency: number; // 1-10
  }
): AssignmentStrategy {
  if (request.priority === 'emergency' || request.urgency >= 8) {
    return AssignmentStrategy.SPEED_OPTIMIZED;
  }
  
  if (request.budget && request.urgency <= 5) {
    return AssignmentStrategy.COST_OPTIMIZED;
  }
  
  if (request.priority === 'high' || request.urgency >= 6) {
    return AssignmentStrategy.QUALITY_OPTIMIZED;
  }
  
  return AssignmentStrategy.BALANCED;
}
