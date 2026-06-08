/**
 * Ecosystem Participant Management
 * 
 * Unified management system for all marketplace participants:
 * - Participant onboarding and verification
 * - Performance tracking and ratings
 * - Relationship management
 * - Contract and agreement management
 * - Compliance monitoring
 * - Participant analytics and insights
 */

import { Contractor } from './contractor-network';
import { FinancialPartner } from './financial-partners';
import { InsuranceProvider } from './insurers';
import { UtilityProvider } from './utility-providers';

export type ParticipantType = 'contractor' | 'financial_partner' | 'insurer' | 'utility_provider';

export interface EcosystemParticipant {
  id: string;
  type: ParticipantType;
  participantId: string; // Reference to specific participant type
  name: string;
  email: string;
  phone: string;
  businessRegistrationNumber: string;
  taxId: string;
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  onboardingStatus: 'pending' | 'in_progress' | 'verified' | 'active' | 'suspended' | 'terminated';
  verificationStatus: {
    business: boolean;
    tax: boolean;
    insurance: boolean;
    licenses: boolean;
    background: boolean;
  };
  complianceStatus: 'compliant' | 'non_compliant' | 'under_review';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  performanceScore: number;
  relationshipScore: number;
  totalRevenue: number;
  totalVolume: number;
  agreements: Agreement[];
  contracts: Contract[];
  complianceRecords: ComplianceRecord[];
  performanceMetrics: PerformanceMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agreement {
  id: string;
  type: 'service' | 'partnership' | 'integration' | 'commission';
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  terms: string[];
  commissionRate?: number;
  serviceLevelAgreement?: SLA;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  signedAt?: Date;
  signedBy?: string;
}

export interface SLA {
  responseTime: number; // in hours
  resolutionTime: number; // in hours
  uptime: number; // percentage
  qualityScore: number; // minimum score
}

export interface Contract {
  id: string;
  type: 'master_service' | 'project' | 'retainer' | 'commission';
  title: string;
  description: string;
  value: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  paymentTerms: string;
  deliverables: string[];
  milestones: Milestone[];
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'terminated';
  signedAt?: Date;
  signedBy?: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate: Date;
  value: number;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completedAt?: Date;
}

export interface ComplianceRecord {
  id: string;
  type: 'license' | 'insurance' | 'tax' | 'regulatory' | 'background';
  description: string;
  status: 'compliant' | 'non_compliant' | 'expiring' | 'expired';
  expiryDate?: Date;
  lastVerified: Date;
  documents: string[];
  notes?: string;
}

export interface PerformanceMetrics {
  totalJobs: number;
  completedJobs: number;
  onTimeCompletionRate: number;
  qualityScore: number;
  responseTime: number;
  customerSatisfaction: number;
  revenueGenerated: number;
  volume: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export class EcosystemParticipantManagement {
  private participants: Map<string, EcosystemParticipant>;
  private relationships: Map<string, Relationship[]>;
  private notifications: Map<string, Notification[]>;

  constructor() {
    this.participants = new Map();
    this.relationships = new Map();
    this.notifications = new Map();
  }

  /**
   * Register a new ecosystem participant
   */
  registerParticipant(participantData: Omit<EcosystemParticipant, 'id' | 'onboardingStatus' | 'verificationStatus' | 'complianceStatus' | 'riskLevel' | 'performanceScore' | 'relationshipScore' | 'totalRevenue' | 'totalVolume' | 'agreements' | 'contracts' | 'complianceRecords' | 'performanceMetrics' | 'createdAt' | 'updatedAt'>): EcosystemParticipant {
    const participant: EcosystemParticipant = {
      ...participantData,
      id: this.generateId(),
      onboardingStatus: 'pending',
      verificationStatus: {
        business: false,
        tax: false,
        insurance: false,
        licenses: false,
        background: false
      },
      complianceStatus: 'under_review',
      riskLevel: 'medium',
      performanceScore: 0,
      relationshipScore: 0,
      totalRevenue: 0,
      totalVolume: 0,
      agreements: [],
      contracts: [],
      complianceRecords: [],
      performanceMetrics: {
        totalJobs: 0,
        completedJobs: 0,
        onTimeCompletionRate: 0,
        qualityScore: 0,
        responseTime: 0,
        customerSatisfaction: 0,
        revenueGenerated: 0,
        volume: 0,
        period: {
          startDate: new Date(),
          endDate: new Date()
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.participants.set(participant.id, participant);
    this.initiateOnboarding(participant.id);
    return participant;
  }

  /**
   * Initiate onboarding process
   */
  private initiateOnboarding(participantId: string): void {
    const participant = this.participants.get(participantId);
    if (!participant) return;

    participant.onboardingStatus = 'in_progress';
    participant.updatedAt = new Date();

    this.participants.set(participantId, participant);

    // Send onboarding notifications
    this.sendNotification(participantId, {
      type: 'onboarding_started',
      title: 'Onboarding Process Started',
      message: 'Your onboarding process has been initiated. Please complete the required verification steps.',
      priority: 'high',
      id: '',
      sentAt: new Date(),
      read: false
    });
  }

  /**
   * Update verification status
   */
  updateVerificationStatus(participantId: string, verificationData: {
    business?: boolean;
    tax?: boolean;
    insurance?: boolean;
    licenses?: boolean;
    background?: boolean;
  }): EcosystemParticipant {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    Object.assign(participant.verificationStatus, verificationData);
    participant.updatedAt = new Date();

    // Check if all verifications are complete
    const allVerified = Object.values(participant.verificationStatus).every(v => v);
    if (allVerified) {
      participant.onboardingStatus = 'verified';
      this.sendNotification(participantId, {
        type: 'verification_complete',
        title: 'Verification Complete',
        message: 'All verification steps have been completed successfully.',
        priority: 'high',
        id: '',
        sentAt: new Date(),
        read: false
      });
    }

    this.participants.set(participantId, participant);
    return participant;
  }

  /**
   * Activate participant
   */
  activateParticipant(participantId: string): EcosystemParticipant {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    if (participant.onboardingStatus !== 'verified') {
      throw new Error('Participant must be verified before activation');
    }

    participant.onboardingStatus = 'active';
    participant.complianceStatus = 'compliant';
    participant.updatedAt = new Date();

    this.participants.set(participantId, participant);

    // Create default agreement
    this.createDefaultAgreement(participantId);

    return participant;
  }

  /**
   * Create default agreement
   */
  private createDefaultAgreement(participantId: string): Agreement {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    const agreement: Agreement = {
      id: this.generateId(),
      type: 'service',
      title: 'Standard Service Agreement',
      description: 'Default service agreement for marketplace participation',
      startDate: new Date(),
      terms: [
        'Adhere to marketplace service standards',
        'Maintain required certifications and insurance',
        'Respond to requests within specified SLA',
        'Provide quality services as agreed',
        'Comply with all applicable regulations'
      ],
      status: 'active',
      signedAt: new Date(),
      signedBy: 'RentFlow'
    };

    participant.agreements.push(agreement);
    participant.updatedAt = new Date();

    this.participants.set(participantId, participant);
    return agreement;
  }

  /**
   * Add compliance record
   */
  addComplianceRecord(participantId: string, recordData: Omit<ComplianceRecord, 'id' | 'lastVerified'>): ComplianceRecord {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    const record: ComplianceRecord = {
      ...recordData,
      id: this.generateId(),
      lastVerified: new Date()
    };

    participant.complianceRecords.push(record);
    participant.updatedAt = new Date();

    // Update compliance status
    this.updateComplianceStatus(participantId);

    this.participants.set(participantId, participant);
    return record;
  }

  /**
   * Update compliance status
   */
  private updateComplianceStatus(participantId: string): void {
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const nonCompliantRecords = participant.complianceRecords.filter(r => r.status === 'non_compliant' || r.status === 'expired');
    
    if (nonCompliantRecords.length > 0) {
      participant.complianceStatus = 'non_compliant';
      participant.riskLevel = 'high';
    } else {
      participant.complianceStatus = 'compliant';
      participant.riskLevel = 'low';
    }

    participant.updatedAt = new Date();
    this.participants.set(participantId, participant);
  }

  /**
   * Add agreement
   */
  addAgreement(participantId: string, agreementData: Omit<Agreement, 'id' | 'status'>): Agreement {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    const agreement: Agreement = {
      ...agreementData,
      id: this.generateId(),
      status: 'draft'
    };

    participant.agreements.push(agreement);
    participant.updatedAt = new Date();

    this.participants.set(participantId, participant);
    return agreement;
  }

  /**
   * Sign agreement
   */
  signAgreement(participantId: string, agreementId: string, signedBy: string): Agreement {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    const agreement = participant.agreements.find(a => a.id === agreementId);
    if (!agreement) {
      throw new Error(`Agreement ${agreementId} not found`);
    }

    agreement.status = 'active';
    agreement.signedAt = new Date();
    agreement.signedBy = signedBy;

    participant.updatedAt = new Date();
    this.participants.set(participantId, participant);

    return agreement;
  }

  /**
   * Add contract
   */
  addContract(participantId: string, contractData: Omit<Contract, 'id' | 'status'>): Contract {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    const contract: Contract = {
      ...contractData,
      id: this.generateId(),
      status: 'draft'
    };

    participant.contracts.push(contract);
    participant.updatedAt = new Date();

    this.participants.set(participantId, participant);
    return contract;
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(participantId: string, metrics: Partial<PerformanceMetrics>): EcosystemParticipant {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    Object.assign(participant.performanceMetrics, metrics);

    // Calculate overall performance score
    const onTimeScore = participant.performanceMetrics.onTimeCompletionRate * 0.3;
    const qualityScore = participant.performanceMetrics.qualityScore * 0.3;
    const satisfactionScore = participant.performanceMetrics.customerSatisfaction * 0.2;
    const responseScore = (100 - Math.min(participant.performanceMetrics.responseTime * 10, 100)) * 0.2;

    participant.performanceScore = onTimeScore + qualityScore + satisfactionScore + responseScore;
    participant.updatedAt = new Date();

    this.participants.set(participantId, participant);
    return participant;
  }

  /**
   * Create relationship between participants
   */
  createRelationship(participantId1: string, participantId2: string, relationshipData: {
    type: 'partnership' | 'collaboration' | 'referral' | 'subcontractor';
    description: string;
    startDate: Date;
    endDate?: Date;
  }): Relationship {
    const relationship: Relationship = {
      id: this.generateId(),
      participantId1,
      participantId2,
      ...relationshipData,
      status: 'active'
    };

    const relationships1 = this.relationships.get(participantId1) || [];
    relationships1.push(relationship);
    this.relationships.set(participantId1, relationships1);

    const relationships2 = this.relationships.get(participantId2) || [];
    relationships2.push(relationship);
    this.relationships.set(participantId2, relationships2);

    return relationship;
  }

  /**
   * Get participants by type
   */
  getParticipants(filters?: {
    type?: ParticipantType;
    onboardingStatus?: EcosystemParticipant['onboardingStatus'];
    complianceStatus?: EcosystemParticipant['complianceStatus'];
    riskLevel?: EcosystemParticipant['riskLevel'];
    minPerformanceScore?: number;
    region?: string;
  }): EcosystemParticipant[] {
    let participants = Array.from(this.participants.values());

    if (filters) {
      if (filters.type) {
        participants = participants.filter(p => p.type === filters.type);
      }

      if (filters.onboardingStatus) {
        participants = participants.filter(p => p.onboardingStatus === filters.onboardingStatus);
      }

      if (filters.complianceStatus) {
        participants = participants.filter(p => p.complianceStatus === filters.complianceStatus);
      }

      if (filters.riskLevel) {
        participants = participants.filter(p => p.riskLevel === filters.riskLevel);
      }

      if (filters.minPerformanceScore) {
        participants = participants.filter(p => p.performanceScore >= filters.minPerformanceScore!);
      }

      if (filters.region) {
        participants = participants.filter(p => p.address.region === filters.region);
      }
    }

    return participants.sort((a, b) => b.performanceScore - a.performanceScore);
  }

  /**
   * Get participant relationships
   */
  getParticipantRelationships(participantId: string): Relationship[] {
    return this.relationships.get(participantId) || [];
  }

  /**
   * Get participant analytics
   */
  getParticipantAnalytics(participantId: string): {
    participant: EcosystemParticipant;
    relationships: Relationship[];
    activeAgreements: number;
    activeContracts: number;
    complianceScore: number;
    riskFactors: string[];
    recommendations: string[];
  } {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    const relationships = this.getParticipantRelationships(participantId);
    const activeAgreements = participant.agreements.filter(a => a.status === 'active').length;
    const activeContracts = participant.contracts.filter(c => c.status === 'active').length;

    // Calculate compliance score
    const compliantRecords = participant.complianceRecords.filter(r => r.status === 'compliant').length;
    const complianceScore = participant.complianceRecords.length > 0 
      ? (compliantRecords / participant.complianceRecords.length) * 100 
      : 100;

    // Identify risk factors
    const riskFactors: string[] = [];
    if (participant.complianceStatus === 'non_compliant') {
      riskFactors.push('Non-compliant with regulatory requirements');
    }
    if (participant.performanceScore < 60) {
      riskFactors.push('Low performance score');
    }
    if (participant.riskLevel === 'high' || participant.riskLevel === 'critical') {
      riskFactors.push('High risk level');
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (participant.performanceScore < 70) {
      recommendations.push('Implement performance improvement plan');
    }
    if (complianceScore < 80) {
      recommendations.push('Address compliance issues immediately');
    }
    if (activeAgreements === 0) {
      recommendations.push('Establish service agreements');
    }

    return {
      participant,
      relationships,
      activeAgreements,
      activeContracts,
      complianceScore,
      riskFactors,
      recommendations
    };
  }

  /**
   * Get ecosystem overview
   */
  getEcosystemOverview(): {
    totalParticipants: number;
    activeParticipants: number;
    pendingOnboarding: number;
    nonCompliant: number;
    highRisk: number;
    typeDistribution: { type: string; count: number }[];
    regionalDistribution: { region: string; count: number }[];
    averagePerformanceScore: number;
    totalRevenue: number;
    totalVolume: number;
  } {
    const participants = Array.from(this.participants.values());

    const activeParticipants = participants.filter(p => p.onboardingStatus === 'active').length;
    const pendingOnboarding = participants.filter(p => p.onboardingStatus === 'pending' || p.onboardingStatus === 'in_progress').length;
    const nonCompliant = participants.filter(p => p.complianceStatus === 'non_compliant').length;
    const highRisk = participants.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length;

    const averagePerformanceScore = participants.length > 0
      ? participants.reduce((sum, p) => sum + p.performanceScore, 0) / participants.length
      : 0;

    const totalRevenue = participants.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalVolume = participants.reduce((sum, p) => sum + p.totalVolume, 0);

    // Type distribution
    const typeMap = new Map<string, number>();
    participants.forEach(p => {
      const current = typeMap.get(p.type) || 0;
      typeMap.set(p.type, current + 1);
    });

    const typeDistribution = Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }));

    // Regional distribution
    const regionMap = new Map<string, number>();
    participants.forEach(p => {
      const current = regionMap.get(p.address.region) || 0;
      regionMap.set(p.address.region, current + 1);
    });

    const regionalDistribution = Array.from(regionMap.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalParticipants: participants.length,
      activeParticipants,
      pendingOnboarding,
      nonCompliant,
      highRisk,
      typeDistribution,
      regionalDistribution,
      averagePerformanceScore,
      totalRevenue,
      totalVolume
    };
  }

  /**
   * Send notification to participant
   */
  private sendNotification(participantId: string, notification: Notification): void {
    const notifications = this.notifications.get(participantId) || [];
    notifications.push({
      ...notification,
      id: this.generateId(),
      sentAt: new Date(),
      read: false
    });
    this.notifications.set(participantId, notifications);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface Relationship {
  id: string;
  participantId1: string;
  participantId2: string;
  type: 'partnership' | 'collaboration' | 'referral' | 'subcontractor';
  description: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'inactive' | 'terminated';
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  sentAt: Date;
  read: boolean;
}
