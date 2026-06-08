/**
 * Contractor Marketplace
 * 
 * Implements a contractor marketplace with:
 * - Contractor profiles and verification
 * - Service categories and specialties
 * - Rating and review system
 * - Availability management
 * - Quote generation
 * - Booking and scheduling
 * - Payment processing
 */

// Service category
export enum ServiceCategory {
  PLUMBING = 'plumbing',
  ELECTRICAL = 'electrical',
  HVAC = 'hvac',
  CARPENTRY = 'carpentry',
  PAINTING = 'painting',
  CLEANING = 'cleaning',
  LANDSCAPING = 'landscaping',
  PEST_CONTROL = 'pest_control',
  SECURITY = 'security',
  GENERAL = 'general',
}

// Verification status
export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

// Contractor profile
export interface ContractorProfile {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  location: string;
  serviceCategories: ServiceCategory[];
  specialties: string[];
  verificationStatus: VerificationStatus;
  rating: number; // 0-5
  reviewCount: number;
  completedJobs: number;
  hourlyRate: number;
  availability: AvailabilitySchedule;
  certifications: Certification[];
  insurance: InsuranceInfo;
  bio: string;
  portfolio: PortfolioItem[];
  createdAt: Date;
  updatedAt: Date;
}

// Availability schedule
export interface AvailabilitySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

// Day schedule
export interface DaySchedule {
  isAvailable: boolean;
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
}

// Certification
export interface Certification {
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  certificateNumber: string;
}

// Insurance info
export interface InsuranceInfo {
  hasInsurance: boolean;
  provider?: string;
  policyNumber?: string;
  coverageAmount?: number;
  expiryDate?: Date;
}

// Portfolio item
export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  images: string[];
  completedDate: Date;
  clientName?: string;
}

// Job request
export interface JobRequest {
  id: string;
  propertyId: string;
  propertyAddress: string;
  serviceCategory: ServiceCategory;
  description: string;
  urgency: 'emergency' | 'urgent' | 'normal';
  preferredDate?: Date;
  budget?: number;
  createdBy: string;
  createdAt: Date;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
}

// Quote
export interface Quote {
  id: string;
  jobRequestId: string;
  contractorId: string;
  estimatedCost: number;
  estimatedDuration: string;
  description: string;
  materialsIncluded: boolean;
  validUntil: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
}

// Booking
export interface Booking {
  id: string;
  quoteId: string;
  jobRequestId: string;
  contractorId: string;
  scheduledDate: Date;
  scheduledTime: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  actualCost?: number;
  completedAt?: Date;
  createdAt: Date;
}

// Review
export interface Review {
  id: string;
  bookingId: string;
  contractorId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: Date;
}

/**
 * Create contractor profile
 */
export function createContractorProfile(
  name: string,
  businessName: string,
  email: string,
  phone: string,
  location: string,
  serviceCategories: ServiceCategory[],
  hourlyRate: number
): ContractorProfile {
  return {
    id: `contractor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    businessName,
    email,
    phone,
    location,
    serviceCategories,
    specialties: [],
    verificationStatus: VerificationStatus.PENDING,
    rating: 0,
    reviewCount: 0,
    completedJobs: 0,
    hourlyRate,
    availability: getDefaultAvailability(),
    certifications: [],
    insurance: {
      hasInsurance: false,
    },
    bio: '',
    portfolio: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get default availability
 */
function getDefaultAvailability(): AvailabilitySchedule {
  return {
    monday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
    tuesday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
    wednesday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
    thursday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
    friday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
    saturday: { isAvailable: false },
    sunday: { isAvailable: false },
  };
}

/**
 * Update contractor profile
 */
export function updateContractorProfile(
  profile: ContractorProfile,
  updates: Partial<Omit<ContractorProfile, 'id' | 'createdAt'>>
): ContractorProfile {
  return {
    ...profile,
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * Verify contractor
 */
export function verifyContractor(
  profile: ContractorProfile,
  certifications: Certification[],
  insurance: InsuranceInfo
): ContractorProfile {
  return {
    ...profile,
    verificationStatus: VerificationStatus.VERIFIED,
    certifications,
    insurance,
    updatedAt: new Date(),
  };
}

/**
 * Create job request
 */
export function createJobRequest(
  propertyId: string,
  propertyAddress: string,
  serviceCategory: ServiceCategory,
  description: string,
  urgency: 'emergency' | 'urgent' | 'normal',
  createdBy: string,
  preferredDate?: Date,
  budget?: number
): JobRequest {
  return {
    id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    propertyId,
    propertyAddress,
    serviceCategory,
    description,
    urgency,
    preferredDate,
    budget,
    createdBy,
    createdAt: new Date(),
    status: 'open',
  };
}

/**
 * Find contractors for job
 */
export function findContractorsForJob(
  jobRequest: JobRequest,
  contractors: ContractorProfile[]
): ContractorProfile[] {
  return contractors
    .filter(contractor => 
      contractor.verificationStatus === VerificationStatus.VERIFIED &&
      contractor.serviceCategories.includes(jobRequest.serviceCategory) &&
      contractor.location === jobRequest.propertyAddress
    )
    .sort((a, b) => b.rating - a.rating);
}

/**
 * Create quote
 */
export function createQuote(
  jobRequestId: string,
  contractorId: string,
  estimatedCost: number,
  estimatedDuration: string,
  description: string,
  materialsIncluded: boolean,
  validDays: number = 30
): Quote {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);
  
  return {
    id: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    jobRequestId,
    contractorId,
    estimatedCost,
    estimatedDuration,
    description,
    materialsIncluded,
    validUntil,
    status: 'pending',
    createdAt: new Date(),
  };
}

/**
 * Accept quote
 */
export function acceptQuote(quote: Quote): Quote {
  return {
    ...quote,
    status: 'accepted',
  };
}

/**
 * Reject quote
 */
export function rejectQuote(quote: Quote): Quote {
  return {
    ...quote,
    status: 'rejected',
  };
}

/**
 * Create booking
 */
export function createBooking(
  quoteId: string,
  jobRequestId: string,
  contractorId: string,
  scheduledDate: Date,
  scheduledTime: string
): Booking {
  return {
    id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    quoteId,
    jobRequestId,
    contractorId,
    scheduledDate,
    scheduledTime,
    status: 'scheduled',
    createdAt: new Date(),
  };
}

/**
 * Complete booking
 */
export function completeBooking(booking: Booking, actualCost: number): Booking {
  return {
    ...booking,
    status: 'completed',
    actualCost,
    completedAt: new Date(),
  };
}

/**
 * Create review
 */
export function createReview(
  bookingId: string,
  contractorId: string,
  rating: number,
  comment: string
): Review {
  return {
    id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    bookingId,
    contractorId,
    rating,
    comment,
    createdAt: new Date(),
  };
}

/**
 * Update contractor rating
 */
export function updateContractorRating(
  profile: ContractorProfile,
  reviews: Review[]
): ContractorProfile {
  const contractorReviews = reviews.filter(r => r.contractorId === profile.id);
  
  if (contractorReviews.length === 0) {
    return profile;
  }
  
  const totalRating = contractorReviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = totalRating / contractorReviews.length;
  
  return {
    ...profile,
    rating: averageRating,
    reviewCount: contractorReviews.length,
    updatedAt: new Date(),
  };
}

/**
 * Get service category label
 */
export function getServiceCategoryLabel(category: ServiceCategory): string {
  const labels: Record<ServiceCategory, string> = {
    [ServiceCategory.PLUMBING]: 'Plumbing',
    [ServiceCategory.ELECTRICAL]: 'Electrical',
    [ServiceCategory.HVAC]: 'HVAC',
    [ServiceCategory.CARPENTRY]: 'Carpentry',
    [ServiceCategory.PAINTING]: 'Painting',
    [ServiceCategory.CLEANING]: 'Cleaning',
    [ServiceCategory.LANDSCAPING]: 'Landscaping',
    [ServiceCategory.PEST_CONTROL]: 'Pest Control',
    [ServiceCategory.SECURITY]: 'Security',
    [ServiceCategory.GENERAL]: 'General',
  };

  return labels[category];
}

/**
 * Get verification status label
 */
export function getVerificationStatusLabel(status: VerificationStatus): string {
  const labels: Record<VerificationStatus, string> = {
    [VerificationStatus.PENDING]: 'Pending',
    [VerificationStatus.VERIFIED]: 'Verified',
    [VerificationStatus.REJECTED]: 'Rejected',
    [VerificationStatus.EXPIRED]: 'Expired',
  };

  return labels[status];
}

/**
 * Filter contractors by category
 */
export function filterContractorsByCategory(
  contractors: ContractorProfile[],
  category: ServiceCategory
): ContractorProfile[] {
  return contractors.filter(contractor => contractor.serviceCategories.includes(category));
}

/**
 * Filter contractors by location
 */
export function filterContractorsByLocation(
  contractors: ContractorProfile[],
  location: string
): ContractorProfile[] {
  return contractors.filter(contractor => contractor.location === location);
}

/**
 * Filter contractors by rating
 */
export function filterContractorsByRating(
  contractors: ContractorProfile[],
  minRating: number
): ContractorProfile[] {
  return contractors.filter(contractor => contractor.rating >= minRating);
}

/**
 * Filter contractors by verification status
 */
export function filterContractorsByVerificationStatus(
  contractors: ContractorProfile[],
  status: VerificationStatus
): ContractorProfile[] {
  return contractors.filter(contractor => contractor.verificationStatus === status);
}

/**
 * Get marketplace statistics
 */
export function getMarketplaceStatistics(
  contractors: ContractorProfile[],
  jobs: JobRequest[],
  bookings: Booking[]
): {
  totalContractors: number;
  verifiedContractors: number;
  totalJobs: number;
  openJobs: number;
  completedJobs: number;
  totalBookings: number;
  averageRating: number;
  byCategory: Record<ServiceCategory, number>;
  byLocation: Record<string, number>;
} {
  const verifiedContractors = contractors.filter(c => c.verificationStatus === VerificationStatus.VERIFIED).length;
  const openJobs = jobs.filter(j => j.status === 'open').length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  
  const averageRating = contractors.length > 0
    ? contractors.reduce((sum, c) => sum + c.rating, 0) / contractors.length
    : 0;
  
  const byCategory: Record<ServiceCategory, number> = {
    [ServiceCategory.PLUMBING]: 0,
    [ServiceCategory.ELECTRICAL]: 0,
    [ServiceCategory.HVAC]: 0,
    [ServiceCategory.CARPENTRY]: 0,
    [ServiceCategory.PAINTING]: 0,
    [ServiceCategory.CLEANING]: 0,
    [ServiceCategory.LANDSCAPING]: 0,
    [ServiceCategory.PEST_CONTROL]: 0,
    [ServiceCategory.SECURITY]: 0,
    [ServiceCategory.GENERAL]: 0,
  };
  
  const byLocation: Record<string, number> = {};
  
  for (const contractor of contractors) {
    for (const category of contractor.serviceCategories) {
      byCategory[category]++;
    }
    
    byLocation[contractor.location] = (byLocation[contractor.location] || 0) + 1;
  }
  
  return {
    totalContractors: contractors.length,
    verifiedContractors,
    totalJobs: jobs.length,
    openJobs,
    completedJobs,
    totalBookings: bookings.length,
    averageRating,
    byCategory,
    byLocation,
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
