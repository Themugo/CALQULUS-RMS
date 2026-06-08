import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Input } from '@/shared/components/ui/input';
import { Progress } from '@/shared/components/ui/progress';
import {
  Shield, Search, Filter, Download, RefreshCw, Star, MapPin,
  Calendar, DollarSign, CheckCircle, AlertTriangle, Clock, User,
  Activity, TrendingUp, Award, FileText, Briefcase, Building2,
  Percent, Target, Zap, AlertCircle, FileCheck, Receipt
} from 'lucide-react';

interface InsuranceProvider {
  id: string;
  name: string;
  type: 'property' | 'liability' | 'health' | 'comprehensive';
  rating: number;
  reviewCount: number;
  totalPolicies: number;
  activePolicies: number;
  location: string;
  premiumRange: string;
  coverageRange: string;
  claimApprovalRate: number;
  averageClaimTime: string;
  verified: boolean;
  coverageTypes: string[];
}

interface InsurancePolicy {
  id: string;
  providerId: string;
  providerName: string;
  propertyId: string;
  propertyName: string;
  unit: string;
  policyType: string;
  coverageType: string;
  coverageAmount: number;
  premium: number;
  deductible: number;
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  startDate: Date;
  endDate: Date;
  renewalDate: Date;
}

interface InsuranceClaim {
  id: string;
  policyId: string;
  policyNumber: string;
  providerId: string;
  providerName: string;
  propertyId: string;
  propertyName: string;
  claimType: string;
  description: string;
  claimAmount: number;
  approvedAmount?: number;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
  submittedDate: Date;
  approvedDate?: Date;
  paidDate?: Date;
  documents: string[];
}

interface ProviderPerformance {
  providerId: string;
  providerName: string;
  claimApprovalRate: number;
  averageClaimTime: string;
  customerSatisfaction: number;
  totalClaims: number;
  totalPayout: number;
  responseTime: string;
}

const InsuranceMarketplace = () => {
  const [activeTab, setActiveTab] = useState('providers');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Mock data - in production, this would come from the insurance marketplace API
  const insuranceProviders: InsuranceProvider[] = [
    {
      id: 'INS-001',
      name: 'APA Insurance',
      type: 'property',
      rating: 4.6,
      reviewCount: 189,
      totalPolicies: 456,
      activePolicies: 234,
      location: 'Nairobi',
      premiumRange: 'KES 5K - 50K/year',
      coverageRange: 'KES 1M - 50M',
      claimApprovalRate: 85,
      averageClaimTime: '7-14 days',
      verified: true,
      coverageTypes: ['Property Damage', 'Fire', 'Theft', 'Natural Disasters']
    },
    {
      id: 'INS-002',
      name: 'Jubilee Insurance',
      type: 'comprehensive',
      rating: 4.7,
      reviewCount: 234,
      totalPolicies: 567,
      activePolicies: 312,
      location: 'Nairobi',
      premiumRange: 'KES 10K - 100K/year',
      coverageRange: 'KES 5M - 100M',
      claimApprovalRate: 88,
      averageClaimTime: '5-10 days',
      verified: true,
      coverageTypes: ['Property', 'Liability', 'Contents', 'Business Interruption']
    },
    {
      id: 'INS-003',
      name: 'Britam Insurance',
      type: 'property',
      rating: 4.5,
      reviewCount: 156,
      totalPolicies: 345,
      activePolicies: 189,
      location: 'Nairobi',
      premiumRange: 'KES 8K - 60K/year',
      coverageRange: 'KES 2M - 75M',
      claimApprovalRate: 82,
      averageClaimTime: '10-15 days',
      verified: true,
      coverageTypes: ['Property Damage', 'Fire', 'Water Damage', 'Vandalism']
    },
    {
      id: 'INS-004',
      name: 'CIC Insurance',
      type: 'liability',
      rating: 4.4,
      reviewCount: 123,
      totalPolicies: 234,
      activePolicies: 145,
      location: 'Nairobi',
      premiumRange: 'KES 3K - 30K/year',
      coverageRange: 'KES 500K - 20M',
      claimApprovalRate: 80,
      averageClaimTime: '10-12 days',
      verified: true,
      coverageTypes: ['Public Liability', 'Employer Liability', 'Professional Indemnity']
    },
    {
      id: 'INS-005',
      name: 'Madison Insurance',
      type: 'comprehensive',
      rating: 4.3,
      reviewCount: 98,
      totalPolicies: 178,
      activePolicies: 98,
      location: 'Nairobi',
      premiumRange: 'KES 15K - 120K/year',
      coverageRange: 'KES 10M - 150M',
      claimApprovalRate: 78,
      averageClaimTime: '12-18 days',
      verified: true,
      coverageTypes: ['All Risks', 'Property', 'Liability', 'Contents']
    }
  ];

  const insurancePolicies: InsurancePolicy[] = [
    {
      id: 'POL-001',
      providerId: 'INS-001',
      providerName: 'APA Insurance',
      propertyId: 'PROP-001',
      propertyName: 'Sunset Apartments',
      unit: 'A-101',
      policyType: 'property',
      coverageType: 'Property Damage',
      coverageAmount: 10000000,
      premium: 25000,
      deductible: 100000,
      status: 'active',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2026-05-31'),
      renewalDate: new Date('2026-05-15')
    },
    {
      id: 'POL-002',
      providerId: 'INS-002',
      providerName: 'Jubilee Insurance',
      propertyId: 'PROP-002',
      propertyName: 'Riverside Complex',
      unit: 'B-201',
      policyType: 'comprehensive',
      coverageType: 'All Risks',
      coverageAmount: 25000000,
      premium: 75000,
      deductible: 250000,
      status: 'active',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2026-06-30'),
      renewalDate: new Date('2026-06-15')
    },
    {
      id: 'POL-003',
      providerId: 'INS-003',
      providerName: 'Britam Insurance',
      propertyId: 'PROP-003',
      propertyName: 'Garden View',
      unit: 'C-301',
      policyType: 'property',
      coverageType: 'Fire',
      coverageAmount: 5000000,
      premium: 15000,
      deductible: 75000,
      status: 'pending',
      startDate: new Date('2026-06-15'),
      endDate: new Date('2027-06-14'),
      renewalDate: new Date('2027-05-30')
    }
  ];

  const insuranceClaims: InsuranceClaim[] = [
    {
      id: 'CLM-001',
      policyId: 'POL-001',
      policyNumber: 'APA-2025-001',
      providerId: 'INS-001',
      providerName: 'APA Insurance',
      propertyId: 'PROP-001',
      propertyName: 'Sunset Apartments',
      claimType: 'Water Damage',
      description: 'Burst pipe caused water damage to unit and common areas',
      claimAmount: 500000,
      approvedAmount: 450000,
      status: 'paid',
      submittedDate: new Date('2026-05-10'),
      approvedDate: new Date('2026-05-18'),
      paidDate: new Date('2026-05-22'),
      documents: ['damage_report.pdf', 'photos.zip', 'invoice.pdf']
    },
    {
      id: 'CLM-002',
      policyId: 'POL-002',
      policyNumber: 'JUB-2025-002',
      providerId: 'INS-002',
      providerName: 'Jubilee Insurance',
      propertyId: 'PROP-002',
      propertyName: 'Riverside Complex',
      claimType: 'Theft',
      description: 'Break-in and theft of appliances from unit',
      claimAmount: 300000,
      status: 'under_review',
      submittedDate: new Date('2026-05-25'),
      documents: ['police_report.pdf', 'inventory_list.pdf', 'photos.zip']
    }
  ];

  const providerPerformance: ProviderPerformance[] = [
    {
      providerId: 'INS-001',
      providerName: 'APA Insurance',
      claimApprovalRate: 85,
      averageClaimTime: '7-14 days',
      customerSatisfaction: 4.6,
      totalClaims: 45,
      totalPayout: 12500000,
      responseTime: '24 hours'
    },
    {
      providerId: 'INS-002',
      providerName: 'Jubilee Insurance',
      claimApprovalRate: 88,
      averageClaimTime: '5-10 days',
      customerSatisfaction: 4.7,
      totalClaims: 56,
      totalPayout: 18700000,
      responseTime: '12 hours'
    },
    {
      providerId: 'INS-003',
      providerName: 'Britam Insurance',
      claimApprovalRate: 82,
      averageClaimTime: '10-15 days',
      customerSatisfaction: 4.5,
      totalClaims: 34,
      totalPayout: 8900000,
      responseTime: '24 hours'
    }
  ];

  const filteredProviders = insuranceProviders.filter(provider => {
    const matchesSearch = provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || provider.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'pending':
      case 'submitted':
      case 'under_review':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="h-3 w-3 mr-1" />{status.replace('_', ' ')}</Badge>;
      case 'expired':
      case 'cancelled':
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><AlertTriangle className="h-3 w-3 mr-1" />{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'property':
        return <Badge variant="outline" className="text-blue-300 border-blue-700"><Building2 className="h-3 w-3 mr-1" />{type}</Badge>;
      case 'liability':
        return <Badge variant="outline" className="text-orange-300 border-orange-700"><Shield className="h-3 w-3 mr-1" />{type}</Badge>;
      case 'health':
        return <Badge variant="outline" className="text-green-300 border-green-700"><Activity className="h-3 w-3 mr-1" />{type}</Badge>;
      case 'comprehensive':
        return <Badge variant="outline" className="text-purple-300 border-purple-700"><Award className="h-3 w-3 mr-1" />{type}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const totalProviders = insuranceProviders.length;
  const activePolicies = insurancePolicies.filter(p => p.status === 'active').length;
  const pendingClaims = insuranceClaims.filter(c => c.status === 'submitted' || c.status === 'under_review').length;
  const totalCoverage = insurancePolicies.reduce((sum, p) => sum + p.coverageAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Insurance Marketplace</h2>
          <p className="text-purple-300 text-sm mt-1">Connect with insurance providers for property coverage</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-purple-700 text-purple-300 hover:bg-purple-900/50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-purple-700 text-purple-300 hover:bg-purple-900/50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-400" />
              Total Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalProviders}</div>
            <div className="text-sm text-purple-300">Insurance companies</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-purple-400" />
              Active Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{activePolicies}</div>
            <div className="text-sm text-purple-300">Currently covered</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-purple-400" />
              Pending Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{pendingClaims}</div>
            <div className="text-sm text-purple-300">Awaiting review</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" />
              Total Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">KES {(totalCoverage / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-purple-300">Insured value</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-800/50 border border-purple-800/30">
          <TabsTrigger value="providers" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
            <Shield className="h-4 w-4 mr-2" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="policies" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
            <FileCheck className="h-4 w-4 mr-2" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="claims" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
            <Receipt className="h-4 w-4 mr-2" />
            Claims
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
            <Award className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers">
          <Card className="bg-slate-800/50 border-purple-800/30">
            <CardHeader>
              <CardTitle className="text-white">Insurance Providers Directory</CardTitle>
              <CardDescription className="text-purple-300">
                Browse and connect with insurance companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400" />
                  <Input
                    placeholder="Search providers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-900/50 border-purple-800/30 text-white placeholder-purple-400"
                  />
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-slate-900/50 border border-purple-800/30 text-white rounded-md px-3 py-2"
                >
                  <option value="all">All Types</option>
                  <option value="property">Property</option>
                  <option value="liability">Liability</option>
                  <option value="health">Health</option>
                  <option value="comprehensive">Comprehensive</option>
                </select>
              </div>

              {/* Providers List */}
              <div className="grid gap-4 md:grid-cols-2">
                {filteredProviders.map((provider) => (
                  <div key={provider.id} className="p-4 bg-slate-900/50 rounded-lg border border-purple-800/30">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">{provider.name}</span>
                          {provider.verified && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300"><Award className="h-3 w-3 mr-1" />Verified</Badge>
                          )}
                        </div>
                        {getTypeBadge(provider.type)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white font-medium">{provider.rating}</span>
                        <span className="text-purple-300 text-sm">({provider.reviewCount})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      {provider.coverageTypes.slice(0, 3).map((coverage, idx) => (
                        <Badge key={idx} variant="outline" className="text-purple-300 border-purple-700 text-xs">
                          {coverage}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                      <div className="flex items-center gap-2 text-purple-300">
                        <MapPin className="h-3 w-3" />
                        {provider.location}
                      </div>
                      <div className="flex items-center gap-2 text-purple-300">
                        <Percent className="h-3 w-3" />
                        Approval: {provider.claimApprovalRate}%
                      </div>
                      <div className="flex items-center gap-2 text-purple-300">
                        <DollarSign className="h-3 w-3" />
                        {provider.premiumRange}
                      </div>
                      <div className="flex items-center gap-2 text-purple-300">
                        <Clock className="h-3 w-3" />
                        {provider.averageClaimTime}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-purple-300">
                        <Target className="h-3 w-3" />
                        Coverage: {provider.coverageRange}
                      </div>
                      <Button variant="outline" size="sm" className="border-purple-700 text-purple-300 hover:bg-purple-900/50">
                        Get Quote
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card className="bg-slate-800/50 border-purple-800/30">
            <CardHeader>
              <CardTitle className="text-white">Insurance Policies</CardTitle>
              <CardDescription className="text-purple-300">
                Manage insurance policies and coverage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insurancePolicies.map((policy) => (
                  <div key={policy.id} className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-purple-800/30">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-white font-medium">{policy.providerName}</span>
                          <span className="text-purple-300 text-sm ml-2">{policy.id}</span>
                          <Badge variant="outline" className="ml-2 text-purple-300 border-purple-700 capitalize">
                            {policy.policyType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(policy.status)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-purple-300 mb-2">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {policy.propertyName} - {policy.unit}
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {policy.coverageType}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-purple-300 mb-2">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Coverage: KES {policy.coverageAmount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Premium: KES {policy.premium.toLocaleString()}/year
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-purple-300">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Period: {policy.startDate.toLocaleDateString()} - {policy.endDate.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Renewal: {policy.renewalDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {policy.status === 'pending' && (
                      <Button variant="outline" size="sm" className="border-green-700 text-green-300 hover:bg-green-900/50">
                        Activate
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims">
          <Card className="bg-slate-800/50 border-purple-800/30">
            <CardHeader>
              <CardTitle className="text-white">Insurance Claims</CardTitle>
              <CardDescription className="text-purple-300">
                Track and manage insurance claims
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insuranceClaims.map((claim) => (
                  <div key={claim.id} className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-purple-800/30">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-white font-medium">{claim.providerName}</span>
                          <span className="text-purple-300 text-sm ml-2">{claim.id}</span>
                          <Badge variant="outline" className="ml-2 text-purple-300 border-purple-700">
                            {claim.policyNumber}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(claim.status)}
                        </div>
                      </div>
                      <p className="text-purple-300 text-sm mb-2">{claim.description}</p>
                      <div className="flex items-center gap-4 text-sm text-purple-300 mb-2">
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {claim.claimType}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {claim.propertyName}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-purple-300 mb-2">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Claimed: KES {claim.claimAmount.toLocaleString()}
                        </span>
                        {claim.approvedAmount && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Approved: KES {claim.approvedAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-purple-300">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Submitted: {claim.submittedDate.toLocaleDateString()}
                        </span>
                        {claim.approvedDate && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Approved: {claim.approvedDate.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {claim.status === 'under_review' && (
                      <Button variant="outline" size="sm" className="border-purple-700 text-purple-300 hover:bg-purple-900/50">
                        View Details
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="bg-slate-800/50 border-purple-800/30">
            <CardHeader>
              <CardTitle className="text-white">Provider Performance</CardTitle>
              <CardDescription className="text-purple-300">
                Track insurance provider performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providerPerformance.map((perf) => (
                  <div key={perf.providerId} className="p-4 bg-slate-900/50 rounded-lg border border-purple-800/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">{perf.providerName}</span>
                      <Badge variant="outline" className="text-purple-300 border-purple-700">
                        KES {(perf.totalPayout / 1000000).toFixed(1)}M paid
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div>
                        <div className="text-2xl font-bold text-white">{perf.claimApprovalRate}%</div>
                        <div className="text-xs text-purple-300">Approval Rate</div>
                        <Progress value={perf.claimApprovalRate} className="h-2 mt-1" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{perf.customerSatisfaction}/5</div>
                        <div className="text-xs text-purple-300">Satisfaction</div>
                        <Progress value={(perf.customerSatisfaction / 5) * 100} className="h-2 mt-1" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{perf.totalClaims}</div>
                        <div className="text-xs text-purple-300">Total Claims</div>
                        <Progress value={(perf.totalClaims / 100) * 100} className="h-2 mt-1" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{perf.responseTime}</div>
                        <div className="text-xs text-purple-300">Response Time</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-purple-300">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Avg Claim Time: {perf.averageClaimTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InsuranceMarketplace;
