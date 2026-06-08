import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { format, differenceInDays, isPast, isFuture } from 'date-fns';
import { 
  Calendar, 
  FileText, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Home
} from 'lucide-react';

interface Lease {
  id: string;
  property: string;
  unit: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: string;
}

interface Payment {
  id: string;
  amount: number;
  paid_date: string;
  invoice_number: string;
}

interface TenantDashboardStatsProps {
  lease: Lease | null;
  recentPayments: Payment[];
  pendingInvoicesCount: number;
  overdueInvoicesCount: number;
  formatCurrency: (amount: number) => string;
}

const TenantDashboardStats: React.FC<TenantDashboardStatsProps> = ({
  lease,
  recentPayments,
  pendingInvoicesCount,
  overdueInvoicesCount,
  formatCurrency,
}) => {
  // Calculate lease expiry status
  const getLeaseExpiryInfo = () => {
    if (!lease) return null;
    
    const endDate = new Date(lease.end_date);
    const today = new Date();
    const daysUntilExpiry = differenceInDays(endDate, today);
    
    if (isPast(endDate)) {
      return {
        status: 'expired',
        message: 'Lease expired',
        variant: 'destructive' as const,
        days: Math.abs(daysUntilExpiry),
        icon: AlertTriangle,
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        status: 'expiring',
        message: `Expires in ${daysUntilExpiry} days`,
        variant: 'destructive' as const,
        days: daysUntilExpiry,
        icon: Clock,
      };
    } else if (daysUntilExpiry <= 90) {
      return {
        status: 'upcoming',
        message: `${daysUntilExpiry} days remaining`,
        variant: 'secondary' as const,
        days: daysUntilExpiry,
        icon: Calendar,
      };
    } else {
      return {
        status: 'active',
        message: 'Active lease',
        variant: 'default' as const,
        days: daysUntilExpiry,
        icon: CheckCircle2,
      };
    }
  };

  const leaseInfo = getLeaseExpiryInfo();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Lease Status Card */}
      {lease && leaseInfo && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Home className="h-4 w-4" />
              Lease Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{lease.property}</p>
                <p className="text-sm text-muted-foreground">Unit {lease.unit}</p>
              </div>
              <Badge variant={leaseInfo.variant} className="flex items-center gap-1">
                <leaseInfo.icon className="h-3 w-3" />
                {leaseInfo.message}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-muted-foreground text-xs">Start Date</p>
                <p className="font-medium">{format(new Date(lease.start_date), 'dd/MM/yy')}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-muted-foreground text-xs">End Date</p>
                <p className="font-medium">{format(new Date(lease.end_date), 'dd/MM/yy')}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Monthly Rent</span>
              <span className="font-semibold">{formatCurrency(lease.monthly_rent)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoice Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <span className="text-sm">Pending Invoices</span>
              </div>
              <Badge variant="secondary" className="text-lg font-bold px-3">
                {pendingInvoicesCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <span className="text-sm">Overdue Invoices</span>
              </div>
              <Badge 
                variant={overdueInvoicesCount > 0 ? "destructive" : "secondary"} 
                className="text-lg font-bold px-3"
              >
                {overdueInvoicesCount}
              </Badge>
            </div>
            {overdueInvoicesCount === 0 && pendingInvoicesCount === 0 && (
              <div className="flex items-center gap-2 text-sm text-success pt-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>All invoices paid!</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recent Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No recent payments
            </div>
          ) : (
            <div className="space-y-2">
              {recentPayments.slice(0, 3).map((payment) => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{payment.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.paid_date), 'dd/MM/yy')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-success">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantDashboardStats;
