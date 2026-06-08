import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Input } from '@/shared/components/ui/input';
import { Progress } from '@/shared/components/ui/progress';
import {
  AlertTriangle, Shield, CheckCircle, Clock, Search, Filter,
  Download, RefreshCw, Eye, Ban, User, CreditCard, Building,
  Activity, TrendingUp, AlertCircle, Lock, FileText, Calendar
} from 'lucide-react';

interface FraudAlert {
  id: string;
  type: 'payment' | 'identity' | 'rental' | 'application' | 'maintenance' | 'data_anomaly';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  riskScore: number;
  status: 'detected' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved';
  detectedDate: Date;
  resolvedDate?: Date;
  assignedTo: string;
  affectedEntity: string;
  entityType: 'tenant' | 'property' | 'payment' | 'application' | 'maintenance_request';
}

interface SuspiciousPattern {
  id: string;
  pattern: string;
  description: string;
  frequency: number;
  timeframe: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'monitoring' | 'resolved';
  lastDetected: Date;
}

interface FraudStatistic {
  category: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

const FraudDetectionAlerts = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  // Mock data - in production, this would come from the fraud detection analytics API
  const fraudAlerts: FraudAlert[] = [
    {
      id: 'FRAUD-001',
      type: 'payment',
      severity: 'critical',
      title: 'Suspicious Payment Pattern',
      description: 'Multiple payments from same IP address with different accounts within short timeframe',
      riskScore: 95,
      status: 'investigating',
      detectedDate: new Date('2026-06-03T10:30:00'),
      assignedTo: 'Fraud Investigation Team',
      affectedEntity: 'tenant-123',
      entityType: 'tenant'
    },
    {
      id: 'FRAUD-002',
      type: 'identity',
      severity: 'high',
      title: 'Identity Verification Failure',
      description: 'Tenant application contains inconsistent identity information',
      riskScore: 82,
      status: 'detected',
      detectedDate: new Date('2026-06-03T09:15:00'),
      assignedTo: 'Compliance Officer',
      affectedEntity: 'application-456',
      entityType: 'application'
    },
    {
      id: 'FRAUD-003',
      type: 'rental',
      severity: 'medium',
      title: 'Unusual Rental Activity',
      description: 'Tenant showing abnormal rental payment behavior compared to historical patterns',
      riskScore: 68,
      status: 'investigating',
      detectedDate: new Date('2026-06-02T16:45:00'),
      assignedTo: 'Property Manager',
      affectedEntity: 'tenant-789',
      entityType: 'tenant'
    },
    {
      id: 'FRAUD-004',
      type: 'maintenance',
      severity: 'low',
      title: 'Suspicious Maintenance Claims',
      description: 'Multiple maintenance requests for same issue with different descriptions',
      riskScore: 45,
      status: 'false_positive',
      detectedDate: new Date('2026-06-01T14:20:00'),
      resolvedDate: new Date('2026-06-02T10:00:00'),
      assignedTo: 'Maintenance Supervisor',
      affectedEntity: 'property-101',
      entityType: 'property'
    },
    {
      id: 'FRAUD-005',
      type: 'data_anomaly',
      severity: 'high',
      title: 'Data Access Anomaly',
      description: 'Unusual data access pattern detected from unknown location',
      riskScore: 78,
      status: 'investigating',
      detectedDate: new Date('2026-06-03T08:00:00'),
      assignedTo: 'Security Team',
      affectedEntity: 'system',
      entityType: 'payment'
    }
  ];

  const suspiciousPatterns: SuspiciousPattern[] = [
    {
      id: 'PAT-001',
      pattern: 'Multiple Payment Attempts',
      description: 'Same IP attempting payments with different payment methods',
      frequency: 15,
      timeframe: '24 hours',
      severity: 'critical',
      status: 'active',
      lastDetected: new Date('2026-06-03T10:30:00')
    },
    {
      id: 'PAT-002',
      pattern: 'Rapid Application Submissions',
      description: 'Multiple applications submitted with similar information',
      frequency: 8,
      timeframe: '7 days',
      severity: 'high',
      status: 'active',
      lastDetected: new Date('2026-06-02T15:00:00')
    },
    {
      id: 'PAT-003',
      pattern: 'Unusual Login Locations',
      description: 'Login attempts from geographically distant locations',
      frequency: 12,
      timeframe: '30 days',
      severity: 'medium',
      status: 'monitoring',
      lastDetected: new Date('2026-06-01T12:00:00')
    }
  ];

  const fraudStatistics: FraudStatistic[] = [
    {
      category: 'Payment Fraud',
      total: 45,
      critical: 5,
      high: 12,
      medium: 18,
      low: 10,
      resolved: 35,
      trend: 'decreasing'
    },
    {
      category: 'Identity Fraud',
      total: 28,
      critical: 3,
      high: 8,
      medium: 12,
      low: 5,
      resolved: 22,
      trend: 'stable'
    },
    {
      category: 'Rental Fraud',
      total: 32,
      critical: 2,
      high: 10,
      medium: 15,
      low: 5,
      resolved: 28,
      trend: 'increasing'
    },
    {
      category: 'Application Fraud',
      total: 18,
      critical: 1,
      high: 5,
      medium: 8,
      low: 4,
      resolved: 15,
      trend: 'stable'
    }
  ];

  const filteredAlerts = fraudAlerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || alert.type === selectedType;
    const matchesSeverity = selectedSeverity === 'all' || alert.severity === selectedSeverity;
    return matchesSearch && matchesType && matchesSeverity;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'false_positive':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />{status.replace('_', ' ')}</Badge>;
      case 'investigating':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'detected':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300"><Activity className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'confirmed':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><AlertTriangle className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'monitoring':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300"><Eye className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'active':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-600 text-white border-red-700">{severity}</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white border-orange-600">{severity}</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white border-yellow-600">{severity}</Badge>;
      case 'low':
        return <Badge className="bg-blue-500 text-white border-blue-600">{severity}</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'payment':
        return <Badge variant="outline" className="text-green-300 border-green-700"><CreditCard className="h-3 w-3 mr-1" />{type}</Badge>;
      case 'identity':
        return <Badge variant="outline" className="text-purple-300 border-purple-700"><User className="h-3 w-3 mr-1" />{type}</Badge>;
      case 'rental':
        return <Badge variant="outline" className="text-blue-300 border-blue-700"><Building className="h-3 w-3 mr-1" />{type}</Badge>;
      case 'application':
        return <Badge variant="outline" className="text-yellow-300 border-yellow-700"><FileText className="h-3 w-3 mr-1" />{type}</Badge>;
      case 'maintenance':
        return <Badge variant="outline" className="text-orange-300 border-orange-700"><AlertTriangle className="h-3 w-3 mr-1" />{type}</Badge>;
      case 'data_anomaly':
        return <Badge variant="outline" className="text-red-300 border-red-700"><Activity className="h-3 w-3 mr-1" />{type.replace('_', ' ')}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-400" />;
      case 'decreasing':
        return <TrendingUp className="h-4 w-4 text-green-400 rotate-180" />;
      case 'stable':
        return <Activity className="h-4 w-4 text-blue-400" />;
      default:
        return null;
    }
  };

  const totalAlerts = fraudAlerts.length;
  const activeAlerts = fraudAlerts.filter(a => a.status !== 'resolved' && a.status !== 'false_positive').length;
  const criticalAlerts = fraudAlerts.filter(a => a.severity === 'critical' && a.status !== 'resolved' && a.status !== 'false_positive').length;
  const resolvedThisMonth = fraudAlerts.filter(a => a.status === 'resolved' && a.resolvedDate && a.resolvedDate.getMonth() === new Date().getMonth()).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Fraud Detection Alerts</h2>
          <p className="text-purple-300 text-sm mt-1">AI-powered fraud detection and risk monitoring</p>
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
              <AlertTriangle className="h-4 w-4 text-purple-400" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{activeAlerts}</div>
            <div className="text-sm text-purple-300">Requiring attention</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-purple-400" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{criticalAlerts}</div>
            <div className="text-sm text-purple-300">High priority</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-400" />
              Resolved This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{resolvedThisMonth}</div>
            <div className="text-sm text-purple-300">Cases closed</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-400" />
              Fraud Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">0.12%</div>
            <div className="text-sm text-purple-300">of transactions</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-800/50 border border-purple-800/30">
          <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
            Overview
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="patterns" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
            <Activity className="h-4 w-4 mr-2" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="statistics" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
            <TrendingUp className="h-4 w-4 mr-2" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-slate-800/50 border-purple-800/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-purple-400" />
                  Recent Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fraudAlerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').slice(0, 3).map((alert) => (
                    <div key={alert.id} className="p-3 bg-slate-900/50 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-sm font-medium">{alert.title}</span>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      <p className="text-purple-300 text-xs mb-2">{alert.description}</p>
                      <div className="flex items-center gap-2 text-xs text-purple-300">
                        <span>Risk Score: {alert.riskScore}%</span>
                        {getStatusBadge(alert.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-purple-800/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-400" />
                  Active Suspicious Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suspiciousPatterns.filter(p => p.status === 'active').slice(0, 3).map((pattern) => (
                    <div key={pattern.id} className="p-3 bg-slate-900/50 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-sm font-medium">{pattern.pattern}</span>
                        {getSeverityBadge(pattern.severity)}
                      </div>
                      <p className="text-purple-300 text-xs mb-2">{pattern.description}</p>
                      <div className="flex items-center gap-2 text-xs text-purple-300">
                        <span>{pattern.frequency} occurrences</span>
                        <span>({pattern.timeframe})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <Card className="bg-slate-800/50 border-purple-800/30">
            <CardHeader>
              <CardTitle className="text-white">Fraud Alerts</CardTitle>
              <CardDescription className="text-purple-300">
                Monitor and investigate suspicious activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400" />
                  <Input
                    placeholder="Search alerts..."
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
                  <option value="payment">Payment</option>
                  <option value="identity">Identity</option>
                  <option value="rental">Rental</option>
                  <option value="application">Application</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="data_anomaly">Data Anomaly</option>
                </select>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="bg-slate-900/50 border border-purple-800/30 text-white rounded-md px-3 py-2"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Alerts List */}
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-purple-800/30">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-white font-medium">{alert.title}</span>
                          <span className="text-purple-300 text-sm ml-2">{alert.id}</span>
                          {getTypeBadge(alert.type)}
                        </div>
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(alert.severity)}
                          {getStatusBadge(alert.status)}
                        </div>
                      </div>
                      <p className="text-purple-300 text-sm mb-2">{alert.description}</p>
                      <div className="flex items-center gap-4 text-sm text-purple-300 mb-2">
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Risk Score: {alert.riskScore}%
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {alert.assignedTo}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {alert.affectedEntity}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-purple-300">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Detected: {alert.detectedDate.toLocaleString()}
                        </span>
                        {alert.resolvedDate && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Resolved: {alert.resolvedDate.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {alert.status !== 'resolved' && alert.status !== 'false_positive' && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-purple-700 text-purple-300 hover:bg-purple-900/50">
                          <Eye className="h-4 w-4 mr-2" />
                          Investigate
                        </Button>
                        <Button variant="outline" size="sm" className="border-red-700 text-red-300 hover:bg-red-900/50">
                          <Ban className="h-4 w-4 mr-2" />
                          Mark False Positive
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <Card className="bg-slate-800/50 border-purple-800/30">
            <CardHeader>
              <CardTitle className="text-white">Suspicious Patterns</CardTitle>
              <CardDescription className="text-purple-300">
                Monitor recurring fraudulent behavior patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suspiciousPatterns.map((pattern) => (
                  <div key={pattern.id} className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-purple-800/30">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-white font-medium">{pattern.pattern}</span>
                          <span className="text-purple-300 text-sm ml-2">{pattern.id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(pattern.severity)}
                          {getStatusBadge(pattern.status)}
                        </div>
                      </div>
                      <p className="text-purple-300 text-sm mb-2">{pattern.description}</p>
                      <div className="flex items-center gap-4 text-sm text-purple-300">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {pattern.frequency} occurrences
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {pattern.timeframe}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Last: {pattern.lastDetected.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {pattern.status === 'active' && (
                      <Button variant="outline" size="sm" className="border-purple-700 text-purple-300 hover:bg-purple-900/50">
                        <Eye className="h-4 w-4 mr-2" />
                        Monitor
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics">
          <Card className="bg-slate-800/50 border-purple-800/30">
            <CardHeader>
              <CardTitle className="text-white">Fraud Statistics</CardTitle>
              <CardDescription className="text-purple-300">
                Fraud detection metrics by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fraudStatistics.map((stat) => (
                  <div key={stat.category} className="p-4 bg-slate-900/50 rounded-lg border border-purple-800/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">{stat.category}</span>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(stat.trend)}
                        <span className="text-purple-300 text-sm capitalize">{stat.trend}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-6 gap-4 mb-3">
                      <div>
                        <div className="text-2xl font-bold text-white">{stat.total}</div>
                        <div className="text-xs text-purple-300">Total</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-400">{stat.critical}</div>
                        <div className="text-xs text-purple-300">Critical</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-400">{stat.high}</div>
                        <div className="text-xs text-purple-300">High</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-400">{stat.medium}</div>
                        <div className="text-xs text-purple-300">Medium</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-400">{stat.low}</div>
                        <div className="text-xs text-purple-300">Low</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-400">{stat.resolved}</div>
                        <div className="text-xs text-purple-300">Resolved</div>
                      </div>
                    </div>
                    <Progress value={(stat.resolved / stat.total) * 100} className="h-2" />
                    <div className="text-xs text-purple-300 mt-1">{((stat.resolved / stat.total) * 100).toFixed(1)}% resolved</div>
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

export default FraudDetectionAlerts;
