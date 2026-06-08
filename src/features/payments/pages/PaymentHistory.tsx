import React, { useCallback } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { formatDate, formatDateTime12h } from '@/shared/lib/dateFormat';
import { Building2, ArrowLeft, CreditCard, Receipt, ExternalLink, Wallet, CheckCircle, LogOut, AlertCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { useOfflineData } from '@/shared/hooks/useOfflineData';
import { OfflineBanner, OfflineIndicator } from '@/shared/components/ui/offline-indicator';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import MobileBottomNav from '@/features/tenant-portal/components/MobileBottomNav';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  invoiceNumber: string | null;
  invoiceId: string | null;
  paymentMethod: string;
  receiptUrl: string | null;
  mpesaReceipt?: string | null;
  source?: 'stripe' | 'database';
}

const PaymentHistory = () => {
  const { user, signOut } = useAuth();
  const { formatCurrency: formatCurrencyHook } = useCurrency();
  const isMobile = useIsMobile();

  const fetchPayments = useCallback(async (): Promise<Payment[]> => {
    const { data, error } = await supabase.functions.invoke('get-payment-history');
    if (error) throw error;
    return data?.payments || [];
  }, []);

  const {
    data: payments,
    loading,
    isOffline,
    isFromCache,
    error,
    refetch,
  } = useOfflineData('payment_history', fetchPayments);

  const safePayments = payments || [];

  const formatCurrency = (amount: number, currency: string = 'KES') => {
    // Always use KES for display, converting the currency code to KES format
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalPaid = safePayments.reduce((acc, p) => acc + p.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-base md:text-lg">RentFlow</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Payment History</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-xs md:text-sm text-muted-foreground hidden md:block">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut} className="h-8 px-2 md:px-3">
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
        {error && !loading && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-destructive">Failed to load payment history</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {error.message || 'An unexpected error occurred. Please try again.'}
                  </p>
                  <Button variant="outline" size="sm" onClick={refetch} className="mt-3 gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back Link */}
        <Link to="/portal" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Portal
        </Link>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Transactions</p>
                  <p className="text-xl md:text-2xl font-bold">{safePayments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 md:h-6 md:w-6 text-success" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-xl md:text-2xl font-bold">{formatCurrency(totalPaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">All Payments</p>
                  <p className="text-xl md:text-2xl font-bold">Successful</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment History - Mobile Cards / Desktop Table */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Receipt className="h-4 w-4 md:h-5 md:w-5" />
              Payment History
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">All your completed payments</CardDescription>
          </CardHeader>
          <CardContent>
            {safePayments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No payments found</p>
                <p className="text-sm">Your payment history will appear here once you make a payment.</p>
              </div>
            ) : (
              <>
                {/* Mobile View - Cards */}
                <div className="md:hidden space-y-3">
                  {safePayments.map((payment) => (
                    <div key={payment.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{payment.invoiceNumber || 'Payment'}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(payment.created)}
                          </p>
                          {payment.mpesaReceipt && (
                            <p className="text-xs text-muted-foreground">
                              Receipt: {payment.mpesaReceipt}
                            </p>
                          )}
                        </div>
                        <p className="font-bold text-lg">{formatCurrency(payment.amount, payment.currency)}</p>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CreditCard className="h-3 w-3" />
                          <span className="capitalize">{payment.paymentMethod}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs py-0">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Paid
                          </Badge>
                          {payment.receiptUrl && (
                            <Button variant="ghost" size="sm" asChild className="h-7 px-2">
                              <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                                <Receipt className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View - Table */}
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safePayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {formatDateTime12h(payment.created)}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            {payment.invoiceNumber || '-'}
                            {payment.mpesaReceipt && (
                              <p className="text-xs text-muted-foreground font-normal">
                                M-Pesa: {payment.mpesaReceipt}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            {payment.paymentMethod}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="flex items-center gap-1 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            Paid
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.receiptUrl ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={payment.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="gap-1"
                              >
                                <Receipt className="h-4 w-4" />
                                View
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Offline Banner */}
      <OfflineBanner isOffline={isOffline} />

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
};

export default PaymentHistory;
