import { format } from "date-fns";
import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { formatDate } from '@/shared/lib/dateFormat';
import { Building2, FileText, CheckCircle, Clock, AlertCircle, LogOut, CreditCard, History, Smartphone, RefreshCw, Loader2, ScrollText, Upload, MessageSquare } from 'lucide-react';
import { TenantContractsSection } from '@/features/tenants/components/TenantContractsSection';
import TenantBalanceSummary from '@/features/tenant-portal/components/TenantBalanceSummary';
import TenantPaymentDetails from '@/features/tenant-portal/components/TenantPaymentDetails';
import TenantMultiUnit from '@/features/tenant-portal/components/TenantMultiUnit';
import OrphanTenantHome from '@/features/tenant-portal/components/OrphanTenantHome';
import TenantPortableHistory from '@/features/tenant-portal/components/TenantPortableHistory';
import TenantNotificationBell from '@/features/tenant-portal/components/TenantNotificationBell';
import { useSearchParams, Link } from 'react-router-dom';

import type { SupportedCurrency } from '@/shared/types/payment';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import MobileTenantHome from '@/features/tenant-portal/components/MobileTenantHome';
import MobileBottomNav from '@/features/tenant-portal/components/MobileBottomNav';
import { useOfflineData } from '@/shared/hooks/useOfflineData';
import { OfflineBanner, OfflineIndicator } from '@/shared/components/ui/offline-indicator';
import TenantDashboardStats from '@/features/tenant-portal/components/TenantDashboardStats';
import { ManagerBankDetails } from '@/features/tenant-portal/components/ManagerBankDetails';
import { ReceiptUpload } from '@/features/tenant-portal/components/ReceiptUpload';
import { ReceiptHistory } from '@/features/tenant-portal/components/ReceiptHistory';
import TenantPayNowDialog, { type PayableInvoice } from '@/features/tenant-portal/components/TenantPayNowDialog';
import TenantBillsHub from '@/features/tenant-portal/components/TenantBillsHub';
import { TenantStatsCards } from '@/features/tenant-portal/components/TenantStatsCards';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  description: string | null;
}

interface TenantInfo {
  id: string;
  name: string;
  email: string;
  property: string | null;
  unit: string | null;
  manager_id: string | null;
  property_id: string | null;
  statement_history_months: number | null;
}

interface Lease {
  id: string;
  property: string;
  unit: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: string;
}

const statusConfig = {
  pending: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
  paid: { label: 'Paid', variant: 'default' as const, icon: CheckCircle },
  overdue: { label: 'Overdue', variant: 'destructive' as const, icon: AlertCircle },
  cancelled: { label: 'Cancelled', variant: 'outline' as const, icon: AlertCircle },
};

const TenantPortal = () => {
  const { user, userRole, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  // STK push dialog — opens for KES payments via M-Pesa STK directly
  const [stkDialogOpen, setStkDialogOpen] = useState(false);
  const [stkInvoices, setStkInvoices] = useState<PayableInvoice[]>([]);
  const [tenantPhone, setTenantPhone] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('USD');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pendingPaymentRef, setPendingPaymentRef] = useState<string | null>(null);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [receiptRefresh, setReceiptRefresh] = useState(0);

  // Fetch tenant info with offline support
  const fetchTenantInfo = useCallback(async (): Promise<TenantInfo | null> => {
    if (!userRole?.tenant_id) return null;
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, email, property, unit, property_id, manager_id, statement_history_months')
      .eq('id', userRole.tenant_id)
      .single();
    if (error) throw error;
    
    // Use manager_id from tenant directly, fallback to property's manager_id
    let managerId: string | null = data.manager_id;
    if (!managerId && data?.property_id) {
      const { data: propertyData } = await supabase
        .from('properties')
        .select('manager_id')
        .eq('id', data.property_id)
        .single();
      managerId = propertyData?.manager_id || null;
    }

    // If manager_id is a submanager, resolve to the main manager
    // (submanagers don't own invoices / payment settings — the main manager does)
    if (managerId) {
      const { data: subPerm } = await supabase
        .from('submanager_permissions')
        .select('manager_id')
        .eq('submanager_user_id', managerId)
        .maybeSingle();
      if (subPerm?.manager_id) {
        managerId = subPerm.manager_id;
      }
    }
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      property: data.property,
      unit: data.unit,
      manager_id: managerId,
      property_id: data.property_id || null,
      statement_history_months: data.statement_history_months,
    };
  }, [userRole?.tenant_id]);

  // Fetch invoices with offline support
  const fetchInvoices = useCallback(async (): Promise<Invoice[]> => {
    if (!userRole?.tenant_id) return [];
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', userRole.tenant_id)
      .order('due_date', { ascending: false });
    if (error) throw error;
    return (data as Invoice[]) || [];
  }, [userRole?.tenant_id]);

  // Fetch lease with offline support
  const fetchLease = useCallback(async (): Promise<Lease | null> => {
    if (!userRole?.tenant_id) return null;
    const { data, error } = await supabase
      .from('leases')
      .select('id, property, unit, start_date, end_date, monthly_rent, status')
      .eq('tenant_id', userRole.tenant_id)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    return data as Lease | null;
  }, [userRole?.tenant_id]);

  const {
    data: tenantInfo,
    loading: tenantLoading,
    isOffline,
    isFromCache: tenantFromCache,
    error: tenantError,
    refetch: refetchTenant,
  } = useOfflineData(`tenant_${userRole?.tenant_id}`, fetchTenantInfo, {
    enabled: !!userRole?.tenant_id,
  });

  const {
    data: invoices,
    loading: invoicesLoading,
    isFromCache: invoicesFromCache,
    refetch: refetchInvoices,
    error: invoicesError,
  } = useOfflineData(`invoices_${userRole?.tenant_id}`, fetchInvoices, {
    enabled: !!userRole?.tenant_id,
  });

  const {
    data: lease,
    loading: leaseLoading,
    isFromCache: leaseFromCache,
    error: leaseError,
    refetch: refetchLease,
  } = useOfflineData(`lease_${userRole?.tenant_id}`, fetchLease, {
    enabled: !!userRole?.tenant_id,
  });

  const loading = tenantLoading || invoicesLoading || leaseLoading;
  const isFromCache = tenantFromCache || invoicesFromCache || leaseFromCache;

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('phone').eq('id', user.id).maybeSingle()
      .then(({ data }) => setTenantPhone(data?.phone ?? null));
  }, [user?.id]);

  // Filter invoices based on statement_history_months setting
  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];
    if (!tenantInfo?.statement_history_months) return invoices;
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - tenantInfo.statement_history_months);
    
    return invoices.filter(invoice => new Date(invoice.due_date) >= cutoffDate);
  }, [invoices, tenantInfo?.statement_history_months]);

  // Handle payment return from Stripe - only show notification, actual update via webhook
  useEffect(() => {
    const payment = searchParams.get('payment');

    if (payment === 'success') {
      toast({
        title: 'Payment processing',
        description: 'Please wait while we confirm your payment. This may take a few moments.',
      });
      // Refetch invoices after a delay - webhook will have updated status
      setTimeout(() => refetchInvoices(), 3000);
      setSearchParams({});
    } else if (payment === 'cancelled') {
      toast({
        title: 'Payment cancelled',
        description: 'Your payment was not processed.',
        variant: 'destructive',
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, refetchInvoices]);

  const handlePayInvoice = async () => {
    if (!selectedInvoice) return;

    // Validate phone number for M-Pesa payments
    if (selectedCurrency === 'KES' && !phoneNumber.trim()) {
      toast({
        title: 'Phone number required',
        description: 'Please enter your M-Pesa phone number.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (selectedCurrency === 'USD') {
        // Stripe checkout for USD
        const { data, error } = await supabase.functions.invoke('create-invoice-checkout', {
          body: {
            invoiceId: selectedInvoice.id,
            invoiceNumber: selectedInvoice.invoice_number,
            amount: Number(selectedInvoice.amount),
            description: selectedInvoice.description || 'Monthly Rent Payment',
          },
        });

        if (error) throw error;

        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error('No checkout URL received');
        }
      } else {
        // M-Pesa payment via Paystack
        const { data, error } = await supabase.functions.invoke('initiate-mpesa-payment', {
          body: {
            invoiceId: selectedInvoice.id,
            invoiceNumber: selectedInvoice.invoice_number,
            amount: Number(selectedInvoice.amount),
            phoneNumber: phoneNumber,
            email: tenantInfo?.email || user?.email,
            description: selectedInvoice.description || 'Monthly Rent Payment',
          },
        });

        if (error) throw error;

        if (data?.success) {
          toast({
            title: 'M-Pesa Request Sent',
            description: data.message || 'Please check your phone and enter your M-Pesa PIN to complete payment.',
          });
          // Store reference for verification
          if (data.reference) {
            setPendingPaymentRef(data.reference);
            setPendingInvoiceId(selectedInvoice.id);
            setVerifyDialogOpen(true);
          }
          setPayDialogOpen(false);
          setSelectedInvoice(null);
          setPhoneNumber('');
        } else {
          throw new Error(data?.error || 'Failed to initiate M-Pesa payment');
        }
        setIsProcessing(false);
      }
    } catch (error) {
      toast({
        title: 'Payment failed',
        description: 'Unable to start payment process. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setPayDialogOpen(false);
      setSelectedInvoice(null);
    }
  };

  const formatCurrency = (amount: number) => {
    // For tenant portal, always use KES as the default display currency
    // since this is primarily a Kenyan rental platform
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const openStkPay = (invoices: PayableInvoice[]) => {
    if (!invoices.length) return;
    setStkInvoices(invoices);
    setStkDialogOpen(true);
  };

  const openPayDialog = (invoice: Invoice) => {
    openStkPay([invoice as PayableInvoice]);
  };

  const handleVerifyPayment = async () => {
    if (!pendingPaymentRef) return;

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-mpesa-payment', {
        body: { reference: pendingPaymentRef },
      });

      if (error) throw error;

      if (data?.status === 'success') {
        toast({
          title: 'Payment Successful!',
          description: 'Your M-Pesa payment has been confirmed.',
        });
        // Refresh invoices to get updated status
        refetchInvoices();
        setVerifyDialogOpen(false);
        setPendingPaymentRef(null);
        setPendingInvoiceId(null);
      } else if (data?.status === 'pending') {
        toast({
          title: 'Payment Pending',
          description: 'Your payment is still being processed. Please complete the M-Pesa prompt on your phone.',
        });
      } else if (data?.status === 'failed') {
        toast({
          title: 'Payment Failed',
          description: 'The payment was not successful. Please try again.',
          variant: 'destructive',
        });
        setVerifyDialogOpen(false);
        setPendingPaymentRef(null);
        setPendingInvoiceId(null);
      } else {
        toast({
          title: 'Status Update',
          description: data?.message || `Payment status: ${data?.status}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: 'Unable to check payment status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const safeInvoices = filteredInvoices || [];

  const stats = {
    totalDue: safeInvoices.filter((i) => i.status === 'pending' || i.status === 'overdue').reduce(
      (acc, i) => acc + Number((i as PayableInvoice).balance_due ?? i.amount),
      0,
    ),
    paidThisYear: safeInvoices.filter((i) => i.status === 'paid' && i.paid_date && new Date(i.paid_date).getFullYear() === new Date().getFullYear()).reduce((acc, i) => acc + Number(i.amount), 0),
    pendingCount: safeInvoices.filter((i) => i.status === 'pending').length,
    overdueCount: safeInvoices.filter((i) => i.status === 'overdue').length,
  };

  // Get recent paid invoices for the dashboard
  const recentPayments = safeInvoices
    .filter((i) => i.status === 'paid' && i.paid_date)
    .sort((a, b) => new Date(b.paid_date!).getTime() - new Date(a.paid_date!).getTime())
    .slice(0, 3)
    .map((i) => ({
      id: i.id,
      amount: Number(i.amount),
      paid_date: i.paid_date!,
      invoice_number: i.invoice_number,
    }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Get urgent invoices (pending or overdue)
  const urgentInvoices = safeInvoices.filter(i => i.status === 'pending' || i.status === 'overdue');

  const propertyInfo = tenantInfo?.property && tenantInfo?.unit
    ? `${tenantInfo.property} - Unit ${tenantInfo.unit}`
    : 'View and manage your invoices below.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="border-b border-border/50 bg-white/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <Building2 className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-base md:text-lg text-foreground">RentFlow</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Tenant Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-xs md:text-sm text-muted-foreground hidden md:block">{user?.email}</span>
            <TenantNotificationBell />
            <Button variant="outline" size="sm" onClick={signOut} className="h-8 px-2 md:px-3 rounded-xl border-border hover:bg-primary/50 hover:text-primary-foreground transition-all duration-200">
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-8">
        {/* Offline indicator */}
        {(isOffline || isFromCache) && (
          <OfflineIndicator isOffline={isOffline} isFromCache={isFromCache} className="mb-4" />
        )}

        {/* Error state */}
        {(tenantError || invoicesError || leaseError) && (
          <Card className="mb-6 rounded-2xl border border-destructive/50 bg-gradient-to-br from-destructive/5 to-destructive/10 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-destructive/10 p-2">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-destructive">Failed to load portal data</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tenantError?.message || invoicesError?.message || leaseError?.message || 'An unexpected error occurred.'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { refetchTenant(); refetchInvoices(); refetchLease(); }}
                    className="mt-3 gap-2 rounded-xl border-destructive/50 hover:bg-destructive/10 transition-all duration-200"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Demo mode banner */}
        {user?.email?.includes('@rentflow.ink') && (
          <div className="mb-4 rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-50/80 to-amber-100/50 px-4 py-3 shadow-sm">
            <span className="text-sm text-amber-800 font-medium"><strong>Demo mode</strong> — sample data</span>
          </div>
        )}

        {/* ── Orphan tenant: no manager link ── */}
        {/* When userRole.tenant_id is null (self-registered) OR
            tenant has no manager_id, show the independent diary */}
        {(!userRole?.tenant_id || (!tenantLoading && !tenantInfo?.manager_id)) && !tenantLoading && (
          <div className="space-y-4">
            <div className="mb-6">
              <h1 className="text-xl font-bold">My Rental</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Track your payments, receipts and property condition independently
              </p>
            </div>
            <OrphanTenantHome />
          </div>
        )}

        {/* ── Linked tenant: has manager_id — full portal ── */}
        {userRole?.tenant_id && tenantInfo?.manager_id && (<>

        {/* Mobile View */}
        {isMobile ? (
          <MobileTenantHome
            tenantName={tenantInfo?.name || 'Tenant'}
            greeting={getGreeting()}
            propertyInfo={propertyInfo}
            stats={stats}
            urgentInvoices={urgentInvoices}
            lease={lease}
            managerId={tenantInfo?.manager_id}
            propertyId={tenantInfo?.property_id}
            formatCurrency={(amount) => formatCurrency(amount)}
            onPayInvoice={openPayDialog}
          />
        ) : (
          <>
            {/* Desktop Welcome Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">
                {getGreeting()}, {tenantInfo?.name?.split(' ')[0] || 'there'}! 👋
              </h2>
              <p className="text-muted-foreground">{propertyInfo}</p>
            </div>

            {/* Dashboard Stats */}
            <TenantDashboardStats
              lease={lease}
              recentPayments={recentPayments}
              pendingInvoicesCount={stats.pendingCount}
              overdueInvoicesCount={stats.overdueCount}
              formatCurrency={(amount) => formatCurrency(amount)}
            />

            {/* Stats Cards */}
            <TenantStatsCards
              totalDue={stats.totalDue}
              paidThisYear={stats.paidThisYear}
              pendingCount={stats.pendingCount}
              overdueCount={stats.overdueCount}
              formatCurrency={(amount) => formatCurrency(amount)}
            />

        {/* Lease expiry warning — shown ≤60 days before expiry */}
        {lease && (() => {
          const daysLeft = Math.ceil((new Date(lease.end_date).getTime() - Date.now()) / 86_400_000);
          if (daysLeft > 60 || daysLeft < -30) return null;
          const isExpired = daysLeft <= 0;
          const isUrgent  = daysLeft <= 14;
          return (
            <div className={`mb-4 rounded-2xl border p-4 flex items-start gap-3 shadow-sm transition-all duration-300 ${
              isUrgent 
                ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-300/50' 
                : 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-300/50'
            }`}>
              <div className="rounded-xl bg-white p-2 shadow-sm">
                <span className="text-2xl shrink-0">{isExpired ? '❌' : isUrgent ? '🚨' : '⚠️'}</span>
              </div>
              <div>
                <p className={`font-semibold text-sm ${isUrgent ? 'text-red-800' : 'text-amber-800'}`}>
                  {isExpired ? 'Your lease has expired' : `Lease expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                </p>
                <p className={`text-xs mt-0.5 ${isUrgent ? 'text-red-700' : 'text-amber-700'}`}>
                  {isExpired
                    ? 'Contact your manager to discuss renewal or move-out.'
                    : `Ends ${format(new Date(lease.end_date), 'dd/MM/yy')}. Speak to your manager about renewal.`}
                </p>
              </div>
            </div>
          );
        })()}

        {/* ── Hero Balance Card — overdue / pending / clear states ── */}
        {(() => {
          const hasOverdue = stats.overdueCount > 0;
          const hasPending = stats.pendingCount > 0;
          const isAllClear = !hasOverdue && !hasPending;

          // Lease progress bar
          const leaseProgress = lease ? (() => {
            const start = new Date(lease.start_date).getTime();
            const end = new Date(lease.end_date).getTime();
            const now = Date.now();
            const total = end - start;
            const elapsed = now - start;
            const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
            const daysLeft = Math.max(0, Math.ceil((end - now) / 86_400_000));
            return { pct, daysLeft };
          })() : null;

          if (isAllClear) {
            return (
              <div className="mb-6 rounded-2xl p-5 border-2 bg-gradient-to-br from-green-50 to-emerald-100/50 border-green-300/50 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle className="h-7 w-7 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-green-900">All paid up!</p>
                      <p className="text-sm text-green-700">No pending invoices</p>
                      {recentPayments.length > 0 && (
                        <p className="text-xs text-green-600 mt-0.5">
                          Last payment: {recentPayments[0].invoice_number} &middot; {formatCurrency(recentPayments[0].amount)}
                        </p>
                      )}
                    </div>
                  </div>
                  {leaseProgress && (
                    <div className="w-full sm:w-48">
                      <div className="flex justify-between text-xs text-green-700 mb-1">
                        <span>{Math.round(leaseProgress.pct)}% elapsed</span>
                        <span>{leaseProgress.daysLeft} days left</span>
                      </div>
                      <div className="h-2 bg-green-200/50 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${leaseProgress.pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          const mostUrgent = urgentInvoices.sort((a, b) => {
            if (a.status === 'overdue' && b.status !== 'overdue') return -1;
            if (b.status === 'overdue' && a.status !== 'overdue') return  1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          })[0];
          const balanceDue = Number((mostUrgent as PayableInvoice).balance_due ?? mostUrgent.amount);
          const isOverdue  = mostUrgent.status === 'overdue';
          return (
            <div className={`mb-6 rounded-2xl p-5 border-2 shadow-sm hover:shadow-md transition-all duration-300 ${
              isOverdue 
                ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-300/50' 
                : 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-300/50'
            }`}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                    isOverdue ? 'bg-gradient-to-br from-red-100 to-red-200' : 'bg-gradient-to-br from-amber-100 to-amber-200'
                  }`}>
                    <Smartphone className={`h-7 w-7 ${isOverdue ? 'text-red-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <p className={`font-bold text-lg ${isOverdue ? 'text-red-900' : 'text-amber-900'}`}>
                      {isOverdue ? 'Payment overdue' : 'Rent due'}
                    </p>
                    <p className={`text-sm ${isOverdue ? 'text-red-700' : 'text-amber-700'}`}>
                      {mostUrgent.invoice_number}
                      {urgentInvoices.length > 1 && ` + ${urgentInvoices.length - 1} more`}
                    </p>
                    <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                      Due {format(new Date(mostUrgent.due_date), 'dd/MM')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${isOverdue ? 'text-red-800' : 'text-amber-800'}`}>
                      {formatCurrency(balanceDue)}
                    </p>
                    {urgentInvoices.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        Total: {formatCurrency(stats.totalDue)}
                      </p>
                    )}
                  </div>
                  <Button
                    size="lg"
                    className={`gap-2 h-12 px-6 text-base font-semibold shadow-lg rounded-xl transition-all duration-200 ${
                      isOverdue ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                    } text-white`}
                    onClick={() => openStkPay(urgentInvoices as PayableInvoice[])}
                  >
                    <Smartphone className="h-5 w-5" />
                    Pay via M-Pesa
                  </Button>
                </div>
              </div>
              {leaseProgress && (
                <div className="mt-3 pt-3 border-t border-white/40">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{Math.round(leaseProgress.pct)}% of lease elapsed</span>
                    <span>{leaseProgress.daysLeft} days remaining</span>
                  </div>
                  <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      isOverdue ? 'bg-red-400' : 'bg-amber-400'
                    }`} style={{ width: `${leaseProgress.pct}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Bills hub — rent, water, security, amenities */}
        {userRole?.tenant_id && (
          <div className="mb-8">
            <TenantBillsHub
              tenantId={userRole.tenant_id}
              onPay={openStkPay}
            />
          </div>
        )}

        {/* Bank Details Section */}
        {tenantInfo?.manager_id && (
          <div className="mb-8">
            <ManagerBankDetails 
              managerId={tenantInfo.manager_id} 
              propertyId={tenantInfo.property_id || undefined}
            />
          </div>
        )}

        {/* Receipt Upload Section */}
        {tenantInfo?.id && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ReceiptUpload
              tenantId={tenantInfo.id}
              invoices={safeInvoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')}
              onUploadComplete={() => setReceiptRefresh(prev => prev + 1)}
            />
            <ReceiptHistory
              tenantId={tenantInfo.id}
              refreshTrigger={receiptRefresh}
            />
          </div>
        )}

        {/* Balance & Credit Summary */}
        {tenantInfo && user && (
          <div className="mb-8">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Account Balance
            </h2>
            <TenantBalanceSummary tenantId={tenantInfo.id} userId={user.id} />
          </div>
        )}

        {/* Payment terms & M-Pesa details — set by manager at registration */}
        {userRole?.tenant_id && (
          <div className="mb-8">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment details
            </h2>
            <TenantPaymentDetails />
          </div>
        )}

        {/* Multi-unit: show all units if tenant has more than one */}
        {userRole?.tenant_id && (
          <div className="mb-8">
            <TenantMultiUnit tenantId={userRole.tenant_id} />
          </div>
        )}

        {/* My Rental History — portable across all units ever lived in */}
        <div className="mb-8">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <History className="h-4 w-4" />
            My Rental History
          </h2>
          <TenantPortableHistory />
        </div>

        {/* Contracts Section */}
        <div className="mb-8">
          <TenantContractsSection />
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Your Invoices
              </CardTitle>
              <CardDescription>View and pay your rent invoices</CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link to="/portal/payments" className="gap-2">
                <History className="h-4 w-4" />
                Payment History
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/portal/inbox" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Inbox
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/portal/documents" className="gap-2">
                <FileText className="h-4 w-4" />
                Documents
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {safeInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No invoices found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeInvoices.map((invoice) => {
                    const StatusIcon = statusConfig[invoice.status].icon;
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.description || 'Monthly Rent'}</TableCell>
                        <TableCell>{formatDate(invoice.due_date)}</TableCell>
                        <TableCell className="font-semibold">
                          {(invoice as PayableInvoice).balance_due != null && Number((invoice as PayableInvoice).balance_due) !== Number(invoice.amount)
                            ? (
                              <div>
                                <span>{formatCurrency(Number((invoice as PayableInvoice).balance_due))}</span>
                                <p className="text-xs text-muted-foreground font-normal">
                                  of {formatCurrency(Number(invoice.amount))}
                                </p>
                              </div>
                            )
                            : formatCurrency(Number(invoice.amount))
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[invoice.status].variant} className="flex items-center gap-1 w-fit">
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig[invoice.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                              onClick={() => openStkPay([invoice as PayableInvoice])}
                            >
                              <Smartphone className="h-3.5 w-3.5" />
                              Pay Now
                            </Button>
                          )}
                          {invoice.status === 'paid' && invoice.paid_date && (
                            <span className="text-sm text-muted-foreground">
                              Paid {formatDate(invoice.paid_date)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </>
        )}
        {/* End linked-tenant section */}
        </>)}
      </main>

      {/* Pay Invoice Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pay Invoice
            </DialogTitle>
            <DialogDescription>
              Choose your preferred payment method and currency.
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Number</span>
                <span className="font-medium">{selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-lg">{formatCurrency(Number(selectedInvoice.amount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span>{formatDate(selectedInvoice.due_date)}</span>
              </div>

              {/* Currency Selector */}
              <div className="space-y-2 pt-2 border-t">
                <Label>Payment Method</Label>
                <Select value={selectedCurrency} onValueChange={(value: SupportedCurrency) => setSelectedCurrency(value)}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="USD">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>USD - Pay with Card (Stripe)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="KES">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        <span>KES - Pay with M-Pesa</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* M-Pesa Phone Number Input */}
              {selectedCurrency === 'KES' && (
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">M-Pesa Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="0712345678 or +254712345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: 07XXXXXXXX or +254XXXXXXXXX
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handlePayInvoice} disabled={isProcessing} className="gap-2">
              {selectedCurrency === 'USD' ? (
                <>
                  <CreditCard className="h-4 w-4" />
                  {isProcessing ? 'Redirecting...' : 'Pay with Card'}
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4" />
                  {isProcessing ? 'Processing...' : 'Pay with M-Pesa'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Verification Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              M-Pesa Payment Status
            </DialogTitle>
            <DialogDescription>
              Check the status of your M-Pesa payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center py-6">
              <div className="text-center space-y-3">
                <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Complete the M-Pesa prompt on your phone, then click below to verify.
                </p>
                {pendingPaymentRef && (
                  <p className="text-xs text-muted-foreground">
                    Reference: {pendingPaymentRef}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setVerifyDialogOpen(false);
                setPendingPaymentRef(null);
                setPendingInvoiceId(null);
              }}
            >
              Close
            </Button>
            <Button onClick={handleVerifyPayment} disabled={isVerifying} className="gap-2">
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Check Payment Status
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* M-Pesa STK Push Dialog — real-time polling, replaces manual verify flow */}
      {stkInvoices.length > 0 && (
        <TenantPayNowDialog
          invoices={stkInvoices}
          tenantPhone={tenantPhone ?? undefined}
          open={stkDialogOpen}
          onOpenChange={(open) => {
            setStkDialogOpen(open);
            if (!open) setStkInvoices([]);
          }}
          onPaymentSuccess={() => {
            setStkDialogOpen(false);
            setStkInvoices([]);
            queryClient.invalidateQueries({ queryKey: ['tenant-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['tenant-bills-hub'] });
          }}
        />
      )}

      {/* Offline Banner */}
      <OfflineBanner isOffline={isOffline} />

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
};

export default TenantPortal;
