import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Download, Plus, CheckCircle, Clock, AlertTriangle, Shield,
  Trash2, ImageIcon, FileText, User, Loader2, Camera
} from 'lucide-react';
import { format } from 'date-fns';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  unit?: string | null;
  property?: string | null;
  deposit_amount?: number | null;
  deposit_balance?: number | null;
}

interface DepositAccountabilityStatementProps {
  tenant: Tenant;
  unitId?: string | null;
  tenancyId?: string | null;
}

const DEDUCTION_CATEGORIES = [
  { value: 'cleaning',        label: 'Professional cleaning',   color: 'text-blue-600' },
  { value: 'damages',         label: 'Physical damages',        color: 'text-red-600' },
  { value: 'unpaid_rent',     label: 'Unpaid rent arrears',     color: 'text-orange-600' },
  { value: 'unpaid_water',    label: 'Unpaid water bill',       color: 'text-cyan-600' },
  { value: 'unpaid_bills',    label: 'Other unpaid charges',    color: 'text-amber-600' },
  { value: 'key_replacement', label: 'Key / lock replacement',  color: 'text-slate-600' },
  { value: 'repainting',      label: 'Repainting',              color: 'text-purple-600' },
  { value: 'maintenance',     label: 'Maintenance (linked)',     color: 'text-green-600' },
  { value: 'general',         label: 'General deduction',       color: 'text-gray-600' },
  { value: 'other',           label: 'Other',                   color: 'text-gray-600' },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

const DepositAccountabilityStatement: React.FC<DepositAccountabilityStatementProps> = ({
  tenant, unitId, tenancyId,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [form, setForm] = useState({
    category: 'damages',
    description: '',
    amount: '',
    deduction_date: new Date().toISOString().slice(0, 10),
    performed_by_name: '',
    performed_by_role: 'manager',
    evidence_url: '',
    notes: '',
  });

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  // Fetch deductions
  const { data: deductions = [], isLoading: deductionsLoading, refetch } = useQuery({
    queryKey: ['deposit-deductions-full', tenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_deductions')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('deduction_date', { ascending: true });
      if (error) throw error;
      return (data || []) as {
        id: string; tenant_id: string; amount: number; description: string;
        deduction_date: string; category: string | null;
        performed_by_name: string; maintenance_request_id: string | null;
      }[];
    },
  });

  // Fetch refund record
  const { data: refund } = useQuery({
    queryKey: ['deposit-refund-full', tenant.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('deposit_refunds')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle();
      return data as { id: string; tenant_id: string; refund_amount: number; original_deposit: number; reason: string | null; status: string; processed_at: string | null; } | null;
    },
  });

  // Add deduction
  const addDeduction = useMutation({
    mutationFn: async () => {
      if (!form.amount || !form.description) throw new Error('Amount and description required');
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', authUser!.id).maybeSingle();

      const { error } = await supabase.from('deposit_deductions').insert({
        tenant_id:           tenant.id,
        unit_id:             unitId ?? null,
        tenancy_id:          tenancyId ?? null,
        category:            form.category,
        description:         form.description,
        amount:              Number(form.amount),
        deduction_date:      form.deduction_date,
        performed_by:        authUser!.id,
        performed_by_name:   form.performed_by_name || (profile as { full_name: string | null } | null)?.full_name || 'Manager',
        performed_by_role:   form.performed_by_role,
        evidence_url:        form.evidence_url || null,
        created_by:          authUser!.id,
        deduction_type:      'manual',
      } as {
        tenant_id: string; unit_id: string | null; tenancy_id: string | null;
        category: string | null; description: string; amount: number;
        deduction_date: string; performed_by: string; performed_by_name: string;
        performed_by_role: string | null; evidence_url: string | null;
        created_by: string; deduction_type: string;
      });
      if (error) throw error;

      // Update deposit balance
      const totalDeducted = deductions.reduce((s, d) => s + Number(d.amount), 0) + Number(form.amount);
      const original = Number(tenant.deposit_amount ?? 0);
      const newBalance = Math.max(0, original - totalDeducted);
      await supabase.from('tenants').update({ deposit_balance: newBalance }).eq('id', tenant.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposit-deductions-full', tenant.id] });
      toast({ title: 'Deduction recorded' });
      setAddDialogOpen(false);
      setForm(p => ({ ...p, description: '', amount: '', evidence_url: '', notes: '' }));
      refetch();
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  // Remove deduction
  const removeDeduction = useMutation({
    mutationFn: async (id: string) => {
      const ded = deductions.find(d => d.id === id);
      if (!ded) return;
      const { error } = await supabase.from('deposit_deductions').delete().eq('id', id);
      if (error) throw error;
      const newBalance = (tenant.deposit_balance ?? 0) + Number(ded.amount);
      await supabase.from('tenants').update({ deposit_balance: newBalance }).eq('id', tenant.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposit-deductions-full', tenant.id] });
      refetch();
      toast({ title: 'Deduction removed' });
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  // Generate PDF statement
  const generatePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text('DEPOSIT ACCOUNTABILITY STATEMENT', pageW / 2, 20, { align: 'center' });
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      doc.text(`Tenant: ${tenant.name}`, 15, 32);
      doc.text(`Unit: ${tenant.unit || '—'} · Property: ${tenant.property || '—'}`, 15, 38);
      doc.text(`Generated: ${format(new Date(), 'dd/MM/yy HH:mm')}`, 15, 44);

      // Deposit summary box
      const original = Number(tenant.deposit_amount ?? 0);
      const totalDeducted = deductions.reduce((s, d) => s + Number(d.amount), 0);
      const balance = original - totalDeducted;
      const refundAmt = refund?.refund_amount ?? balance;

      doc.setFillColor(245, 245, 245);
      doc.rect(15, 50, pageW - 30, 30, 'F');
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('Original deposit:', 20, 59);
      doc.text('Total deductions:', 20, 65);
      doc.text('Balance / Refund due:', 20, 71);
      doc.setFont('helvetica', 'normal');
      doc.text(fmt(original), 80, 59);
      doc.text(`(${fmt(totalDeducted)})`, 80, 65);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(balance >= 0 ? 0 : 200, balance >= 0 ? 150 : 0, 0);
      doc.text(fmt(Math.abs(balance)), 80, 71);
      doc.setTextColor(0, 0, 0);

      // Deductions table
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Deduction Breakdown', 15, 90);

      autoTable(doc, {
        startY: 94,
        head: [['Date', 'Category', 'Description', 'Performed by', 'Role', 'Amount']],
        body: deductions.map(d => [
          d.deduction_date ? format(new Date(d.deduction_date), 'dd/MM/yy') : '—',
          DEDUCTION_CATEGORIES.find(c => c.value === d.category)?.label || d.category || '—',
          d.description,
          d.performed_by_name || 'Manager',
          d.performed_by_role || 'manager',
          fmt(Number(d.amount)),
        ]),
        foot: [['', '', '', '', 'TOTAL', fmt(totalDeducted)]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [50, 50, 50] },
        footStyles: { fontStyle: 'bold', fillColor: [220, 220, 220] },
      });

      const afterTable = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // Refund status
      if (refund) {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text('Refund Status', 15, afterTable);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        doc.text(`Status: ${refund.status?.toUpperCase()}`, 15, afterTable + 7);
        doc.text(`Method: ${refund.refund_method}`, 15, afterTable + 13);
        doc.text(`Reference: ${refund.refund_reference || '—'}`, 15, afterTable + 19);
        if (refund.processed_at) doc.text(`Processed: ${format(new Date(refund.processed_at), 'dd/MM/yy')}`, 15, afterTable + 25);
      }

      // Signatures section
      const sigY = Math.max(afterTable + 45, 240);
      doc.setFontSize(10);
      doc.text('Manager signature: ____________________________', 15, sigY);
      doc.text('Date: __________________', 120, sigY);
      doc.text('Tenant signature (acknowledging): ____________________________', 15, sigY + 12);
      doc.text('Date: __________________', 120, sigY + 12);

      doc.save(`deposit-statement-${tenant.name.replace(/\s/g, '-')}.pdf`);
      toast({ title: 'Deposit statement downloaded' });
    } catch (err: unknown) {
      toast({ title: 'PDF failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
    setIsGeneratingPdf(false);
  };

  const original = Number(tenant.deposit_amount ?? 0);
  const totalDeducted = deductions.reduce((s, d) => s + Number(d.amount), 0);
  const balance = original - totalDeducted;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground mb-1">Original deposit</p>
          <p className="text-lg font-semibold">{fmt(original)}</p>
        </div>
        <div className="rounded-lg border border-border p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground mb-1">Total deducted</p>
          <p className="text-lg font-semibold text-red-700">{fmt(totalDeducted)}</p>
        </div>
        <div className={`rounded-lg border p-3 ${balance >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <p className="text-xs text-muted-foreground mb-1">Refund due</p>
          <p className={`text-lg font-semibold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(Math.abs(balance))}</p>
        </div>
      </div>

      {/* Refund status */}
      {refund && (
        <Card className={`border ${refund.status === 'completed' ? 'border-green-300 bg-green-50/50' : 'border-amber-300 bg-amber-50/50'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {refund.status === 'completed'
                ? <CheckCircle className="h-4 w-4 text-green-600" />
                : <Clock className="h-4 w-4 text-amber-600" />
              }
              <span className="text-sm font-medium">
                Refund {refund.status} · {fmt(refund.refund_amount)} via {refund.refund_method}
              </span>
            </div>
            {refund.refund_reference && (
              <span className="text-xs font-mono text-muted-foreground">{refund.refund_reference}</span>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deductions list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-medium">Deposit deductions</CardTitle>
            <CardDescription>Full audit trail — who deducted what, when, and why</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={generatePdf} disabled={isGeneratingPdf}>
              {isGeneratingPdf
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Download className="h-4 w-4 mr-2" />
              }
              Statement PDF
            </Button>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add deduction
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {deductionsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : deductions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No deductions recorded</p>
              <p className="text-xs opacity-70 mt-1">Full deposit of {fmt(original)} is refundable</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deductions.map(d => {
                const cat = DEDUCTION_CATEGORIES.find(c => c.value === d.category);
                return (
                  <div key={d.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {cat?.label || d.category}
                          </Badge>
                          <span className="text-sm font-medium">{d.description}</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {d.performed_by_name || 'Manager'} ({d.performed_by_role || 'manager'})
                            </span>
                            <span>{d.deduction_date ? format(new Date(d.deduction_date), 'dd/MM/yy') : format(new Date(d.created_at), 'dd/MM/yy')}</span>
                          </div>
                          {d.evidence_url && (
                            <a href={d.evidence_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:underline">
                              <ImageIcon className="h-3 w-3" />
                              View evidence
                            </a>
                          )}
                          {d.verified_by && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-red-700">{fmt(Number(d.amount))}</span>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeDeduction.mutate(d.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Total */}
              <div className="rounded-lg border border-border p-3 bg-muted/30 flex justify-between font-medium">
                <span>Total deductions</span>
                <span className="text-red-700">{fmt(totalDeducted)}</span>
              </div>
              <div className={`rounded-lg border p-3 flex justify-between font-semibold ${balance >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <span>{balance >= 0 ? 'Refund due to tenant' : 'Tenant owes (deficit)'}</span>
                <span className={balance >= 0 ? 'text-green-700' : 'text-red-700'}>{fmt(Math.abs(balance))}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add deduction dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record deposit deduction</DialogTitle>
            <DialogDescription>
              Be specific — this becomes part of the formal deposit statement shown to the tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEDUCTION_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description (specific — what was damaged / done)</Label>
              <Textarea
                value={form.description}
                onChange={f('description')}
                placeholder="e.g. Broken kitchen window pane — replacement cost"
                className="mt-1 resize-none"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (KES)</Label>
                <Input type="number" value={form.amount} onChange={f('amount')} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label>Date of deduction</Label>
                <Input type="date" value={form.deduction_date} onChange={f('deduction_date')} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Performed by (name)</Label>
                <Input value={form.performed_by_name} onChange={f('performed_by_name')} placeholder="Your name" className="mt-1" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={form.performed_by_role} onValueChange={v => setForm(p => ({ ...p, performed_by_role: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="landlord">Landlord</SelectItem>
                    <SelectItem value="submanager">Submanager</SelectItem>
                    <SelectItem value="contractor">Contractor (authorised)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Evidence URL (photo / receipt)</Label>
              <Input
                value={form.evidence_url}
                onChange={f('evidence_url')}
                placeholder="https://... (photo or invoice URL)"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-0.5">Upload to storage first, paste the URL here</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => addDeduction.mutate()} disabled={addDeduction.isPending}>
              {addDeduction.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Record deduction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepositAccountabilityStatement;
