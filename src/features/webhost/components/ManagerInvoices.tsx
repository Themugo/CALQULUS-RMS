/* eslint-disable react-refresh/only-export-components */
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useToast } from '@/shared/hooks/use-toast';
import { FileText, Plus, CheckCircle, Clock, XCircle, CreditCard, Smartphone, RefreshCw, Users, Percent, Send, AlertCircle, AlertTriangle, MessageSquare, MoreHorizontal, Building, Info } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import ManualInvoiceForm from './ManualInvoiceForm';

// Billing Configuration - will be overridden by database settings
export const BILLING_CONFIG = {
  registration: {
    name: "Registration Fee",
    description: "One-time registration fee for new managers",
    amount: 3000,
  },
  subscription: {
    name: "Monthly Subscription",
    description: "1% of manager's net collection",
    rate: 0.01,
  },
};

// Payment Settings interface
interface PaymentSettings {
  id: string;
  registration_fee: number;
  subscription_rate: number;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  mpesa_paybill_number: string | null;
  mpesa_paybill_account: string | null;
  mpesa_till_number: string | null;
  mpesa_phone_number: string | null;
  payment_instructions: string | null;
}

interface Manager {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  property_count: number;
  has_registration_invoice: boolean;
  net_collection: number;
  phone?: string;
}

export interface ManagerInvoice {
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

interface ManagerInvoicesProps {
  managers: Manager[] | undefined;
  invoices: ManagerInvoice[] | undefined;
  isLoading: boolean;
  onRefresh: () => void;
}

const ManagerInvoices: React.FC<ManagerInvoicesProps> = ({ managers, invoices, isLoading, onRefresh }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ManagerInvoice | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [paymentInfoDialogOpen, setPaymentInfoDialogOpen] = useState(false);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSmsDialogOpen, setBulkSmsDialogOpen] = useState(false);
  const [bulkSmsMessage, setBulkSmsMessage] = useState('');
  const [isSendingBulkSms, setIsSendingBulkSms] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Fetch payment settings from database
  const { data: paymentSettings } = useQuery({
    queryKey: ['webhost-payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhost_payment_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as PaymentSettings | null;
    },
  });

  // Get dynamic billing config
  const getBillingConfig = () => ({
    registration: {
      ...BILLING_CONFIG.registration,
      amount: paymentSettings?.registration_fee || BILLING_CONFIG.registration.amount,
    },
    subscription: {
      ...BILLING_CONFIG.subscription,
      rate: paymentSettings?.subscription_rate || BILLING_CONFIG.subscription.rate,
    },
  });

  const billingConfig = getBillingConfig();

  // Filter to only show unpaid invoices
  const pendingInvoices = invoices?.filter(inv => inv.status === 'pending' || inv.status === 'overdue') || [];

  // Toggle single selection
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Toggle all selection
  const toggleAllSelection = () => {
    if (selectedIds.size === pendingInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingInvoices.map(inv => inv.id)));
    }
  };

  // Get selected invoices
  const getSelectedInvoices = () => pendingInvoices.filter(inv => selectedIds.has(inv.id));

  // Send email notification helper
  const sendInvoiceNotification = async (invoiceId: string, notificationType: 'new_invoice' | 'payment_reminder' | 'payment_confirmed') => {
    try {
      await supabase.functions.invoke('send-manager-invoice-notification', {
        body: { invoiceId, notificationType }
      });
    } catch (error) {
    }
  };

  // Create invoice mutation
  const createInvoice = useMutation({
    mutationFn: async (data: { 
      manager_user_id: string; 
      amount: number; 
      description: string; 
      due_date: string; 
      invoice_type: string;
      net_collection: number;
      commission_rate: number;
    }) => {
      const { data: inserted, error } = await supabase
        .from('manager_invoices')
        .insert({
          manager_user_id: data.manager_user_id,
          amount: data.amount,
          description: data.description,
          due_date: data.due_date,
          invoice_number: '',
          invoice_type: data.invoice_type,
          net_collection: data.net_collection,
          commission_rate: data.commission_rate,
          property_count: 0,
          rate_per_property: 0,
        })
        .select('id')
        .single();

      if (error) throw error;
      return inserted;
    },
    onSuccess: async (data) => {
      toast({ title: 'Invoice created successfully' });
      
      if (data?.id) {
        await sendInvoiceNotification(data.id, 'new_invoice');
        toast({ title: 'Email notification sent to manager' });
      }
      
      queryClient.invalidateQueries({ queryKey: ['manager-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['webhost-managers-for-billing'] });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Bulk mark as paid mutation
  const bulkMarkAsPaid = async () => {
    if (selectedIds.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('manager_invoices')
        .update({ 
          status: 'paid', 
          paid_date: new Date().toISOString().split('T')[0] 
        })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      // Reinstate suspended managers and send confirmations
      for (const id of selectedIds) {
        await supabase.rpc('reinstate_manager_on_payment', { p_invoice_id: id }).catch(() => {});
        await sendInvoiceNotification(id, 'payment_confirmed');
      }

      toast({ title: `${selectedIds.size} invoices marked as paid`, description: 'Suspended accounts reinstated where applicable.' });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['manager-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['webhost-managers-rich'] });
    } catch (error) {
      toast({
        title: 'Failed to update invoices',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk cancel mutation
  const bulkCancel = async () => {
    if (selectedIds.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('manager_invoices')
        .update({ status: 'cancelled' })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({ title: `${selectedIds.size} invoices cancelled` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['manager-invoices'] });
    } catch (error) {
      toast({
        title: 'Failed to cancel invoices',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk send reminders
  const bulkSendReminders = async () => {
    if (selectedIds.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      let sent = 0;
      for (const id of selectedIds) {
        await sendInvoiceNotification(id, 'payment_reminder');
        sent++;
      }

      toast({ title: `Sent ${sent} reminder emails` });
      setSelectedIds(new Set());
    } catch (error) {
      toast({
        title: 'Failed to send reminders',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk SMS function
  const sendBulkSms = async () => {
    if (selectedIds.size === 0 || !bulkSmsMessage.trim()) return;
    
    setIsSendingBulkSms(true);
    try {
      const selectedInvoices = getSelectedInvoices();
      
      // Get manager phone numbers from profiles
      const managerUserIds = [...new Set(selectedInvoices.map(inv => inv.manager_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, phone, full_name')
        .in('id', managerUserIds);

      if (!profiles || profiles.length === 0) {
        throw new Error('No manager profiles found');
      }

      // Filter managers with phone numbers
      const recipients = profiles
        .filter(p => p.phone)
        .map(p => ({
          phoneNumber: p.phone!,
          name: p.full_name || 'Manager',
        }));

      if (recipients.length === 0) {
        toast({
          title: 'No phone numbers',
          description: 'Selected managers do not have phone numbers configured',
          variant: 'destructive',
        });
        return;
      }

      // Create custom messages per recipient with invoice details
      const customMessages: { [phone: string]: string } = {};
      for (const profile of profiles.filter(p => p.phone)) {
        const managerInvoices = selectedInvoices.filter(inv => inv.manager_user_id === profile.id);
        const totalAmount = managerInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const invoiceNumbers = managerInvoices.map(inv => inv.invoice_number).join(', ');
        
        const message = bulkSmsMessage
          .replace('{name}', profile.full_name || 'Manager')
          .replace('{amount}', `KES ${totalAmount.toLocaleString()}`)
          .replace('{invoices}', invoiceNumbers)
          .replace('{count}', String(managerInvoices.length));
        
        customMessages[profile.phone!] = message;
      }

      const { data, error } = await supabase.functions.invoke('send-bulk-sms', {
        body: {
          recipients,
          message: bulkSmsMessage,
          customMessages,
        },
      });

      if (error) throw error;

      toast({
        title: 'Bulk SMS sent',
        description: `Sent ${data.summary.success} of ${data.summary.total} messages`,
      });

      setBulkSmsDialogOpen(false);
      setBulkSmsMessage('');
      setSelectedIds(new Set());
    } catch (error) {
      toast({
        title: 'Failed to send SMS',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSendingBulkSms(false);
    }
  };

  // Mark as paid mutation
  const markAsPaid = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('manager_invoices')
        .update({ 
          status: 'paid', 
          paid_date: new Date().toISOString().split('T')[0] 
        })
        .eq('id', invoiceId);

      if (error) throw error;

      // Reinstate manager if they were suspended for non-payment
      await supabase.rpc('reinstate_manager_on_payment', { p_invoice_id: invoiceId })
        .catch(() => {}); // non-critical — manager already reinstated if they paid via portal

      return invoiceId;
    },
    onSuccess: async (invoiceId) => {
      toast({ title: 'Invoice marked as paid', description: 'Manager account reinstated if it was suspended for non-payment.' });
      await sendInvoiceNotification(invoiceId, 'payment_confirmed');
      queryClient.invalidateQueries({ queryKey: ['manager-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['webhost-managers-rich'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel invoice mutation
  const cancelInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('manager_invoices')
        .update({ status: 'cancelled' })
        .eq('id', invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Invoice cancelled' });
      queryClient.invalidateQueries({ queryKey: ['manager-invoices'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to cancel invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send reminder mutation
  const sendReminder = useMutation({
    mutationFn: async (invoiceId: string) => {
      await sendInvoiceNotification(invoiceId, 'payment_reminder');
      return invoiceId;
    },
    onSuccess: () => {
      toast({ title: 'Reminder sent successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send reminder',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleGenerateInvoices = async () => {
    setIsGeneratingInvoices(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-manager-invoices');
      
      if (error) throw error;
      
      toast({
        title: 'Invoice generation complete',
        description: `Generated ${data.generated} invoices, skipped ${data.skipped}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['manager-invoices'] });
    } catch (error) {
      toast({
        title: 'Failed to generate invoices',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingInvoices(false);
    }
  };

  const handleRunEscalation = async () => {
    setIsEscalating(true);
    try {
      // Call the Postgres function directly via RPC
      const { data, error } = await supabase.rpc('escalate_overdue_manager_invoices');
      if (error) throw error;
      toast({
        title: 'Escalation run',
        description: `${data ?? 0} overdue invoice(s) processed. Managers at 30+ days have been suspended.`,
      });
      queryClient.invalidateQueries({ queryKey: ['manager-invoices', 'webhost-managers-rich'] });
    } catch (error) {
      toast({
        title: 'Escalation failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsEscalating(false);
    }
  };

  const handleFormSubmit = (data: {
    manager_user_id: string;
    amount: number;
    description: string;
    due_date: string;
    invoice_type: string;
    net_collection: number;
    commission_rate: number;
  }) => {
    createInvoice.mutate(data);
  };

  // Render payment details for invoice view
  const renderPaymentDetails = () => {
    if (!paymentSettings) return null;
    
    const hasBank = paymentSettings.bank_name && paymentSettings.bank_account_number;
    const hasMpesa = paymentSettings.mpesa_paybill_number || paymentSettings.mpesa_till_number || paymentSettings.mpesa_phone_number;
    
    if (!hasBank && !hasMpesa) return null;
    
    return (
      <Dialog open={paymentInfoDialogOpen} onOpenChange={setPaymentInfoDialogOpen}>
        <DialogContent className="bg-slate-800 border-purple-800/50 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-400" />
              Payment Details
            </DialogTitle>
            <DialogDescription className="text-purple-300">
              Use these details to make payment for your invoice
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {paymentSettings.payment_instructions && (
              <Alert className="bg-blue-900/30 border-blue-700">
                <Info className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-300">
                  {paymentSettings.payment_instructions}
                </AlertDescription>
              </Alert>
            )}
            
            {hasBank && (
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="flex items-center gap-2 mb-3">
                  <Building className="h-5 w-5 text-blue-400" />
                  <h4 className="text-white font-semibold">Bank Transfer</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-300">Bank:</span>
                    <span className="text-white font-medium">{paymentSettings.bank_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-300">Account Name:</span>
                    <span className="text-white font-medium">{paymentSettings.bank_account_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-300">Account Number:</span>
                    <span className="text-white font-medium font-mono">{paymentSettings.bank_account_number}</span>
                  </div>
                  {paymentSettings.bank_branch && (
                    <div className="flex justify-between">
                      <span className="text-purple-300">Branch:</span>
                      <span className="text-white font-medium">{paymentSettings.bank_branch}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {hasMpesa && (
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="h-5 w-5 text-green-400" />
                  <h4 className="text-white font-semibold">M-Pesa Payment</h4>
                </div>
                <div className="space-y-2 text-sm">
                  {paymentSettings.mpesa_paybill_number && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Paybill Number:</span>
                        <span className="text-white font-medium font-mono">{paymentSettings.mpesa_paybill_number}</span>
                      </div>
                      {paymentSettings.mpesa_paybill_account && (
                        <div className="flex justify-between">
                          <span className="text-purple-300">Account Number:</span>
                          <span className="text-white font-medium">{paymentSettings.mpesa_paybill_account}</span>
                        </div>
                      )}
                    </>
                  )}
                  {paymentSettings.mpesa_till_number && (
                    <div className="flex justify-between">
                      <span className="text-purple-300">Till Number (Buy Goods):</span>
                      <span className="text-white font-medium font-mono">{paymentSettings.mpesa_till_number}</span>
                    </div>
                  )}
                  {paymentSettings.mpesa_phone_number && (
                    <div className="flex justify-between">
                      <span className="text-purple-300">Phone (Send Money):</span>
                      <span className="text-white font-medium font-mono">{paymentSettings.mpesa_phone_number}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {selectedInvoice && (
              <div className="p-3 bg-purple-900/30 rounded-lg border border-purple-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-purple-300">Invoice Reference:</span>
                  <span className="text-white font-mono font-bold">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-purple-300">Amount Due:</span>
                  <span className="text-white font-bold text-lg">KES {Number(selectedInvoice.amount).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentInfoDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const handlePayWithStripe = async (invoice: ManagerInvoice) => {
    setIsProcessingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-manager-invoice-checkout', {
        body: {
          invoiceId: invoice.id,
          amount: invoice.amount,
          description: invoice.description || 'Manager Platform Fee',
        },
      });

      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (error) {
      toast({
        title: 'Payment failed',
        description: error instanceof Error ? error.message : 'Failed to initiate payment',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePayWithMpesa = async () => {
    if (!selectedInvoice || !phoneNumber) {
      toast({ title: 'Validation Error', description: 'Please enter your M-Pesa phone number', variant: 'destructive' });
      return;
    }

    setIsProcessingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('initiate-manager-mpesa-payment', {
        body: {
          invoiceId: selectedInvoice.id,
          amount: selectedInvoice.amount,
          phoneNumber,
          description: selectedInvoice.description || 'Manager Platform Fee',
        },
      });

      if (error) throw error;
      
      toast({
        title: 'M-Pesa payment initiated',
        description: data.display_text || 'Check your phone for the STK push prompt',
      });
      
      setPaymentDialogOpen(false);
      setPhoneNumber('');
      setSelectedInvoice(null);
    } catch (error) {
      toast({
        title: 'Payment failed',
        description: error instanceof Error ? error.message : 'Failed to initiate M-Pesa payment',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getManagerName = (userId: string) => {
    const manager = managers?.find(m => m.user_id === userId);
    return manager?.full_name || manager?.email || 'Unknown';
  };

  

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  const selectedCount = selectedIds.size;
  const totalSelectedAmount = getSelectedInvoices().reduce((sum, inv) => sum + Number(inv.amount), 0);

  return (
    <div className="space-y-6">
      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <Card className="bg-purple-900/50 border-purple-600/50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-purple-600 text-white">
                  {selectedCount} selected
                </Badge>
                <span className="text-purple-200 text-sm">
                  Total: KES {totalSelectedAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-purple-600 text-purple-300 hover:bg-purple-600/20"
                  onClick={bulkSendReminders}
                  disabled={bulkActionLoading}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send Reminders
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-600 text-green-300 hover:bg-green-600/20"
                  onClick={() => {
                    setBulkSmsMessage('Dear {name}, you have {count} pending invoice(s) totaling {amount}. Invoice(s): {invoices}. Please pay to avoid service interruption. - RentFlow');
                    setBulkSmsDialogOpen(true);
                  }}
                  disabled={bulkActionLoading}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Send SMS
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-600 text-emerald-300 hover:bg-emerald-600/20"
                  onClick={bulkMarkAsPaid}
                  disabled={bulkActionLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark as Paid
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-600 text-red-300 hover:bg-red-600/20"
                  onClick={bulkCancel}
                  disabled={bulkActionLoading}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-purple-400"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800/50 border-purple-800/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              Pending Invoices
            </CardTitle>
            <CardDescription className="text-purple-300">
              Outstanding invoices awaiting payment
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              className="border-purple-600 text-purple-400 hover:bg-purple-600/20"
              onClick={handleGenerateInvoices}
              disabled={isGeneratingInvoices}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGeneratingInvoices ? 'animate-spin' : ''}`} />
              {isGeneratingInvoices ? 'Generating...' : 'Generate Monthly'}
            </Button>
            <Button
              variant="outline"
              className="border-amber-600 text-amber-400 hover:bg-amber-600/20"
              onClick={handleRunEscalation}
              disabled={isEscalating}
              title="Run overdue escalation — marks overdue, sends warnings, suspends at 30 days"
            >
              <AlertTriangle className={`h-4 w-4 mr-2 ${isEscalating ? 'animate-spin' : ''}`} />
              {isEscalating ? 'Running...' : 'Run Escalation'}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-purple-800/50 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Manager Invoice</DialogTitle>
                  <DialogDescription className="text-purple-300">
                    Create a registration, subscription, or custom invoice with line items
                  </DialogDescription>
                </DialogHeader>
                <ManualInvoiceForm
                  managers={managers}
                  billingConfig={billingConfig}
                  onSubmit={handleFormSubmit}
                  isPending={createInvoice.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-700 rounded"></div>
              ))}
            </div>
          ) : pendingInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-purple-800/30 hover:bg-transparent">
                  <TableHead className="text-purple-300 w-12">
                    <Checkbox
                      checked={selectedIds.size === pendingInvoices.length && pendingInvoices.length > 0}
                      onCheckedChange={toggleAllSelection}
                      className="border-purple-600 data-[state=checked]:bg-purple-600"
                    />
                  </TableHead>
                  <TableHead className="text-purple-300">Invoice #</TableHead>
                  <TableHead className="text-purple-300">Type</TableHead>
                  <TableHead className="text-purple-300">Manager</TableHead>
                  <TableHead className="text-purple-300">Amount</TableHead>
                  <TableHead className="text-purple-300">Due Date</TableHead>
                  <TableHead className="text-purple-300">Status</TableHead>
                  <TableHead className="text-purple-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvoices.map((invoice) => (
                  <TableRow 
                    key={invoice.id} 
                    className={`border-purple-800/30 hover:bg-purple-900/20 ${selectedIds.has(invoice.id) ? 'bg-purple-900/30' : ''}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(invoice.id)}
                        onCheckedChange={() => toggleSelection(invoice.id)}
                        className="border-purple-600 data-[state=checked]:bg-purple-600"
                      />
                    </TableCell>
                    <TableCell className="text-white font-mono">{invoice.invoice_number}</TableCell>
                    <TableCell>{getInvoiceTypeBadge(invoice.invoice_type || 'subscription')}</TableCell>
                    <TableCell className="text-purple-200">{getManagerName(invoice.manager_user_id)}</TableCell>
                    <TableCell className="text-white font-semibold">KES {Number(invoice.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-purple-300">{format(new Date(invoice.due_date), 'dd/MM/yy')}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-purple-700/50">
                          <DropdownMenuItem
                            onClick={() => sendReminder.mutate(invoice.id)}
                            className="text-purple-300 hover:bg-purple-900/50 cursor-pointer"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Reminder
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handlePayWithStripe(invoice)}
                            className="text-blue-300 hover:bg-blue-900/50 cursor-pointer"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay with Card
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setPaymentDialogOpen(true);
                            }}
                            className="text-green-300 hover:bg-green-900/50 cursor-pointer"
                          >
                            <Smartphone className="h-4 w-4 mr-2" />
                            Pay with M-Pesa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setPaymentInfoDialogOpen(true);
                            }}
                            className="text-amber-300 hover:bg-amber-900/50 cursor-pointer"
                          >
                            <Info className="h-4 w-4 mr-2" />
                            View Payment Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-purple-700/50" />
                          <DropdownMenuItem
                            onClick={() => markAsPaid.mutate(invoice.id)}
                            className="text-emerald-300 hover:bg-emerald-900/50 cursor-pointer"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark as Paid
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => cancelInvoice.mutate(invoice.id)}
                            className="text-red-300 hover:bg-red-900/50 cursor-pointer"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Invoice
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-purple-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pending invoices</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* M-Pesa Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-slate-800 border-purple-800/50">
          <DialogHeader>
            <DialogTitle className="text-white">M-Pesa Payment</DialogTitle>
            <DialogDescription className="text-purple-300">
              Enter your M-Pesa phone number to receive the STK push
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedInvoice && (
              <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-700/50">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Invoice:</span>
                  <span className="text-white">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-purple-300">Amount:</span>
                  <span className="text-white font-bold">KES {Number(selectedInvoice.amount).toLocaleString()}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-purple-200">Phone Number</Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="254712345678"
                className="bg-slate-700 border-purple-700/50 text-white"
              />
              <p className="text-xs text-purple-400">Format: 254XXXXXXXXX</p>
            </div>
            <Button
              onClick={handlePayWithMpesa}
              disabled={isProcessingPayment || !phoneNumber}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isProcessingPayment ? 'Processing...' : 'Send STK Push'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk SMS Dialog */}
      <Dialog open={bulkSmsDialogOpen} onOpenChange={setBulkSmsDialogOpen}>
        <DialogContent className="bg-slate-800 border-purple-800/50">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-400" />
              Send Bulk SMS
            </DialogTitle>
            <DialogDescription className="text-purple-300">
              Send SMS reminders to {selectedCount} selected invoice(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-700/50">
              <p className="text-sm text-purple-300 mb-2">Available placeholders:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-purple-300 border-purple-600">{'{name}'}</Badge>
                <Badge variant="outline" className="text-purple-300 border-purple-600">{'{amount}'}</Badge>
                <Badge variant="outline" className="text-purple-300 border-purple-600">{'{invoices}'}</Badge>
                <Badge variant="outline" className="text-purple-300 border-purple-600">{'{count}'}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-purple-200">Message</Label>
              <Textarea
                value={bulkSmsMessage}
                onChange={(e) => setBulkSmsMessage(e.target.value)}
                placeholder="Enter your SMS message..."
                className="bg-slate-700 border-purple-700/50 text-white min-h-[120px]"
                maxLength={160}
              />
              <p className="text-xs text-purple-400">{bulkSmsMessage.length}/160 characters</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkSmsDialogOpen(false)}
              className="border-purple-600 text-purple-300"
            >
              Cancel
            </Button>
            <Button
              onClick={sendBulkSms}
              disabled={isSendingBulkSms || !bulkSmsMessage.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSendingBulkSms ? 'Sending...' : `Send to ${selectedCount} Manager(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Details Dialog */}
      {renderPaymentDetails()}
    </div>
  );
};

export default ManagerInvoices;
