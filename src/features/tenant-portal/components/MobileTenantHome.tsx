import React from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { format, differenceInDays, isPast } from 'date-fns';
import { 
  Clock, 
  AlertCircle, 
  CreditCard, 
  Smartphone,
  ChevronRight,
  History,
  FileText,
  Wallet,
  Home,
  Calendar,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ManagerBankDetails } from './ManagerBankDetails';
import { ManagerContactCard } from './ManagerContactCard';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  description: string | null;
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

interface MobileTenantHomeProps {
  tenantName: string;
  greeting: string;
  propertyInfo: string;
  stats: {
    totalDue: number;
    paidThisYear: number;
    pendingCount: number;
    overdueCount: number;
  };
  urgentInvoices: Invoice[];
  lease?: Lease | null;
  managerId?: string | null;
  propertyId?: string | null;
  formatCurrency: (amount: number) => string;
  onPayInvoice: (invoice: Invoice) => void;
}

const MobileTenantHome: React.FC<MobileTenantHomeProps> = ({
  tenantName,
  greeting,
  propertyInfo,
  stats,
  urgentInvoices,
  lease,
  managerId,
  propertyId,
  formatCurrency,
  onPayInvoice,
}) => {
  const firstName = tenantName.split(' ')[0];

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
        message: `${daysUntilExpiry} days left`,
        variant: 'destructive' as const,
        days: daysUntilExpiry,
        icon: Clock,
      };
    } else if (daysUntilExpiry <= 90) {
      return {
        status: 'upcoming',
        message: `${daysUntilExpiry} days left`,
        variant: 'secondary' as const,
        days: daysUntilExpiry,
        icon: Calendar,
      };
    } else {
      return {
        status: 'active',
        message: 'Active',
        variant: 'default' as const,
        days: daysUntilExpiry,
        icon: CheckCircle2,
      };
    }
  };

  const leaseInfo = getLeaseExpiryInfo();

  return (
    <div className="space-y-6 pb-20">
      {/* Balance Hero Card */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 overflow-hidden relative">
        <CardContent className="pt-6 pb-8">
          <div className="relative z-10">
            <p className="text-sm opacity-90 mb-1">{greeting}, {firstName}! 👋</p>
            <p className="text-xs opacity-75 mb-4">{propertyInfo}</p>
            
            <div className="mb-6">
              <p className="text-sm opacity-80 mb-1">Total Balance Due</p>
              <p className="text-4xl font-bold tracking-tight">
                {formatCurrency(stats.totalDue)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-primary-foreground/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <Wallet className="h-5 w-5 mx-auto mb-1 opacity-90" />
                <p className="text-xs opacity-75">Paid</p>
                <p className="font-semibold text-sm">{formatCurrency(stats.paidThisYear)}</p>
              </div>
              <div className="bg-primary-foreground/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <Clock className="h-5 w-5 mx-auto mb-1 opacity-90" />
                <p className="text-xs opacity-75">Pending</p>
                <p className="font-semibold text-sm">{stats.pendingCount}</p>
              </div>
              <div className="bg-primary-foreground/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <AlertCircle className="h-5 w-5 mx-auto mb-1 opacity-90" />
                <p className="text-xs opacity-75">Overdue</p>
                <p className="font-semibold text-sm text-destructive-foreground">{stats.overdueCount}</p>
              </div>
            </div>
          </div>
          {/* Decorative element */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary-foreground/5 rounded-full" />
          <div className="absolute -right-5 -bottom-10 w-32 h-32 bg-primary-foreground/5 rounded-full" />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/portal/payments">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <History className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-sm">Payment History</p>
              <p className="text-xs text-muted-foreground">View all payments</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/portal#contracts">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <p className="font-medium text-sm">Contracts</p>
              <p className="text-xs text-muted-foreground">View & sign</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Lease Status Card */}
      {lease && leaseInfo && (
        <Card className="overflow-hidden border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Your Lease</span>
              </div>
              <Badge variant={leaseInfo.variant} className="text-xs">
                <leaseInfo.icon className="h-3 w-3 mr-1" />
                {leaseInfo.message}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Property</p>
                <p className="font-medium">{lease.property}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Unit</p>
                <p className="font-medium">{lease.unit}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Monthly Rent</p>
                <p className="font-medium">{formatCurrency(lease.monthly_rent)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">End Date</p>
                <p className="font-medium">{format(new Date(lease.end_date), 'dd/MM/yy')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Urgent Invoices */}
      {urgentInvoices.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Pay Now</h3>
            <Badge variant="destructive" className="text-xs">
              {urgentInvoices.length} due
            </Badge>
          </div>
          <div className="space-y-3">
            {urgentInvoices.map((invoice) => (
              <Card key={invoice.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center">
                    <div className="flex-1 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{invoice.invoice_number}</span>
                        {invoice.status === 'overdue' && (
                          <Badge variant="destructive" className="text-xs py-0">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {invoice.description || 'Monthly Rent'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due {format(new Date(invoice.due_date), 'dd/MM/yy')}
                      </p>
                    </div>
                    <div className="text-right pr-2">
                      <p className="font-bold text-lg">{formatCurrency(Number(invoice.amount))}</p>
                    </div>
                    <Button 
                      onClick={() => onPayInvoice(invoice)}
                      className="h-full rounded-none px-4 py-6"
                      size="lg"
                    >
                      Pay
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Payment Prompt - Show when there are pending invoices */}
      {urgentInvoices.length > 0 && managerId && (
        <Card className="bg-gradient-to-r from-success/10 to-primary/10 border-success/30 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm mb-1">Ready to pay?</p>
                <p className="text-xs text-muted-foreground">
                  View your landlord's bank details below to make a direct payment via bank transfer or M-Pesa.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manager Contact Info */}
      {managerId && <ManagerContactCard managerId={managerId} propertyId={propertyId} />}

      {/* Manager Bank Details */}
      {managerId && <ManagerBankDetails managerId={managerId} propertyId={propertyId || undefined} />}

      {/* Payment Methods Info */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Accepted Payment Methods</p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Card (USD)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span>M-Pesa (KES)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No payments due state */}
      {urgentInvoices.length === 0 && stats.totalDue === 0 && (
        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-6 text-center">
            <div className="h-16 w-16 mx-auto rounded-full bg-success/20 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <p className="font-medium text-success">All Paid Up!</p>
            <p className="text-sm text-muted-foreground mt-1">
              You have no outstanding payments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MobileTenantHome;
