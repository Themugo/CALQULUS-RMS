import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Plus, CheckCircle, Clock, AlertTriangle, Home,
  FileText, Loader2, RefreshCw, User, Building2
} from 'lucide-react';
import { format, addDays } from 'date-fns';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-800 border-amber-200',
  paid:      'bg-green-100 text-green-800 border-green-200',
  overdue:   'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  waived:    'bg-blue-100 text-blue-800 border-blue-200',
};

const INVOICE_TYPES = [
  { value: 'portal_access',    label: 'Portal access',     hint: 'Monthly landlord portal fee' },
  { value: 'property_listing', label: 'Property listing',  hint: 'Per-property listing fee' },
  { value: 'document_storage', label: 'Document storage',  hint: 'Document hosting fee' },
  { value: 'premium_reports',  label: 'Premium reports',   hint: 'Advanced reporting access' },
  { value: 'annual_membership',label: 'Annual membership', hint: 'Yearly membership fee' },
  { value: 'one_time',         label: 'One-time charge',   hint: 'Custom one-time fee' },
];

const LandlordBilling: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    landlord_user_id: '', amount: '', invoice_type: 'portal_access',
    description: '', due_date: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
  });

  // All landlord invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['landlord-invoices-webhost'],
    queryFn: async () => {
      const { data } = await (supabase.from('landlord_invoices')
        .select('*')
        .order('created_at', { ascending: false }));
      return (data || []) as { id: string; landlord_user_id: string; webhost_user_id: string; invoice_number: string; invoice_type: string; amount: number; description: string | null; due_date: string; status: string; paid_date: string | null; created_at: string }[];
    },
  });

  // All landlords for dropdown
  const { data: landlords = [] } = useQuery({
    queryKey: ['landlords-for-billing'],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles')
        .select('user_id').eq('role', 'landlord');
      if (!roles?.length) return [];
      return Promise.all((roles || []).map(async r => {
        const { data: p } = await supabase.from('profiles')
          .select('full_name, email').eq('id', r.user_id).maybeSingle();
        return { user_id: r.user_id, name: (p as { full_name: string | null } | null)?.full_name || 'Unnamed', email: (p as { email: string } | null)?.email || '' };
      }));
    },
  });

  const pending = invoices.filter((i: { status: string }) => i.status === 'pending' || i.status === 'overdue');
  const totalPending = pending.reduce((s: number, i: { amount: number }) => s + Number(i.amount), 0);
  const totalPaid = invoices.filter((i: { status: string }) => i.status === 'paid').reduce((s: number, i: { amount: number }) => s + Number(i.amount), 0);

  // Create invoice
  const createInvoice = useMutation({
    mutationFn: async () => {
      if (!form.landlord_user_id || !form.amount) throw new Error('Landlord and amount are required');
      const invNum = `LAND-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await (supabase.from('landlord_invoices').insert({
        landlord_user_id: form.landlord_user_id,
        webhost_user_id:  user!.id,
        invoice_number:   invNum,
        invoice_type:     form.invoice_type,
        amount:           parseFloat(form.amount),
        description:      form.description || null,
        due_date:         form.due_date,
        status:           'pending',
      }));
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Landlord invoice created' });
      queryClient.invalidateQueries({ queryKey: ['landlord-invoices-webhost'] });
      setCreateOpen(false);
      setForm({ landlord_user_id: '', amount: '', invoice_type: 'portal_access', description: '', due_date: format(addDays(new Date(), 14), 'yyyy-MM-dd') });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  // Mark paid
  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from('landlord_invoices').update({
        status: 'paid', paid_date: new Date().toISOString().slice(0, 10),
      }).eq('id', id));
    },
    onSuccess: () => {
      toast({ title: 'Invoice marked as paid' });
      queryClient.invalidateQueries({ queryKey: ['landlord-invoices-webhost'] });
    },
  });

  // Waive invoice
  const waiveInvoice = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from('landlord_invoices').update({ status: 'waived' }).eq('id', id));
    },
    onSuccess: () => {
      toast({ title: 'Invoice waived' });
      queryClient.invalidateQueries({ queryKey: ['landlord-invoices-webhost'] });
    },
  });

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total landlords', value: String(landlords.length), icon: User, color: 'text-purple-400' },
          { label: 'Outstanding', value: fmt(totalPending), icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Collected', value: fmt(totalPaid), icon: CheckCircle, color: 'text-green-400' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-purple-800/30 bg-slate-900/40 p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-400">{k.label}</p>
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Landlord invoices</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-purple-700 text-purple-300 h-8 text-xs"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['landlord-invoices-webhost'] })}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh
          </Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs gap-1"
            onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />New invoice
          </Button>
        </div>
      </div>

      {/* Invoice table */}
      <Card className="bg-slate-800/50 border-purple-800/30">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-10 w-full bg-slate-700/40"/>)}</div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No landlord invoices yet</p>
              <p className="text-xs mt-1">Create an invoice to bill a landlord for portal access or services</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-purple-800/30 hover:bg-transparent">
                  {['Invoice #', 'Landlord', 'Type', 'Amount', 'Due', 'Status', 'Actions'].map(h => (
                    <TableHead key={h} className="text-purple-300 text-xs">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: { id: string; invoice_number: string; invoice_type: string; amount: number; due_date: string; status: string; landlord_user_id: string }) => (
                  <TableRow key={inv.id} className="border-purple-800/20 hover:bg-purple-900/10">
                    <TableCell className="font-mono text-xs text-slate-300">{inv.invoice_number}</TableCell>
                    <TableCell className="text-xs text-slate-300">{inv.landlord_user_id?.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize border-purple-700/50 text-purple-300">
                        {inv.invoice_type?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-white">{fmt(Number(inv.amount))}</TableCell>
                    <TableCell className="text-xs text-slate-400">{format(new Date(inv.due_date), 'dd/MM/yy')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_STYLE[inv.status] ?? ''}`}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(inv.status === 'pending' || inv.status === 'overdue') && (
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-xs bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => markPaid.mutate(inv.id)}>Paid</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-xs text-slate-400"
                            onClick={() => waiveInvoice.mutate(inv.id)}>Waive</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create landlord invoice</DialogTitle>
            <DialogDescription>Bill a landlord for platform services</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Landlord</Label>
              <Select value={form.landlord_user_id} onValueChange={v => setForm(p => ({...p, landlord_user_id: v}))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select landlord" /></SelectTrigger>
                <SelectContent>
                  {landlords.map((l: { user_id: string; name: string; email: string }) => (
                    <SelectItem key={l.user_id} value={l.user_id}>{l.name} — {l.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invoice type</Label>
              <Select value={form.invoice_type} onValueChange={v => setForm(p => ({...p, invoice_type: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVOICE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div><span>{t.label}</span><span className="text-xs text-muted-foreground ml-2">— {t.hint}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (KES)</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} placeholder="200" className="mt-1" />
              </div>
              <div>
                <Label>Due date</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(p => ({...p, due_date: e.target.value}))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                placeholder="e.g. Monthly portal access — May 2026" rows={2} className="mt-1 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createInvoice.mutate()} disabled={createInvoice.isPending || !form.landlord_user_id || !form.amount}>
              {createInvoice.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandlordBilling;
