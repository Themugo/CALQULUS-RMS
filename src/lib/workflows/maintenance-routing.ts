/**
 * Automated Maintenance Routing System
 * 
 * Implements skill-based maintenance assignment with:
 * - Contractor skill matching
 * - Availability checking
 * - Priority-based routing
 * - Geographic optimization
 * - Cost optimization
 * - Workload balancing
 */

// Maintenance priority
export enum MaintenancePriority {
  EMERGENCY = 'emergency',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// Maintenance category
export enum MaintenanceCategory {
  PLUMBING = 'plumbing',
  ELECTRICAL = 'electrical',
  HVAC = 'hvac',
  CARPENTRY = 'carpentry',
  PAINTING = 'painting',
  GENERAL = 'general',
  CLEANING = 'cleaning',
  SECURITY = 'security',
  LANDSCAPING = 'landscaping',
}

// Skill level
export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

// Contractor skill
export interface ContractorSkill {
  category: MaintenanceCategory;
  level: SkillLevel;
  certifications: string[];
  yearsExperience: number;
}

// Contractor availability
export interface ContractorAvailability {
  contractorId: string;
  date: Date;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isAvailable: boolean;
}

// Contractor rating
export interface ContractorRating {
  contractorId: string;
  averageRating: number; // 1-5
  totalRatings: number;
  responseTime: number; // hours
  completionRate: number; // percentage
  qualityScore: number; // 1-5
}

// Contractor
export interface Contractor {
  id: string;
  name: string;
  phone: string;
  email: string;
  skills: ContractorSkill[];
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  hourlyRate: number;
  availability: ContractorAvailability[];
  rating: ContractorRating;
  isActive: boolean;
}

// Maintenance request
export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  unitId: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  estimatedDuration: number; // hours
  requiredSkills: Array<{
    category: MaintenanceCategory;
    level: SkillLevel;
  }>;
  scheduledDate?: Date;
  preferredTime?: string;
  urgency: number; // 1-10
  budget?: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedContractorId?: string;
  createdAt: Date;
  createdBy: string;
}

// Assignment result
export interface AssignmentResult {
  requestId: string;
  assignedContractor: Contractor;
  matchScore: number; // 0-1
  estimatedCost: number;
  estimatedArrivalTime: Date;
  reasoning: string[];
}

/**
 * Calculate skill match score
 */
export function calculateSkillMatchScore(
  requiredSkills: Array<{ category: MaintenanceCategory; level: SkillLevel }>,
  contractorSkills: ContractorSkill[]
): number {
  if (requiredSkills.length === 0) return 1;
  
  let totalScore = 0;
  let matchedSkills = 0;
  
  for (const required of requiredSkills) {
    const contractorSkill = contractorSkills.find(s => s.category === required.category);
    
    if (!contractorSkill) {
      continue;
    }
    
    // Skill level mapping
    const levelValues: Record<SkillLevel, number> = {
      [SkillLevel.BEGINNER]: 1,
      [SkillLevel.INTERMEDIATE]: 2,
      [SkillLevel.ADVANCED]: 3,
      [SkillLevel.EXPERT]: 4,
    };
    
    const requiredLevel = levelValues[required.level];
    const contractorLevel = levelValues[contractorSkill.level];
    
    // Contractor must meet or exceed required level
    if (contractorLevel >= requiredLevel) {
      const score = Math.min(contractorLevel / requiredLevel, 1);
      totalScore += score;
      matchedSkills++;
    }
  }
  
  return matchedSkills > 0 ? totalScore / requiredSkills.length : 0;
}

/**
 * Check contractor availability
 */
export function checkContractorAvailability(
  contractor: Contractor,
  requestedDate: Date,
  duration: number
): boolean {
  const requestedStart = requestedDate.getTime();
  const requestedEnd = requestedStart + duration * 60 * 60 * 1000;
  
  for (const availability of contractor.availability) {
    const availDate = new Date(availability.date);
    const [startHour, startMinute] = availability.startTime.split(':').map(Number);
    const [endHour, endMinute] = availability.endTime.split(':').map(Number);
    
    const availStart = new Date(availDate);
    availStart.setHours(startHour, startMinute, 0, 0);
    
    const availEnd = new Date(availDate);
    availEnd.setHours(endHour, endMinute, 0, 0);
    
    if (availability.isAvailable && requestedStart >= availStart.getTime() && requestedEnd <= availEnd.getTime()) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate distance between two points (Haversine formula)
 */
export function calculateDistance(
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
 * Calculate distance score (closer is better)
 */
export function calculateDistanceScore(
  contractorLocation: { latitude: number; longitude: number },
  requestLocation: { latitude: number; longitude: number },
  maxDistance: number = 50 // km
): number {
  const distance = calculateDistance(
    contractorLocation.latitude,
    contractorLocation.longitude,
    requestLocation.latitude,
    requestLocation.longitude
  );
  
  return Math.max(0, 1 - distance / maxDistance);
}

/**
 * Calculate rating score
 */
export function calculateRatingScore(rating: ContractorRating): number {
  // Weighted score: rating (50%), response time (25%), completion rate (25%)
  const ratingScore = rating.averageRating / 5;
  const responseScore = Math.max(0, 1 - rating.responseTime / 24); // Prefer response within 24 hours
  const completionScore = rating.completionRate / 100;
  
  return (ratingScore * 0.5) + (responseScore * 0.25) + (completionScore * 0.25);
}

/**
 * Calculate cost score (lower is better)
 */
export function calculateCostScore(
  contractorRate: number,
  budget: number | undefined,
  duration: number
): number {
  const estimatedCost = contractorRate * duration;
  
  if (!budget) return 0.5; // Neutral score if no budget
  
  if (estimatedCost > budget) return 0; // Over budget
  
  return 1 - (estimatedCost / budget);
}

/**
 * Calculate overall match score
 */
export function calculateMatchScore(
  request: MaintenanceRequest,
  contractor: Contractor
): {
  score: number;
  reasoning: string[];
} {
  const reasoning: string[] = [];
  let score = 0;
  
  // Skill match (40% weight)
  const skillScore = calculateSkillMatchScore(request.requiredSkills, contractor.skills);
  score += skillScore * 0.4;
  reasoning.push(`Skill match: ${(skillScore * 100).toFixed(0)}%`);
  
  // Availability (30% weight)
  const isAvailable = checkContractorAvailability(
    contractor,
    request.scheduledDate || new Date(),
    request.estimatedDuration
  );
  const availabilityScore = isAvailable ? 1 : 0;
  score += availabilityScore * 0.3;
  reasoning.push(isAvailable ? 'Available at requested time' : 'Not available at requested time');
  
  // Distance (15% weight)
  const distanceScore = calculateDistanceScore(contractor.location, request.location);
  score += distanceScore * 0.15;
  reasoning.push(`Distance score: ${(distanceScore * 100).toFixed(0)}%`);
  
  // Rating (10% weight)
  const ratingScore = calculateRatingScore(contractor.rating);
  score += ratingScore * 0.1;
  reasoning.push(`Rating: ${contractor.rating.averageRating.toFixed(1)}/5`);
  
  // Cost (5% weight)
  const costScore = calculateCostScore(contractor.hourlyRate, request.budget, request.estimatedDuration);
  score += costScore * 0.05;
  reasoning.push(`Cost: KES ${contractor.hourlyRate}/hour`);
  
  return {
    score: Math.max(0, Math.min(1, score)),
    reasoning,
  };
}

/**
 * Assign maintenance request to best contractor
 */
export function assignMaintenanceRequest(
  request: MaintenanceRequest,
  contractors: Contractor[]
): AssignmentResult | null {
  const availableContractors = contractors.filter(c => c.isActive);
  
  if (availableContractors.length === 0) {
    return null;
  }
  
  // Calculate scores for all contractors
  const scoredContractors = availableContractors.map(contractor => {
    const { score, reasoning } = calculateMatchScore(request, contractor);
    const estimatedCost = contractor.hourlyRate * request.estimatedDuration;
    const distance = calculateDistance(
      contractor.location.latitude,
      contractor.location.longitude,
      request.location.latitude,
      request.location.longitude
    );
    const travelTime = distance / 40; // Assume 40 km/h average speed
    const estimatedArrival = new Date();
    estimatedArrival.setHours(estimatedArrival.getHours() + Math.ceil(travelTime));
    
    return {
      contractor,
      score,
      estimatedCost,
      estimatedArrival,
      reasoning,
    };
  });
  
  // Sort by score (highest first)
  scoredContractors.sort((a, b) => b.score - a.score);
  
  const bestMatch = scoredContractors[0];
  
  if (bestMatch.score < 0.3) {
    // No suitable contractor found
    return null;
  }
  
  return {
    requestId: request.id,
    assignedContractor: bestMatch.contractor,
    matchScore: bestMatch.score,
    estimatedCost: bestMatch.estimatedCost,
    estimatedArrivalTime: bestMatch.estimatedArrival,
    reasoning: bestMatch.reasoning,
  };
}

/**
 * Batch assign multiple maintenance requests
 */
export function batchAssignMaintenanceRequests(
  requests: MaintenanceRequest[],
  contractors: Contractor[]
): Array<{ request: MaintenanceRequest; assignment: AssignmentResult | null }> {
  // Sort requests by priority
  const priorityOrder = {
    [MaintenancePriority.EMERGENCY]: 0,
    [MaintenancePriority.HIGH]: 1,
    [MaintenancePriority.MEDIUM]: 2,
    [MaintenancePriority.LOW]: 3,
  };
  
  const sortedRequests = [...requests].sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.urgency - a.urgency;
  });
  
  const results: Array<{ request: MaintenanceRequest; assignment: AssignmentResult | null }> = [];
  
  for (const request of sortedRequests) {
    const assignment = assignMaintenanceRequest(request, contractors);
    results.push({ request, assignment });
    
    // Update contractor availability if assigned
    if (assignment) {
      const contractor = contractors.find(c => c.id === assignment.assignedContractor.id);
      if (contractor && request.scheduledDate) {
        // Mark as unavailable during the scheduled time
        contractor.availability.push({
          contractorId: contractor.id,
          date: request.scheduledDate,
          startTime: request.preferredTime || '09:00',
          endTime: request.preferredTime || '17:00',
          isAvailable: false,
        });
      }
    }
  }
  
  return results;
}

/**
 * Balance workload across contractors
 */
export function balanceWorkload(
  requests: MaintenanceRequest[],
  contractors: Contractor[]
): MaintenanceRequest[] {
  // Calculate current workload for each contractor
  const workload = new Map<string, number>();
  
  for (const contractor of contractors) {
    const assignedRequests = requests.filter(r => r.assignedContractorId === contractor.id);
    const totalHours = assignedRequests.reduce((sum, r) => sum + r.estimatedDuration, 0);
    workload.set(contractor.id, totalHours);
  }
  
  // Reassign requests from overloaded contractors
  const balancedRequests = [...requests];
  
  for (const request of balancedRequests) {
    if (!request.assignedContractorId) continue;
    
    const currentWorkload = workload.get(request.assignedContractorId) || 0;
    const averageWorkload = Array.from(workload.values()).reduce((sum, w) => sum + w, 0) / workload.size;
    
    if (currentWorkload > averageWorkload * 1.5) {
      // Find less loaded contractor
      const lessLoadedContractor = contractors
        .filter(c => workload.get(c.id)! < averageWorkload)
        .sort((a, b) => (workload.get(a.id)! || 0) - (workload.get(b.id)! || 0))[0];
      
      if (lessLoadedContractor) {
        const { score } = calculateMatchScore(request, lessLoadedContractor);
        
        if (score > 0.5) {
          request.assignedContractorId = lessLoadedContractor.id;
          workload.set(request.assignedContractorId, currentWorkload - request.estimatedDuration);
          workload.set(lessLoadedContractor.id, (workload.get(lessLoadedContractor.id) || 0) + request.estimatedDuration);
        }
      }
    }
  }
  
  return balancedRequests;
}

/**
 * Get maintenance priority label
 */
export function getMaintenancePriorityLabel(priority: MaintenancePriority): string {
  const labels: Record<MaintenancePriority, string> = {
    [MaintenancePriority.EMERGENCY]: 'Emergency',
    [MaintenancePriority.HIGH]: 'High',
    [MaintenancePriority.MEDIUM]: 'Medium',
    [MaintenancePriority.LOW]: 'Low',
  };

  return labels[priority];
}

/**
 * Get maintenance category label
 */
export function getMaintenanceCategoryLabel(category: MaintenanceCategory): string {
  const labels: Record<MaintenanceCategory, string> = {
    [MaintenanceCategory.PLUMBING]: 'Plumbing',
    [MaintenanceCategory.ELECTRICAL]: 'Electrical',
    [MaintenanceCategory.HVAC]: 'HVAC',
    [MaintenanceCategory.CARPENTRY]: 'Carpentry',
    [MaintenanceCategory.PAINTING]: 'Painting',
    [MaintenanceCategory.GENERAL]: 'General',
    [MaintenanceCategory.CLEANING]: 'Cleaning',
    [MaintenanceCategory.SECURITY]: 'Security',
    [MaintenanceCategory.LANDSCAPING]: 'Landscaping',
  };

  return labels[category];
}

/**
 * Get skill level label
 */
export function getSkillLevelLabel(level: SkillLevel): string {
  const labels: Record<SkillLevel, string> = {
    [SkillLevel.BEGINNER]: 'Beginner',
    [SkillLevel.INTERMEDIATE]: 'Intermediate',
    [SkillLevel.ADVANCED]: 'Advanced',
    [SkillLevel.EXPERT]: 'Expert',
  };

  return labels[level];
}

/**
 * Calculate assignment statistics
 */
export function calculateAssignmentStatistics(
  assignments: Array<{ request: MaintenanceRequest; assignment: AssignmentResult | null }>
): {
  totalRequests: number;
  assigned: number;
  unassigned: number;
  averageMatchScore: number;
  totalEstimatedCost: number;
  byPriority: Record<MaintenancePriority, number>;
} {
  const assigned = assignments.filter(a => a.assignment !== null).length;
  const unassigned = assignments.filter(a => a.assignment === null).length;
  
  const matchScores = assignments
    .filter(a => a.assignment !== null)
    .map(a => a.assignment!.matchScore);
  
  const averageMatchScore = matchScores.length > 0
    ? matchScores.reduce((sum, score) => sum + score, 0) / matchScores.length
    : 0;
  
  const totalEstimatedCost = assignments
    .filter(a => a.assignment !== null)
    .reduce((sum, a) => sum + a.assignment!.estimatedCost, 0);
  
  const byPriority: Record<MaintenancePriority, number> = {
    [MaintenancePriority.EMERGENCY]: 0,
    [MaintenancePriority.HIGH]: 0,
    [MaintenancePriority.MEDIUM]: 0,
    [MaintenancePriority.LOW]: 0,
  };
  
  for (const { request } of assignments) {
    byPriority[request.priority]++;
  }
  
  return {
    totalRequests: assignments.length,
    assigned,
    unassigned,
    averageMatchScore,
    totalEstimatedCost,
    byPriority,
  };
}
