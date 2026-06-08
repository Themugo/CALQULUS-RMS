/**
 * ISO 27001 Compliance Framework
 * 
 * Implements ISO 27001:2022 Information Security Management System (ISMS):
 * - Information security policies and procedures
 * - Risk assessment and treatment
 * - Asset management
 * - Access control
 * - Cryptography controls
 * - Physical and environmental security
 * - Operations security
 * - Communications security
 * - System acquisition, development, and maintenance
 * - Supplier relationships
 - - Information security incident management
 * - Information security aspects of business continuity
 * - Compliance with legal and contractual requirements
 */

export interface ISO27001Control {
  id: string;
  annex: string;
  controlId: string;
  title: string;
  description: string;
  implementation: string;
  riskTreatment: 'accept' | 'mitigate' | 'transfer' | 'avoid';
  status: 'implemented' | 'partially_implemented' | 'not_implemented';
  lastAssessed: Date;
  nextAssessment: Date;
  owner: string;
  evidence: ControlEvidence[];
  relatedRisks: string[];
}

export interface ISO27001ControlInput {
  annex: string;
  controlId: string;
  title: string;
  description: string;
  implementation: string;
  riskTreatment: 'accept' | 'mitigate' | 'transfer' | 'avoid';
  status: 'implemented' | 'partially_implemented' | 'not_implemented';
  owner: string;
  relatedRisks: string[];
}

export interface ControlEvidence {
  id: string;
  type: 'document' | 'configuration' | 'log' | 'test_result' | 'audit_report';
  description: string;
  location: string;
  collectedAt: Date;
  collectedBy: string;
  verified: boolean;
}

export interface SecurityRisk {
  id: string;
  category: 'technical' | 'operational' | 'strategic' | 'compliance' | 'financial';
  title: string;
  description: string;
  likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  impact: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  treatment: 'accept' | 'mitigate' | 'transfer' | 'avoid';
  mitigationPlan: string;
  mitigatingControls: string[];
  owner: string;
  status: 'identified' | 'analyzed' | 'mitigating' | 'mitigated' | 'accepted' | 'transferred';
  identifiedAt: Date;
  lastReviewed: Date;
  nextReview: Date;
}

export interface InformationAsset {
  id: string;
  name: string;
  type: 'data' | 'software' | 'hardware' | 'service' | 'document' | 'personnel';
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  owner: string;
  custodian: string;
  location: string;
  value: string;
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  retentionPeriod: number; // in months
  disposalMethod: string;
  relatedControls: string[];
  relatedRisks: string[];
  createdAt: Date;
  lastReviewed: Date;
}

export interface ISMSPolicy {
  id: string;
  name: string;
  type: 'policy' | 'procedure' | 'guideline' | 'standard';
  version: string;
  effectiveDate: Date;
  reviewDate: Date;
  owner: string;
  approver: string;
  distribution: string[];
  content: string;
  relatedControls: string[];
  relatedAssets: string[];
}

export class ISO27001Compliance {
  private controls: Map<string, ISO27001Control>;
  private risks: Map<string, SecurityRisk>;
  private assets: Map<string, InformationAsset>;
  private policies: Map<string, ISMSPolicy>;

  constructor() {
    this.controls = new Map();
    this.risks = new Map();
    this.assets = new Map();
    this.policies = new Map();
    this.initializeDefaultControls();
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default ISO 27001 controls (Annex A)
   */
  private initializeDefaultControls(): void {
    const defaultControls: ISO27001ControlInput[] = [
      // Annex A.5 - Organizational (5.1-5.37)
      {
        annex: 'A.5',
        controlId: '5.1',
        title: 'Policies for information security',
        description: 'A set of policies for information security shall be defined, approved by management, published and communicated to employees and relevant external parties.',
        implementation: 'Information security policy suite implemented and regularly reviewed',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'CISO',
        relatedRisks: []
      },
      {
        annex: 'A.5',
        controlId: '5.7',
        title: 'Threat intelligence',
        description: 'Information about threats shall be collected and analysed to produce threat intelligence.',
        implementation: 'Threat intelligence feeds integrated with security monitoring',
        riskTreatment: 'mitigate',
        status: 'partially_implemented',
        owner: 'Security Team',
        relatedRisks: []
      },

      // Annex A.6 - People (6.1-6.8)
      {
        annex: 'A.6',
        controlId: '6.1',
        title: 'Screening',
        description: 'Background verification checks on all candidates for employment shall be carried out.',
        implementation: 'Background checks for all new hires and contractors',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'HR',
        relatedRisks: []
      },
      {
        annex: 'A.6',
        controlId: '6.3',
        title: 'Termination or change of employment responsibilities',
        description: 'Information security responsibilities and duties that remain valid after termination or change of employment shall be defined, assigned and communicated.',
        implementation: 'Offboarding process with access revocation and knowledge transfer',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'HR',
        relatedRisks: []
      },

      // Annex A.7 - Physical (7.1-7.14)
      {
        annex: 'A.7',
        controlId: '7.1',
        title: 'Physical security perimeters',
        description: 'Physical security perimeters shall be defined and used to protect areas that contain information and other associated assets.',
        implementation: 'Cloud infrastructure with physical security via cloud provider',
        riskTreatment: 'transfer',
        status: 'implemented',
        owner: 'Operations',
        relatedRisks: []
      },
      {
        annex: 'A.7',
        controlId: '7.10',
        title: 'Storage media',
        description: 'Storage media shall be managed through their lifecycle.',
        implementation: 'Encrypted storage with secure disposal procedures',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Operations',
        relatedRisks: []
      },

      // Annex A.8 - Technological (8.1-8.25)
      {
        annex: 'A.8',
        controlId: '8.2',
        title: 'Privileged access rights',
        description: 'The allocation and use of privileged access rights shall be restricted and controlled.',
        implementation: 'Privileged access management with regular reviews',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },
      {
        annex: 'A.8',
        controlId: '8.5',
        title: 'Secure authentication',
        description: 'Secure authentication processes shall be implemented.',
        implementation: 'MFA enforced for all users with SSO integration',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },
      {
        annex: 'A.8',
        controlId: '8.8',
        title: 'Management of technical vulnerabilities',
        description: 'Information about technical vulnerabilities of systems being used shall be obtained, the exposure to such vulnerabilities evaluated and appropriate measures taken.',
        implementation: 'Automated vulnerability scanning and patch management',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },
      {
        annex: 'A.8',
        controlId: '8.19',
        title: 'Installation of software on operational systems',
        description: 'Procedures shall be implemented to control the installation of software on operational systems.',
        implementation: 'Controlled software deployment with approval workflow',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Engineering',
        relatedRisks: []
      },
      {
        annex: 'A.8',
        controlId: '8.24',
        title: 'Use of cryptography',
        description: 'Cryptographic controls shall be used in accordance with a policy on the use of cryptography.',
        implementation: 'Encryption at rest and in transit with key management',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },

      // Annex A.9 - Organizational (9.1-9.8)
      {
        annex: 'A.9',
        controlId: '9.1',
        title: 'Access control',
        description: 'Access to information and other associated assets shall be restricted in accordance with the access control policy.',
        implementation: 'Role-based access control with least privilege',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },
      {
        annex: 'A.9',
        controlId: '9.2',
        title: 'User access management',
        description: 'User access management shall be implemented to grant access rights.',
        implementation: 'Automated user provisioning with approval workflow',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },
      {
        annex: 'A.9',
        controlId: '9.4',
        title: 'Information access restriction',
        description: 'Access to information and other associated assets shall be authorized in accordance with the access control policy.',
        implementation: 'Attribute-based access control with data classification',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },

      // Annex A.10 - Physical (10.1-10.8)
      {
        annex: 'A.10',
        controlId: '10.1',
        title: 'Cryptography',
        description: 'Cryptographic controls shall be used in accordance with a policy on the use of cryptography.',
        implementation: 'TLS 1.3 for in-transit, AES-256 for at-rest encryption',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },

      // Annex A.11 - Organizational (11.1-11.3)
      {
        annex: 'A.11',
        controlId: '11.1',
        title: 'Secure configuration',
        description: 'Configuration management shall be implemented to maintain secure configurations.',
        implementation: 'Infrastructure as code with security hardening',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Engineering',
        relatedRisks: []
      },
      {
        annex: 'A.11',
        controlId: '11.2',
        title: 'Information backup',
        description: 'Information backup shall be created and tested regularly.',
        implementation: 'Daily automated backups with tested recovery procedures',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Operations',
        relatedRisks: []
      },
      {
        annex: 'A.11',
        controlId: '11.3',
        title: 'Logging',
        description: 'Log events shall be produced, stored, protected and analysed.',
        implementation: 'Centralized logging with SIEM integration',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },

      // Annex A.12 - Operations (12.1-12.6)
      {
        annex: 'A.12',
        controlId: '12.1',
        title: 'Event logging',
        description: 'Event logs recording user activities, exceptions, faults and information security events shall be produced, stored, protected and analysed.',
        implementation: 'Comprehensive audit logging with retention',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },
      {
        annex: 'A.12',
        controlId: '12.3',
        title: 'Information backup',
        description: 'Backup copies of information, software and system images shall be created and tested regularly.',
        implementation: 'Automated backups with regular testing',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Operations',
        relatedRisks: []
      },

      // Annex A.13 - Communications (13.1-13.2)
      {
        annex: 'A.13',
        controlId: '13.1',
        title: 'Network security',
        description: 'Networks shall be managed and secured to protect information in systems and applications.',
        implementation: 'Network segmentation, firewalls, and intrusion detection',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },
      {
        annex: 'A.13',
        controlId: '13.2',
        title: 'Security of information in transit',
        description: 'Information in transit shall be protected.',
        implementation: 'End-to-end encryption with TLS 1.3',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },

      // Annex A.14 - System acquisition (14.1-14.3)
      {
        annex: 'A.14',
        controlId: '14.1',
        title: 'Security requirements',
        description: 'Information security requirements shall be included in the acquisition, development and maintenance of information systems.',
        implementation: 'Security requirements in SDLC with threat modeling',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Engineering',
        relatedRisks: []
      },
      {
        annex: 'A.14',
        controlId: '14.2',
        title: 'Security in development and integration processes',
        description: 'Security shall be integrated and maintained in the development and integration processes.',
        implementation: 'Secure coding practices, SAST/DAST, code reviews',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Engineering',
        relatedRisks: []
      },
      {
        annex: 'A.14',
        controlId: '14.3',
        title: 'Test data',
        description: 'Test data shall be selected, protected and managed.',
        implementation: 'Anonymized test data with secure handling',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Engineering',
        relatedRisks: []
      },

      // Annex A.15 - Supplier relationships (15.1-15.3)
      {
        annex: 'A.15',
        controlId: '15.1',
        title: 'Information security in supplier relationships',
        description: 'Information security in supplier relationships shall be established and managed.',
        implementation: 'Supplier security assessments and contractual requirements',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Procurement',
        relatedRisks: []
      },
      {
        annex: 'A.15',
        controlId: '15.2',
        title: 'Managing information security within the supply chain',
        description: 'Information security requirements for the supply chain shall be established and managed.',
        implementation: 'Third-party risk management program',
        riskTreatment: 'mitigate',
        status: 'partially_implemented',
        owner: 'Procurement',
        relatedRisks: []
      },

      // Annex A.16 - Incident management (16.1-16.2)
      {
        annex: 'A.16',
        controlId: '16.1',
        title: 'Management of information security incidents',
        description: 'Information security incidents shall be managed and improved.',
        implementation: 'Incident response plan with defined roles and procedures',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },
      {
        annex: 'A.16',
        controlId: '16.2',
        title: 'Management of information security improvements',
        description: 'Information security improvements shall be identified, implemented and communicated.',
        implementation: 'Continuous improvement process with lessons learned',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Security Team',
        relatedRisks: []
      },

      // Annex A.17 - Business continuity (17.1-17.3)
      {
        annex: 'A.17',
        controlId: '17.1',
        title: 'Information security continuity',
        description: 'Information security continuity shall be embedded in business continuity management.',
        implementation: 'Business continuity plan with security considerations',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Operations',
        relatedRisks: []
      },
      {
        annex: 'A.17',
        controlId: '17.2',
        title: 'Redundancies',
        description: 'Information security facilities shall be made redundant.',
        implementation: 'Multi-region deployment with automatic failover',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Operations',
        relatedRisks: []
      },

      // Annex A.18 - Compliance (18.1-18.3)
      {
        annex: 'A.18',
        controlId: '18.1',
        title: 'Identification of applicable legislation and contractual requirements',
        description: 'All relevant legislative, statutory, regulatory, contractual and other requirements shall be identified, documented and kept up to date for each information system.',
        implementation: 'Compliance register with regular reviews',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Legal',
        relatedRisks: []
      },
      {
        annex: 'A.18',
        controlId: '18.2',
        title: 'Intellectual property rights',
        description: 'Appropriate procedures shall be implemented to protect intellectual property rights.',
        implementation: 'IP protection policies and employee agreements',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Legal',
        relatedRisks: []
      },
      {
        annex: 'A.18',
        controlId: '18.3',
        title: 'Records protection',
        description: 'Records shall be protected from loss, destruction, falsification, unauthorized access and unauthorized release.',
        implementation: 'Record retention policy with secure storage',
        riskTreatment: 'mitigate',
        status: 'implemented',
        owner: 'Legal',
        relatedRisks: []
      }
    ];

    defaultControls.forEach(control => {
      const isoControl: ISO27001Control = {
        id: this.generateId(),
        annex: control.annex,
        controlId: control.controlId,
        title: control.title,
        description: control.description,
        implementation: control.implementation,
        riskTreatment: control.riskTreatment,
        status: control.status,
        owner: control.owner,
        relatedRisks: control.relatedRisks,
        evidence: [],
        lastAssessed: new Date(),
        nextAssessment: this.calculateNextAssessment(control.status)
      };
      this.controls.set(isoControl.id, isoControl);
    });
  }

  /**
   * Initialize default ISMS policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: Omit<ISMSPolicy, 'id'>[] = [
      {
        name: 'Information Security Policy',
        type: 'policy',
        version: '1.0',
        effectiveDate: new Date(),
        reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        owner: 'CISO',
        approver: 'CEO',
        distribution: ['all_employees', 'contractors'],
        content: 'This policy establishes the information security management system for RentFlow...',
        relatedControls: [],
        relatedAssets: []
      },
      {
        name: 'Access Control Policy',
        type: 'policy',
        version: '1.0',
        effectiveDate: new Date(),
        reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        owner: 'CISO',
        approver: 'CTO',
        distribution: ['all_employees', 'contractors'],
        content: 'This policy defines access control requirements and procedures...',
        relatedControls: [],
        relatedAssets: []
      },
      {
        name: 'Data Classification Policy',
        type: 'policy',
        version: '1.0',
        effectiveDate: new Date(),
        reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        owner: 'CISO',
        approver: 'CTO',
        distribution: ['all_employees', 'contractors'],
        content: 'This policy establishes data classification standards...',
        relatedControls: [],
        relatedAssets: []
      },
      {
        name: 'Incident Response Procedure',
        type: 'procedure',
        version: '1.0',
        effectiveDate: new Date(),
        reviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        owner: 'CISO',
        approver: 'CEO',
        distribution: ['security_team', 'management'],
        content: 'This procedure defines incident response steps...',
        relatedControls: [],
        relatedAssets: []
      },
      {
        name: 'Change Management Procedure',
        type: 'procedure',
        version: '1.0',
        effectiveDate: new Date(),
        reviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        owner: 'CTO',
        approver: 'CEO',
        distribution: ['engineering', 'operations'],
        content: 'This procedure defines change management process...',
        relatedControls: [],
        relatedAssets: []
      },
      {
        name: 'Business Continuity Plan',
        type: 'procedure',
        version: '1.0',
        effectiveDate: new Date(),
        reviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        owner: 'CTO',
        approver: 'CEO',
        distribution: ['management', 'operations', 'security_team'],
        content: 'This plan defines business continuity procedures...',
        relatedControls: [],
        relatedAssets: []
      }
    ];

    defaultPolicies.forEach(policy => {
      const ismsPolicy: ISMSPolicy = {
        ...policy,
        id: this.generateId()
      };
      this.policies.set(ismsPolicy.id, ismsPolicy);
    });
  }

  /**
   * Calculate next assessment date
   */
  private calculateNextAssessment(status: string): Date {
    const now = new Date();
    if (status === 'implemented') {
      now.setFullYear(now.getFullYear() + 1);
    } else {
      now.setMonth(now.getMonth() + 3);
    }
    return now;
  }

  /**
   * Add security risk
   */
  addSecurityRisk(riskData: Omit<SecurityRisk, 'id' | 'riskScore' | 'riskLevel' | 'identifiedAt' | 'lastReviewed' | 'nextReview'>): SecurityRisk {
    const riskScore = this.calculateRiskScore(riskData.likelihood, riskData.impact);
    const riskLevel = this.getRiskLevel(riskScore);

    const risk: SecurityRisk = {
      ...riskData,
      id: this.generateId(),
      riskScore,
      riskLevel,
      identifiedAt: new Date(),
      lastReviewed: new Date(),
      nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    };

    this.risks.set(risk.id, risk);
    return risk;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(likelihood: string, impact: string): number {
    const likelihoodScores = {
      very_low: 1,
      low: 2,
      medium: 3,
      high: 4,
      very_high: 5
    };

    const impactScores = {
      very_low: 1,
      low: 2,
      medium: 3,
      high: 4,
      very_high: 5
    };

    return likelihoodScores[likelihood as keyof typeof likelihoodScores] * impactScores[impact as keyof typeof impactScores];
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score <= 4) return 'low';
    if (score <= 9) return 'medium';
    if (score <= 16) return 'high';
    return 'critical';
  }

  /**
   * Add information asset
   */
  addInformationAsset(assetData: Omit<InformationAsset, 'id' | 'createdAt' | 'lastReviewed'>): InformationAsset {
    const asset: InformationAsset = {
      ...assetData,
      id: this.generateId(),
      createdAt: new Date(),
      lastReviewed: new Date()
    };

    this.assets.set(asset.id, asset);
    return asset;
  }

  /**
   * Add control evidence
   */
  addControlEvidence(controlId: string, evidence: Omit<ControlEvidence, 'id' | 'collectedAt'>): ControlEvidence {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    const controlEvidence: ControlEvidence = {
      ...evidence,
      id: this.generateId(),
      collectedAt: new Date()
    };

    control.evidence.push(controlEvidence);
    this.controls.set(controlId, control);

    return controlEvidence;
  }

  /**
   * Get controls by annex
   */
  getControlsByAnnex(annex: string): ISO27001Control[] {
    return Array.from(this.controls.values()).filter(c => c.annex === annex);
  }

  /**
   * Get risks by level
   */
  getRisksByLevel(level: SecurityRisk['riskLevel']): SecurityRisk[] {
    return Array.from(this.risks.values()).filter(r => r.riskLevel === level);
  }

  /**
   * Get assets by classification
   */
  getAssetsByClassification(classification: InformationAsset['classification']): InformationAsset[] {
    return Array.from(this.assets.values()).filter(a => a.classification === classification);
  }

  /**
   * Generate ISO 27001 compliance report
   */
  generateComplianceReport(): {
    reportDate: Date;
    period: { startDate: Date; endDate: Date };
    overallCompliance: number;
    annexCompliance: { annex: string; compliance: number; controls: number; implemented: number }[];
    controlStatus: { implemented: number; partiallyImplemented: number; notImplemented: number };
    riskSummary: { total: number; critical: number; high: number; medium: number; low: number };
    assetSummary: { total: number; byClassification: Record<string, number> };
    recommendations: string[];
  } {
    const controls = Array.from(this.controls.values());
    const now = new Date();
    const startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year

    // Calculate overall compliance
    const implementedControls = controls.filter(c => c.status === 'implemented').length;
    const overallCompliance = (implementedControls / controls.length) * 100;

    // Calculate annex compliance
    const annexes = ['A.5', 'A.6', 'A.7', 'A.8', 'A.9', 'A.10', 'A.11', 'A.12', 'A.13', 'A.14', 'A.15', 'A.16', 'A.17', 'A.18'];
    const annexCompliance = annexes.map(annex => {
      const annexControls = controls.filter(c => c.annex === annex);
      const annexImplemented = annexControls.filter(c => c.status === 'implemented').length;
      return {
        annex,
        compliance: annexControls.length > 0 ? (annexImplemented / annexControls.length) * 100 : 0,
        controls: annexControls.length,
        implemented: annexImplemented
      };
    });

    // Control status breakdown
    const controlStatus = {
      implemented: controls.filter(c => c.status === 'implemented').length,
      partiallyImplemented: controls.filter(c => c.status === 'partially_implemented').length,
      notImplemented: controls.filter(c => c.status === 'not_implemented').length
    };

    // Risk summary
    const risks = Array.from(this.risks.values());
    const riskSummary = {
      total: risks.length,
      critical: risks.filter(r => r.riskLevel === 'critical').length,
      high: risks.filter(r => r.riskLevel === 'high').length,
      medium: risks.filter(r => r.riskLevel === 'medium').length,
      low: risks.filter(r => r.riskLevel === 'low').length
    };

    // Asset summary
    const assets = Array.from(this.assets.values());
    const byClassification: Record<string, number> = {};
    assets.forEach(asset => {
      byClassification[asset.classification] = (byClassification[asset.classification] || 0) + 1;
    });

    const assetSummary = {
      total: assets.length,
      byClassification
    };

    // Generate recommendations
    const recommendations: string[] = [];
    if (controlStatus.notImplemented > 0) {
      recommendations.push(`Implement ${controlStatus.notImplemented} not implemented controls`);
    }
    if (controlStatus.partiallyImplemented > 0) {
      recommendations.push(`Complete implementation of ${controlStatus.partiallyImplemented} partially implemented controls`);
    }
    if (riskSummary.critical > 0) {
      recommendations.push('Address critical security risks immediately');
    }
    if (riskSummary.high > 5) {
      recommendations.push('Prioritize mitigation of high-severity risks');
    }

    return {
      reportDate: now,
      period: { startDate, endDate: now },
      overallCompliance,
      annexCompliance,
      controlStatus,
      riskSummary,
      assetSummary,
      recommendations
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
