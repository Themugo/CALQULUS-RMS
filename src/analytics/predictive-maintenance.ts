/**
 * Predictive Maintenance Analytics
 * 
 * Predicts maintenance needs and optimizes maintenance schedules:
 * - Equipment failure prediction
 * - Maintenance scheduling optimization
 * - Cost forecasting
 * - Vendor performance analysis
 * - Work order prioritization
 * - Preventive maintenance planning
 */

export interface Equipment {
  id: string;
  name: string;
  type: 'hvac' | 'plumbing' | 'electrical' | 'appliance' | 'structural' | 'other';
  propertyId: string;
  unitId?: string;
  installDate: Date;
  lastMaintenanceDate: Date;
  expectedLifespan: number; // in months
  manufacturer: string;
  model: string;
  serialNumber?: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  usage: number; // hours per month
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  date: Date;
  type: 'preventive' | 'corrective' | 'emergency';
  description: string;
  cost: number;
  duration: number; // in hours
  vendorId: string;
  technician: string;
  partsUsed: Part[];
  outcome: 'resolved' | 'partial' | 'failed';
  followUpRequired: boolean;
}

export interface Part {
  name: string;
  quantity: number;
  cost: number;
}

export interface WorkOrder {
  id: string;
  equipmentId: string;
  propertyId: string;
  unitId?: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  type: 'preventive' | 'corrective' | 'emergency';
  description: string;
  requestedDate: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  estimatedCost: number;
  actualCost?: number;
  vendorId: string;
  assignedTechnician?: string;
}

export interface MaintenancePrediction {
  equipmentId: string;
  equipmentName: string;
  propertyId: string;
  predictedFailureDate: Date;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
  recommendedMaintenanceDate: Date;
  estimatedCost: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  factor: string;
  impact: number;
  description: string;
  value: number | string;
}

export interface MaintenanceSchedule {
  workOrders: ScheduledWorkOrder[];
  totalCost: number;
  totalDuration: number;
  vendorUtilization: VendorUtilization[];
  optimizationScore: number;
}

export interface ScheduledWorkOrder {
  workOrderId: string;
  scheduledDate: Date;
  estimatedDuration: number;
  estimatedCost: number;
  vendorId: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
}

export interface VendorUtilization {
  vendorId: string;
  vendorName: string;
  scheduledWorkOrders: number;
  totalHours: number;
  utilizationRate: number;
  capacity: number;
}

export interface CostForecast {
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  predictedCost: number;
  costBreakdown: CostBreakdown[];
  trend: 'increasing' | 'stable' | 'decreasing';
  confidence: number;
}

export interface CostBreakdown {
  category: string;
  predictedCost: number;
  percentage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export class PredictiveMaintenanceAnalytics {
  private equipment: Map<string, Equipment>;
  private maintenanceRecords: MaintenanceRecord[];
  private workOrders: WorkOrder[];

  constructor(
    equipment: Equipment[],
    maintenanceRecords: MaintenanceRecord[],
    workOrders: WorkOrder[]
  ) {
    this.equipment = new Map(equipment.map(e => [e.id, e]));
    this.maintenanceRecords = maintenanceRecords;
    this.workOrders = workOrders;
  }

  /**
   * Predict maintenance needs for all equipment
   */
  predictMaintenanceNeeds(): MaintenancePrediction[] {
    const predictions: MaintenancePrediction[] = [];

    this.equipment.forEach((equipment, equipmentId) => {
      const prediction = this.predictEquipmentFailure(equipment);
      if (prediction) {
        predictions.push(prediction);
      }
    });

    return predictions.sort((a, b) => a.predictedFailureDate.getTime() - b.predictedFailureDate.getTime());
  }

  /**
   * Predict failure for specific equipment
   */
  private predictEquipmentFailure(equipment: Equipment): MaintenancePrediction | null {
    const factors: PredictionFactor[] = [];
    let riskScore = 0;

    // Age factor
    const ageInMonths = (Date.now() - equipment.installDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const agePercentage = (ageInMonths / equipment.expectedLifespan) * 100;
    
    if (agePercentage > 80) {
      riskScore += 30;
      factors.push({
        factor: 'Equipment Age',
        impact: 30,
        description: `Equipment is ${agePercentage.toFixed(1)}% through expected lifespan`,
        value: agePercentage
      });
    } else if (agePercentage > 60) {
      riskScore += 15;
      factors.push({
        factor: 'Equipment Age',
        impact: 15,
        description: `Equipment is ${agePercentage.toFixed(1)}% through expected lifespan`,
        value: agePercentage
      });
    }

    // Condition factor
    const conditionScores = {
      excellent: 0,
      good: 10,
      fair: 25,
      poor: 50,
      critical: 80
    };
    riskScore += conditionScores[equipment.condition];
    
    if (equipment.condition !== 'excellent') {
      factors.push({
        factor: 'Equipment Condition',
        impact: conditionScores[equipment.condition],
        description: `Equipment condition is ${equipment.condition}`,
        value: equipment.condition
      });
    }

    // Maintenance history factor
    const equipmentMaintenance = this.maintenanceRecords.filter(r => r.equipmentId === equipment.id);
    const recentMaintenance = equipmentMaintenance.filter(r => {
      const monthsSinceMaintenance = (Date.now() - r.date.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsSinceMaintenance < 6;
    });

    if (recentMaintenance.length === 0 && ageInMonths > 12) {
      riskScore += 20;
      factors.push({
        factor: 'Maintenance History',
        impact: 20,
        description: 'No recent maintenance performed',
        value: 0
      });
    }

    // Failure history factor
    const failures = equipmentMaintenance.filter(r => r.outcome === 'failed');
    if (failures.length > 0) {
      riskScore += failures.length * 15;
      factors.push({
        factor: 'Failure History',
        impact: failures.length * 15,
        description: `${failures.length} previous failure(s) recorded`,
        value: failures.length
      });
    }

    // Usage factor
    const avgUsage = 200; // hours per month baseline
    if (equipment.usage > avgUsage * 1.5) {
      riskScore += 15;
      factors.push({
        factor: 'Usage Level',
        impact: 15,
        description: `High usage: ${equipment.usage} hours/month`,
        value: equipment.usage
      });
    }

    // Criticality factor
    const criticalityMultiplier = {
      low: 0.8,
      medium: 1.0,
      high: 1.2,
      critical: 1.5
    };
    riskScore *= criticalityMultiplier[equipment.criticality];

    // Calculate predicted failure date
    const monthsToFailure = Math.max(1, (100 - riskScore) / 10);
    const predictedFailureDate = new Date(Date.now() + monthsToFailure * 30 * 24 * 60 * 60 * 1000);

    // Determine risk level
    const riskLevel = this.getRiskLevel(riskScore);

    // Calculate confidence
    const confidence = Math.min(50 + (factors.length * 10) + (agePercentage > 50 ? 10 : 0), 95);

    // Generate recommended action
    const recommendedAction = this.generateRecommendedAction(equipment, riskLevel, factors);

    // Calculate recommended maintenance date
    const recommendedMaintenanceDate = new Date(predictedFailureDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Estimate cost
    const estimatedCost = this.estimateMaintenanceCost(equipment, riskLevel);

    return {
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      propertyId: equipment.propertyId,
      predictedFailureDate,
      confidence,
      riskLevel,
      recommendedAction,
      recommendedMaintenanceDate,
      estimatedCost,
      factors
    };
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 30) return 'low';
    if (score < 50) return 'medium';
    if (score < 70) return 'high';
    return 'critical';
  }

  /**
   * Generate recommended action
   */
  private generateRecommendedAction(
    equipment: Equipment,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    factors: PredictionFactor[]
  ): string {
    if (riskLevel === 'critical') {
      return `Immediate inspection and replacement recommended. Equipment shows critical failure risk factors.`;
    } else if (riskLevel === 'high') {
      return `Schedule maintenance within 2 weeks. Equipment shows elevated failure risk.`;
    } else if (riskLevel === 'medium') {
      return `Schedule preventive maintenance within 1 month. Monitor equipment closely.`;
    } else {
      return `Continue regular maintenance schedule. Equipment operating within normal parameters.`;
    }
  }

  /**
   * Estimate maintenance cost
   */
  private estimateMaintenanceCost(equipment: Equipment, riskLevel: 'low' | 'medium' | 'high' | 'critical'): number {
    const baseCosts = {
      hvac: 500,
      plumbing: 300,
      electrical: 400,
      appliance: 200,
      structural: 1000,
      other: 250
    };

    const riskMultipliers = {
      low: 1.0,
      medium: 1.5,
      high: 2.0,
      critical: 3.0
    };

    return baseCosts[equipment.type] * riskMultipliers[riskLevel];
  }

  /**
   * Optimize maintenance schedule
   */
  optimizeMaintenanceSchedule(
    startDate: Date,
    endDate: Date,
    vendors: { id: string; name: string; capacity: number; hourlyRate: number }[]
  ): MaintenanceSchedule {
    const predictions = this.predictMaintenanceNeeds();
    const pendingWorkOrders = this.workOrders.filter(wo => wo.status === 'pending' || wo.status === 'scheduled');

    // Combine predictions and pending work orders
    const allMaintenanceItems = [
      ...predictions.map(p => ({
        type: 'prediction' as const,
        prediction: p,
        priority: p.riskLevel === 'critical' ? 'emergency' : p.riskLevel === 'high' ? 'high' : p.riskLevel === 'medium' ? 'medium' : 'low',
        estimatedDuration: this.estimateMaintenanceDuration(p.equipmentId),
        estimatedCost: p.estimatedCost
      })),
      ...pendingWorkOrders.map(wo => ({
        type: 'workorder' as const,
        workOrder: wo,
        priority: wo.priority,
        estimatedDuration: this.estimateWorkOrderDuration(wo),
        estimatedCost: wo.estimatedCost
      }))
    ];

    // Sort by priority and recommended date
    allMaintenanceItems.sort((a, b) => {
      const priorityOrder = { emergency: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      const dateA = a.type === 'prediction' ? a.prediction.recommendedMaintenanceDate : a.workOrder.requestedDate;
      const dateB = b.type === 'prediction' ? b.prediction.recommendedMaintenanceDate : b.workOrder.requestedDate;
      
      return dateA.getTime() - dateB.getTime();
    });

    // Schedule work orders
    const scheduledWorkOrders: ScheduledWorkOrder[] = [];
    const vendorCapacity = new Map(vendors.map(v => [v.id, v.capacity]));
    const currentDate = new Date(startDate);

    allMaintenanceItems.forEach(item => {
      // Find available vendor
      const availableVendor = vendors.find(v => (vendorCapacity.get(v.id) || 0) >= item.estimatedDuration);
      
      if (availableVendor && currentDate <= endDate) {
        const workOrderId = item.type === 'prediction' ? `pred-${item.prediction.equipmentId}` : item.workOrder.id;
        
        scheduledWorkOrders.push({
          workOrderId,
          scheduledDate: new Date(currentDate),
          estimatedDuration: item.estimatedDuration,
          estimatedCost: item.estimatedCost,
          vendorId: availableVendor.id,
          priority: item.priority
        });

        // Update vendor capacity
        vendorCapacity.set(availableVendor.id, (vendorCapacity.get(availableVendor.id) || 0) - item.estimatedDuration);

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Calculate vendor utilization
    const vendorUtilization: VendorUtilization[] = vendors.map(vendor => {
      const vendorWorkOrders = scheduledWorkOrders.filter(wo => wo.vendorId === vendor.id);
      const totalHours = vendorWorkOrders.reduce((sum, wo) => sum + wo.estimatedDuration, 0);
      const utilizationRate = totalHours / vendor.capacity;

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        scheduledWorkOrders: vendorWorkOrders.length,
        totalHours,
        utilizationRate,
        capacity: vendor.capacity
      };
    });

    // Calculate totals
    const totalCost = scheduledWorkOrders.reduce((sum, wo) => sum + wo.estimatedCost, 0);
    const totalDuration = scheduledWorkOrders.reduce((sum, wo) => sum + wo.estimatedDuration, 0);

    // Calculate optimization score
    const avgUtilization = vendorUtilization.reduce((sum, v) => sum + v.utilizationRate, 0) / vendorUtilization.length;
    const optimizationScore = Math.min(avgUtilization * 100, 100);

    return {
      workOrders: scheduledWorkOrders,
      totalCost,
      totalDuration,
      vendorUtilization,
      optimizationScore
    };
  }

  /**
   * Estimate maintenance duration
   */
  private estimateMaintenanceDuration(equipmentId: string): number {
    const equipment = this.equipment.get(equipmentId);
    if (!equipment) return 4; // default 4 hours

    const baseDurations = {
      hvac: 6,
      plumbing: 3,
      electrical: 4,
      appliance: 2,
      structural: 8,
      other: 4
    };

    const conditionMultipliers = {
      excellent: 0.8,
      good: 1.0,
      fair: 1.2,
      poor: 1.5,
      critical: 2.0
    };

    return baseDurations[equipment.type] * conditionMultipliers[equipment.condition];
  }

  /**
   * Estimate work order duration
   */
  private estimateWorkOrderDuration(workOrder: WorkOrder): number {
    const equipment = this.equipment.get(workOrder.equipmentId);
    if (!equipment) return 4;

    const baseDuration = this.estimateMaintenanceDuration(workOrder.equipmentId);
    const typeMultiplier = workOrder.type === 'emergency' ? 1.5 : workOrder.type === 'corrective' ? 1.2 : 1.0;

    return baseDuration * typeMultiplier;
  }

  /**
   * Forecast maintenance costs
   */
  forecastMaintenanceCosts(
    period: 'monthly' | 'quarterly' | 'yearly',
    startDate: Date,
    endDate: Date
  ): CostForecast {
    const predictions = this.predictMaintenanceNeeds();
    
    // Filter predictions within the forecast period
    const periodPredictions = predictions.filter(p => {
      return p.recommendedMaintenanceDate >= startDate && p.recommendedMaintenanceDate <= endDate;
    });

    // Calculate predicted cost
    const predictedCost = periodPredictions.reduce((sum, p) => sum + p.estimatedCost, 0);

    // Group by category
    const categoryMap = new Map<string, number>();
    periodPredictions.forEach(p => {
      const equipment = this.equipment.get(p.equipmentId);
      if (equipment) {
        const current = categoryMap.get(equipment.type) || 0;
        categoryMap.set(equipment.type, current + p.estimatedCost);
      }
    });

    const costBreakdown: CostBreakdown[] = Array.from(categoryMap.entries()).map(([category, cost]) => ({
      category,
      predictedCost: cost,
      percentage: (cost / predictedCost) * 100,
      trend: 'stable' // Would be calculated from historical data
    }));

    // Determine trend
    const historicalCost = this.getHistoricalCost(period);
    const trend = predictedCost > historicalCost * 1.1 ? 'increasing' : predictedCost < historicalCost * 0.9 ? 'decreasing' : 'stable';

    // Calculate confidence
    const confidence = Math.min(70 + (periodPredictions.length * 2), 95);

    return {
      period,
      startDate,
      endDate,
      predictedCost,
      costBreakdown,
      trend,
      confidence
    };
  }

  /**
   * Get historical cost for period
   */
  private getHistoricalCost(period: 'monthly' | 'quarterly' | 'yearly'): number {
    const periodMultipliers = {
      monthly: 1,
      quarterly: 3,
      yearly: 12
    };

    const avgMonthlyCost = this.maintenanceRecords.reduce((sum, r) => sum + r.cost, 0) / 12;
    return avgMonthlyCost * periodMultipliers[period];
  }

  /**
   * Analyze vendor performance
   */
  analyzeVendorPerformance(vendorId: string): {
    vendorId: string;
    totalWorkOrders: number;
    completedWorkOrders: number;
    averageResponseTime: number;
    averageCompletionTime: number;
    averageCost: number;
    successRate: number;
    onTimeCompletionRate: number;
    performanceScore: number;
    strengths: string[];
    weaknesses: string[];
  } {
    const vendorWorkOrders = this.workOrders.filter(wo => wo.vendorId === vendorId);
    const vendorMaintenance = this.maintenanceRecords.filter(r => r.vendorId === vendorId);

    const totalWorkOrders = vendorWorkOrders.length;
    const completedWorkOrders = vendorWorkOrders.filter(wo => wo.status === 'completed').length;

    // Calculate response time
    const responseTimes = vendorWorkOrders
      .filter(wo => wo.scheduledDate && wo.requestedDate)
      .map(wo => (wo.scheduledDate!.getTime() - wo.requestedDate.getTime()) / (1000 * 60 * 60 * 24));
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length 
      : 0;

    // Calculate completion time
    const completionTimes = vendorWorkOrders
      .filter(wo => wo.completedDate && wo.scheduledDate)
      .map(wo => (wo.completedDate!.getTime() - wo.scheduledDate!.getTime()) / (1000 * 60 * 60 * 24));
    const averageCompletionTime = completionTimes.length > 0 
      ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length 
      : 0;

    // Calculate average cost
    const averageCost = vendorMaintenance.length > 0 
      ? vendorMaintenance.reduce((sum, r) => sum + r.cost, 0) / vendorMaintenance.length 
      : 0;

    // Calculate success rate
    const successfulMaintenance = vendorMaintenance.filter(r => r.outcome === 'resolved').length;
    const successRate = vendorMaintenance.length > 0 ? (successfulMaintenance / vendorMaintenance.length) * 100 : 0;

    // Calculate on-time completion rate
    const onTimeCompletions = vendorWorkOrders.filter(wo => {
      if (!wo.completedDate || !wo.scheduledDate) return false;
      return wo.completedDate <= wo.scheduledDate;
    }).length;
    const onTimeCompletionRate = completedWorkOrders > 0 ? (onTimeCompletions / completedWorkOrders) * 100 : 0;

    // Calculate performance score
    const performanceScore = (
      (successRate * 0.3) +
      (onTimeCompletionRate * 0.3) +
      ((100 - Math.min(averageResponseTime * 10, 100)) * 0.2) +
      ((100 - Math.min(averageCompletionTime * 5, 100)) * 0.2)
    );

    // Identify strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (successRate > 90) strengths.push('High success rate');
    if (successRate < 80) weaknesses.push('Low success rate');
    if (onTimeCompletionRate > 90) strengths.push('Excellent on-time completion');
    if (onTimeCompletionRate < 80) weaknesses.push('Poor on-time completion');
    if (averageResponseTime < 2) strengths.push('Fast response time');
    if (averageResponseTime > 5) weaknesses.push('Slow response time');
    if (averageCost < 500) strengths.push('Cost-effective');
    if (averageCost > 1000) weaknesses.push('High costs');

    return {
      vendorId,
      totalWorkOrders,
      completedWorkOrders,
      averageResponseTime,
      averageCompletionTime,
      averageCost,
      successRate,
      onTimeCompletionRate,
      performanceScore,
      strengths,
      weaknesses
    };
  }

  /**
   * Prioritize work orders
   */
  prioritizeWorkOrders(): {
    workOrders: { workOrder: WorkOrder; priorityScore: number; recommendedAction: string }[];
  } {
    const pendingWorkOrders = this.workOrders.filter(wo => wo.status === 'pending');

    const prioritized = pendingWorkOrders.map(workOrder => {
      let priorityScore = 0;

      // Base priority
      const priorityScores = { low: 10, medium: 30, high: 60, emergency: 90 };
      priorityScore += priorityScores[workOrder.priority];

      // Equipment criticality
      const equipment = this.equipment.get(workOrder.equipmentId);
      if (equipment) {
        const criticalityScores = { low: 5, medium: 10, high: 20, critical: 30 };
        priorityScore += criticalityScores[equipment.criticality];

        // Equipment condition
        const conditionScores = { excellent: 0, good: 5, fair: 10, poor: 20, critical: 30 };
        priorityScore += conditionScores[equipment.condition];
      }

      // Time since request
      const daysSinceRequest = (Date.now() - workOrder.requestedDate.getTime()) / (1000 * 60 * 60 * 24);
      priorityScore += Math.min(daysSinceRequest * 2, 20);

      // Type of maintenance
      const typeScores = { preventive: 5, corrective: 15, emergency: 30 };
      priorityScore += typeScores[workOrder.type];

      // Generate recommended action
      const recommendedAction = this.generateWorkOrderAction(priorityScore, workOrder);

      return {
        workOrder,
        priorityScore,
        recommendedAction
      };
    });

    return {
      workOrders: prioritized.sort((a, b) => b.priorityScore - a.priorityScore)
    };
  }

  /**
   * Generate work order action
   */
  private generateWorkOrderAction(priorityScore: number, workOrder: WorkOrder): string {
    if (priorityScore > 80) {
      return 'Schedule immediately - high priority work order';
    } else if (priorityScore > 60) {
      return 'Schedule within 24-48 hours';
    } else if (priorityScore > 40) {
      return 'Schedule within 1 week';
    } else {
      return 'Schedule during next available maintenance window';
    }
  }

  /**
   * Get equipment health summary
   */
  getEquipmentHealthSummary(): {
    totalEquipment: number;
    byCondition: Record<string, number>;
    byType: Record<string, number>;
    byCriticality: Record<string, number>;
    averageAge: number;
    maintenanceBacklog: number;
    upcomingMaintenance: number;
  } {
    const equipmentArray = Array.from(this.equipment.values());

    const byCondition: Record<string, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      critical: 0
    };

    const byType: Record<string, number> = {
      hvac: 0,
      plumbing: 0,
      electrical: 0,
      appliance: 0,
      structural: 0,
      other: 0
    };

    const byCriticality: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    let totalAge = 0;

    equipmentArray.forEach(equipment => {
      byCondition[equipment.condition]++;
      byType[equipment.type]++;
      byCriticality[equipment.criticality]++;

      const ageInMonths = (Date.now() - equipment.installDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      totalAge += ageInMonths;
    });

    const predictions = this.predictMaintenanceNeeds();
    const upcomingMaintenance = predictions.filter(p => {
      const daysUntilMaintenance = (p.recommendedMaintenanceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilMaintenance <= 30;
    }).length;

    const maintenanceBacklog = this.workOrders.filter(wo => wo.status === 'pending').length;

    return {
      totalEquipment: equipmentArray.length,
      byCondition,
      byType,
      byCriticality,
      averageAge: totalAge / equipmentArray.length,
      maintenanceBacklog,
      upcomingMaintenance
    };
  }
}
