import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Input } from '@/shared/components/ui/input';
import { Progress } from '@/shared/components/ui/progress';
import {
  Zap, Search, Filter, Download, RefreshCw, Star, MapPin,
  Calendar, DollarSign, CheckCircle, AlertTriangle, Clock, User,
  Activity, TrendingUp, Award, Shield, FileText, Building2,
  Percent, Target, Droplets, Flame, Wifi, Trash2, Gauge
} from 'lucide-react';

interface UtilityProvider {
  id: string;
  name: string;
  type: 'electricity' | 'water' | 'gas' | 'internet' | 'waste';
  rating: number;
  reviewCount: number;
  totalConnections: number;
  activeConnections: number;
  location: string;
  rateRange: string;
  coverageArea: string;
  averageResponseTime: string;
  verified: boolean;
  services: string[];
}

interface UtilityConnection {
  id: string;
  providerId: string;
  providerName: string;
  propertyId: string;
  propertyName: string;
  unit: string;
  utilityType: string;
  connectionType: string;
  status: 'active' | 'pending' | 'disconnected' | 'suspended';
  connectionDate: Date;
  monthlyRate: number;
  currentReading: number;
  previousReading: number;
  lastBillingDate: Date | null;
  nextBillingDate: Date | null;
}

interface UtilityBill {
  id: string;
  connectionId: string;
  providerId: string;
  providerName: string;
  propertyId: string;
  propertyName: string;
  unit: string;
  utilityType: string;
  billingPeriod: string;
  consumption: number;
  rate: number;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'disputed';
  dueDate: Date;
  paidDate?: Date;
  generatedDate: Date;
}

interface ProviderPerformance {
  providerId: string;
  providerName: string;
  reliability: number;
  averageResponseTime: string;
  customerSatisfaction: number;
  totalConnections: number;
  outageRate: number;
  resolutionTime: string;
}

const UtilityProviders = () => {
  const [activeTab, setActiveTab] = useState('providers');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Mock data - in production, this would come from the utility providers API
  const utilityProviders: UtilityProvider[] = [
    {
      id: 'UTIL-001',
      name: 'Kenya Power',
      type: 'electricity',
      rating: 4.3,
      reviewCount: 567,
      totalConnections: 1234,
      activeConnections: 1189,
      location: 'Nairobi',
      rateRange: 'KES 15-25/kWh',
      coverageArea: 'Nationwide',
      averageResponseTime: '24-48 hours',
      verified: true,
      services: ['Electricity Supply', 'Meter Installation', 'Maintenance']
    },
    {
      id: 'UTIL-002',
      name: 'Nairobi Water',
      type: 'water',
      rating: 4.1,
      reviewCount: 445,
      totalConnections: 890,
      activeConnections: 845,
      location: 'Nairobi',
      rateRange: 'KES 50-100/m³',
      coverageArea: 'Nairobi Metro',
      averageResponseTime: '24-72 hours',
      verified: true,
      services: ['Water Supply', 'Sewerage', 'Meter Installation']
    },
    {
      id: 'UTIL-003',
      name: 'Safaricom Home Fiber',
      type: 'internet',
      rating: 4.6,
      reviewCount: 312,
      totalConnections: 456,
      activeConnections: 423,
      location: 'Nairobi',
      rateRange: 'KES 2500-5000/month',
      coverageArea: 'Major Cities',
      averageResponseTime: '4-8 hours',
      verified: true,
      services: ['Internet', 'TV', 'Phone']
    },
    {
      id: 'UTIL-004',
      name: 'Total Energies',
      type: 'gas',
      rating: 4.4,
      reviewCount: 234,
      totalConnections: 345,
      activeConnections: 312,
      location: 'Nairobi',
      rateRange: 'KES 200-400/kg',
      coverageArea: 'Nairobi & Mombasa',
      averageResponseTime: '12-24 hours',
      verified: true,
      services: ['LPG Supply', 'Installation', 'Maintenance']
    },
    {
      id: 'UTIL-005',
      name: 'Boma Waste Management',
      type: 'waste',
      rating: 4.2,
      reviewCount: 189,
      totalConnections: 234,
      activeConnections: 201,
      location: 'Nairobi',
      rateRange: 'KES 500-1500/month',
      coverageArea: 'Nairobi Metro',
      averageResponseTime: '24-48 hours',
      verified: true,
      services: ['Waste Collection', 'Recycling', 'Disposal']
    }
  ];

  const utilityConnections: UtilityConnection[] = [
    {
      id: 'CONN-001',
      providerId: 'UTIL-001',
      providerName: 'Kenya Power',
      propertyId: 'PROP-001',
      propertyName: 'Sunset Apartments',
      unit: 'A-101',
      utilityType: 'electricity',
      connectionType: 'residential',
      status: 'active',
      connectionDate: new Date('2020-01-15'),
      monthlyRate: 2500,
      currentReading: 12500,
      previousReading: 11800,
      lastBillingDate: new Date('2026-05-15'),
      nextBillingDate: new Date('2026-06-15')
    },
    {
      id: 'CONN-002',
      providerId: 'UTIL-002',
      providerName: 'Nairobi Water',
      propertyId: 'PROP-001',
      propertyName: 'Sunset Apartments',
      unit: 'A-101',
      utilityType: 'water',
      connectionType: 'residential',
      status: 'active',
      connectionDate: new Date('2020-01-15'),
      monthlyRate: 800,
      currentReading: 4500,
      previousReading: 4200,
      lastBillingDate: new Date('2026-05-15'),
      nextBillingDate: new Date('2026-06-15')
    },
    {
      id: 'CONN-003',
      providerId: 'UTIL-003',
      providerName: 'Safaricom Home Fiber',
      propertyId: 'PROP-002',
      propertyName: 'Riverside Complex',
      unit: 'B-201',
      utilityType: 'internet',
      connectionType: 'commercial',
      status: 'pending',
      connectionDate: new Date('2026-06-10'),
      monthlyRate: 4500,
      currentReading: 0,
      previousReading: 0,
      lastBillingDate: null,
      nextBillingDate: new Date('2026-07-10')
    }
  ];

  const utilityBills: UtilityBill[] = [
    {
      id: 'BILL-001',
      connectionId: 'CONN-001',
      providerId: 'UTIL-001',
      providerName: 'Kenya Power',
      propertyId: 'PROP-001',
      propertyName: 'Sunset Apartments',
      unit: 'A-101',
      utilityType: 'electricity',
      billingPeriod: 'May 2026',
      consumption: 700,
      rate: 20,
      amount: 14000,
      status: 'paid',
      dueDate: new Date('2026-06-05'),
      paidDate: new Date('2026-06-02'),
      generatedDate: new Date('2026-05-31')
    },
    {
      id: 'BILL-002',
      connectionId: 'CONN-002',
      providerId: 'UTIL-002',
      providerName: 'Nairobi Water',
      propertyId: 'PROP-001',
      propertyName: 'Sunset Apartments',
      unit: 'A-101',
      utilityType: 'water',
      billingPeriod: 'May 2026',
      consumption: 300,
      rate: 75,
      amount: 22500,
      status: 'pending',
      dueDate: new Date('2026-06-15'),
      generatedDate: new Date('2026-05-31')
    },
    {
      id: 'BILL-003',
      connectionId: 'CONN-001',
      providerId: 'UTIL-001',
      providerName: 'Kenya Power',
      propertyId: 'PROP-002',
      propertyName: 'Riverside Complex',
      unit: 'B-201',
      utilityType: 'electricity',
      billingPeriod: 'May 2026',
      consumption: 1200,
      rate: 22,
      amount: 26400,
      status: 'overdue',
      dueDate: new Date('2026-06-05'),
      generatedDate: new Date('2026-05-31')
    }
  ];

  const providerPerformance: ProviderPerformance[] = [
    {
      providerId: 'UTIL-001',
      providerName: 'Kenya Power',
      reliability: 95,
      averageResponseTime: '24-48 hours',
      customerSatisfaction: 4.3,
      totalConnections: 1189,
      outageRate: 2.5,
      resolutionTime: '12-24 hours'
    },
    {
      providerId: 'UTIL-002',
      providerName: 'Nairobi Water',
      reliability: 88,
      averageResponseTime: '24-72 hours',
      customerSatisfaction: 4.1,
      totalConnections: 845,
      outageRate: 8.2,
      resolutionTime: '24-48 hours'
    },
    {
      providerId: 'UTIL-003',
      providerName: 'Safaricom Home Fiber',
      reliability: 98,
      averageResponseTime: '4-8 hours',
      customerSatisfaction: 4.6,
      totalConnections: 423,
      outageRate: 1.2,
      resolutionTime: '2-4 hours'
    }
  ];

  const filteredProviders = utilityProviders.filter(provider => {
    const matchesSearch = provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || provider.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'disconnected':
      case 'suspended':
      case 'overdue':
      case 'disputed':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><AlertTriangle className="h-3 w-3 mr-1" />{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'electricity':
        return <Badge variant="outline" className="text-yellow-300 border-yellow-700"><Zap className="h-3 w-3 mr-1" />{type}</Badge>;
      case 'water':
        return <Badge variant="outline" className="text-blue-300 border-blue-700"><Droplets className="h-3 w-3 mr-1" />{type}</Badge>;
      case 'gas':
        return <Badge variant="outline" className="text-orange-300 border-orange-700"><Flame className="h-3 w-3 mr-1" />{type}</Badge>;
      case 'internet':
        return <Badge variant="outline" className="text-purple-300 border-purple-700"><Wifi className="h-3 w-3 mr-1" />{type}</Badge>;
      case 'waste':
        return <Badge variant="outline" className="text-green-300 border-green-700"><Trash2 className="h-3 w-3 mr-1" />{type}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const totalProviders = utilityProviders.length;
  const activeConnections = utilityConnections.filter(c => c.status === 'active').length;
  const pendingBills = utilityBills.filter(b => b.status === 'pending' || b.status === 'overdue').length;
  const totalMonthlyCost = utilityConnections.reduce((sum, c) => sum + c.monthlyRate, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Utility Providers</h2>
          <p className="text-purple-300 text-sm mt-1">Connect with utility providers for essential services</p>
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
              <Zap className="h-4 w-4 text-purple-400" />
              Total Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalProviders}</div>
            <div className="text-sm text-purple-300">Utility companies</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              Active Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{activeConnections}</div>
            <div className="text-sm text-purple-300">Currently connected</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-400" />
              Pending Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{pendingBills}</div>
            <div className="text-sm text-purple-300">Awaiting payment</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-400" />
              Monthly Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">KES {totalMonthlyCost.toLocaleString()}</div>
            <div className="text-sm text-purple-300">Total utilities</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-800/50 border border-purple-800/30">
          <TabsTrigger value="providers" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
            <Zap className="h-4 w-4 mr-2" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="connections" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
            <Activity className="h-4 w-4 mr-2" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
            <FileText className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
            <Award className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers">
          <Card className="bg-slate-800/50 border-purple-800/30">
            <CardHeader>
              <CardTitle className="text-white">Utility Providers Directory</CardTitle>
              <CardDescription className="text-purple-300">
                Browse and connect with utility service providers
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
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                  <option value="gas">Gas</option>
                  <option value="internet">Internet</option>
                  <option value="waste">Waste Management</option>
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
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300"><Shield className="h-3 w-3 mr-1" />Verified</Badge>
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
                      {provider.services.slice(0, 3).map((service, idx) => (
                        <Badge key={idx} variant="outline" className="text-purple-300 border-purple-700 text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                      <div className="flex items-center gap-2 text-purple-300">
                        <MapPin className="h-3 w-3" />
                        {provider.location}
                      </div>
                      <div className="flex items-center gap-2 text-purple-300">
                        <Clock className="h-3 w-3" />
                        {provider.averageResponseTime}
                      </div>
                      <div className="flex items-center gap-2 text-purple-300">
                        <DollarSign className="h-3 w-3" />
                        {provider.rateRange}
                      </div>
                      <div className="flex items-center gap-2 text-purple-300">
                        <Target className="h-3 w-3" />
                        {provider.coverageArea}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-purple-300">
                        <Activity className="h-3 w-3" />
                        {provider.activeConnections} connections
                      </div>
                      <Button variant="outline" size="sm" className="border-purple-700 text-purple-300 hover:bg-purple-900/50">
                        Request Connection
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections">
          <Card className="bg-slate-800/50 border-purple-800/30">
            <CardHeader>
              <CardTitle className="text-white">Utility Connections</CardTitle>
              <CardDescription className="text-purple-300">
                Manage utility service connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {utilityConnections.map((connection) => (
                  <div key={connection.id} className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-purple-800/30">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-white font-medium">{connection.providerName}</span>
                          <span className="text-purple-300 text-sm ml-2">{connection.id}</span>
                          {getTypeBadge(connection.utilityType)}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(connection.status)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-purple-300 mb-2">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {connection.propertyName} - {connection.unit}
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {connection.connectionType}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-purple-300 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Connected: {connection.connectionDate.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Monthly: KES {connection.monthlyRate.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-purple-300">
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          Reading: {connection.currentReading} (prev: {connection.previousReading})
                        </span>
                        {connection.nextBillingDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Next Bill: {connection.nextBillingDate.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {connection.status === 'pending' && (
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

        <TabsContent value="billing">
          <Card className="bg-slate-800/50 border-purple-800/30">
            <CardHeader>
              <CardTitle className="text-white">Utility Billing</CardTitle>
              <CardDescription className="text-purple-300">
                Track and manage utility bills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {utilityBills.map((bill) => (
                  <div key={bill.id} className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-purple-800/30">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-white font-medium">{bill.providerName}</span>
                          <span className="text-purple-300 text-sm ml-2">{bill.id}</span>
                          {getTypeBadge(bill.utilityType)}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(bill.status)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-purple-300 mb-2">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {bill.propertyName} - {bill.unit}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {bill.billingPeriod}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-purple-300 mb-2">
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          Consumption: {bill.consumption} units
                        </span>
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Rate: KES {bill.rate}/unit
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-purple-300">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Amount: KES {bill.amount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {bill.dueDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {bill.status === 'pending' && (
                      <Button variant="outline" size="sm" className="border-green-700 text-green-300 hover:bg-green-900/50">
                        Pay Bill
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
                Track utility provider performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providerPerformance.map((perf) => (
                  <div key={perf.providerId} className="p-4 bg-slate-900/50 rounded-lg border border-purple-800/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">{perf.providerName}</span>
                      <Badge variant="outline" className="text-purple-300 border-purple-700">
                        {perf.totalConnections} connections
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div>
                        <div className="text-2xl font-bold text-white">{perf.reliability}%</div>
                        <div className="text-xs text-purple-300">Reliability</div>
                        <Progress value={perf.reliability} className="h-2 mt-1" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{perf.customerSatisfaction}/5</div>
                        <div className="text-xs text-purple-300">Satisfaction</div>
                        <Progress value={(perf.customerSatisfaction / 5) * 100} className="h-2 mt-1" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{perf.outageRate}%</div>
                        <div className="text-xs text-purple-300">Outage Rate</div>
                        <Progress value={perf.outageRate * 10} className="h-2 mt-1" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{perf.resolutionTime}</div>
                        <div className="text-xs text-purple-300">Resolution Time</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-purple-300">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Avg Response: {perf.averageResponseTime}
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

export default UtilityProviders;
