import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Receipt, Download, CheckCircle, Users, Percent, Search, Calendar, Filter } from 'lucide-react';
import { generateManagerReceipt } from '@/features/billing/lib/managerReceiptPdfExport';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

interface Manager {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
}

interface ManagerInvoice {
  id: string;
  manager_user_id: string;
  invoice_number: string;
  amount: number;
  description: string | null;
  status: string;
  due_date: string;
  paid_date: string | null;
  created_at: string;
  property_count: number;
  rate_per_property: number;
  invoice_type: string;
  net_collection: number;
  commission_rate: number;
}

interface ManagerReceiptsProps {
  managers: Manager[] | undefined;
  invoices: ManagerInvoice[] | undefined;
  isLoading: boolean;
}

const ManagerReceipts: React.FC<ManagerReceiptsProps> = ({ managers, invoices, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'registration' | 'subscription'>('all');
  const [filterMonth, setFilterMonth] = useState('all');

  // Generate month options for the last 12 months
  const monthOptions = React.useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      });
    }
    return options;
  }, []);

  // Apply filters
  const filteredReceipts = React.useMemo(() => {
    // Filter to only show paid invoices (receipts)
    const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];
    return paidInvoices.filter(invoice => {
      // Search filter
      const manager = managers?.find(m => m.user_id === invoice.manager_user_id);
      const searchMatch = 
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (manager?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (manager?.email?.toLowerCase().includes(searchTerm.toLowerCase()));

      // Type filter
      const typeMatch = filterType === 'all' || invoice.invoice_type === filterType;

      // Month filter
      let monthMatch = true;
      if (filterMonth !== 'all' && invoice.paid_date) {
        const invoiceMonth = format(parseISO(invoice.paid_date), 'yyyy-MM');
        monthMatch = invoiceMonth === filterMonth;
      }

      return searchMatch && typeMatch && monthMatch;
    });
  }, [invoices, managers, searchTerm, filterType, filterMonth]);

  const getManagerName = (userId: string) => {
    const manager = managers?.find(m => m.user_id === userId);
    return manager?.full_name || manager?.email || 'Unknown';
  };

  const getManagerEmail = (userId: string) => {
    const manager = managers?.find(m => m.user_id === userId);
    return manager?.email || '';
  };

  const getInvoiceTypeBadge = (type: string) => {
    if (type === 'registration') {
      return (
        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
          <Users className="h-3 w-3 mr-1" />
          Registration
        </Badge>
      );
    }
    return (
      <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
        <Percent className="h-3 w-3 mr-1" />
        Subscription
      </Badge>
    );
  };

  const handleDownloadReceipt = (invoice: ManagerInvoice) => {
    const manager = managers?.find(m => m.user_id === invoice.manager_user_id);
    generateManagerReceipt(invoice, {
      full_name: manager?.full_name || null,
      email: manager?.email || '',
    });
  };

  // Calculate summary stats
  const stats = React.useMemo(() => {
    const totalCollected = filteredReceipts.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const registrationTotal = filteredReceipts
      .filter(inv => inv.invoice_type === 'registration')
      .reduce((sum, inv) => sum + Number(inv.amount), 0);
    const subscriptionTotal = filteredReceipts
      .filter(inv => inv.invoice_type === 'subscription')
      .reduce((sum, inv) => sum + Number(inv.amount), 0);
    
    return { totalCollected, registrationTotal, subscriptionTotal, count: filteredReceipts.length };
  }, [filteredReceipts]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-purple-300">Total Collected</p>
                <p className="text-2xl font-bold text-white">KES {stats.totalCollected.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-purple-300">Registration Fees</p>
                <p className="text-2xl font-bold text-white">KES {stats.registrationTotal.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Percent className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-purple-300">Subscriptions</p>
                <p className="text-2xl font-bold text-white">KES {stats.subscriptionTotal.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-purple-300">Total Receipts</p>
                <p className="text-2xl font-bold text-white">{stats.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      <Card className="bg-slate-800/50 border-purple-800/30">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Receipt className="h-5 w-5 text-purple-400" />
                Payment Receipts
              </CardTitle>
              <CardDescription className="text-purple-300">
                Completed payments and downloadable receipts
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                <Input
                  placeholder="Search receipts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-slate-700 border-purple-700/50 text-white w-48"
                />
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger className="bg-slate-700 border-purple-700/50 text-white w-40">
                  <Filter className="h-4 w-4 mr-2 text-purple-400" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-purple-700/50">
                  <SelectItem value="all" className="text-white">All Types</SelectItem>
                  <SelectItem value="registration" className="text-white">Registration</SelectItem>
                  <SelectItem value="subscription" className="text-white">Subscription</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="bg-slate-700 border-purple-700/50 text-white w-44">
                  <Calendar className="h-4 w-4 mr-2 text-purple-400" />
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-purple-700/50">
                  <SelectItem value="all" className="text-white">All Time</SelectItem>
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-white">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-700 rounded"></div>
              ))}
            </div>
          ) : filteredReceipts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-purple-800/30 hover:bg-transparent">
                  <TableHead className="text-purple-300">Receipt #</TableHead>
                  <TableHead className="text-purple-300">Type</TableHead>
                  <TableHead className="text-purple-300">Manager</TableHead>
                  <TableHead className="text-purple-300">Amount</TableHead>
                  <TableHead className="text-purple-300">Paid Date</TableHead>
                  <TableHead className="text-purple-300">Net Collection</TableHead>
                  <TableHead className="text-purple-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((invoice) => (
                  <TableRow key={invoice.id} className="border-purple-800/30 hover:bg-purple-900/20">
                    <TableCell className="text-white font-mono">{invoice.invoice_number}</TableCell>
                    <TableCell>{getInvoiceTypeBadge(invoice.invoice_type || 'subscription')}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-purple-200">{getManagerName(invoice.manager_user_id)}</p>
                        <p className="text-xs text-purple-400">{getManagerEmail(invoice.manager_user_id)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-white font-semibold">KES {Number(invoice.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-purple-300">
                      {invoice.paid_date ? format(new Date(invoice.paid_date), 'dd/MM/yy') : '-'}
                    </TableCell>
                    <TableCell className="text-purple-300">
                      {invoice.invoice_type === 'subscription' && invoice.net_collection > 0
                        ? `KES ${Number(invoice.net_collection).toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReceipt(invoice)}
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20"
                        title="Download Receipt"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-purple-400">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No receipts found</p>
              {(searchTerm || filterType !== 'all' || filterMonth !== 'all') && (
                <p className="text-sm mt-2">Try adjusting your filters</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerReceipts;
