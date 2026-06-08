import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Switch } from '@/shared/components/ui/switch';
import {
  FileText, Receipt, Plus, Send,
  CheckCircle, Loader2, Smartphone,
  Mail, MessageSquare, X
} from 'lucide-react';
import { format } from 'date-fns';

interface Tenant { id: string; name: string; email: string; phone: string | null; unit: string | null; property: string | null; unit_id: string | null; property_id: string | null; }
interface LineItem { label: string; amount: number; }
interface PhysicalDoc {
  id: string;
  tenant_id: string;
  invoice_number?: string;
  receipt_number?: string;
  invoice_date?: string;
  receipt_date?: string;
  amount?: number;
  total_amount?: number;
  payment_method?: string;
  reference?: string;
  due_date?: string;
  digital_receipt_sent?: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'mpesa',         label: 'M-Pesa' },
  { value: 'other',         label: 'Other' },
];

const PhysicalDocumentEntry: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [docType, setDocType] = useState<'invoice' | 'receipt'>('receipt');
  const [addOpen, setAddOpen] = useState(false);
  const [sendDigitalId, setSendDigitalId] = useState<string | null>(null);
  const [sendVia, setSendVia] = useState({ sms: true, email: true, whatsapp: false });

  // Invoice form
  const [invForm, setInvForm] = useState({
    tenant_id: '', invoice_number: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: '', description: '', notes: '',
  });
  const [invLines, setInvLines] = useState<LineItem[]>([{ label: 'Monthly Rent', amount: 0 }]);

  // Receipt form
  const [recForm, setRecForm] = useState({
    tenant_id: '', receipt_number: '',
    receipt_date: new Date().toISOString().slice(0, 10),
    amount: '', payment_method: 'cash', reference: '',
    description: 'Rent payment', received_by: '', notes: '',
  });
  const [recLines, setRecLines] = useState<LineItem[]>([{ label: 'Monthly Rent', amount: 0 }]);

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants-for-physical', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('id, name, email, phone, unit, property, unit_id, property_id').eq('manager_id', user!.id).eq('status', 'active').order('name');
      return (data || []) as Tenant[];
    },
    enabled: !!user?.id,
  });

  const { data: physicalInvoices = [], isLoading: invLoading } = useQuery({
    queryKey: ['physical-invoices', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('physical_invoices').select('*').eq('manager_id', user!.id).order('created_at', { ascending: false }).limit(50);
      return (data || []) as unknown[];
    },
    enabled: !!user?.id,
  });

  const { data: physicalReceipts = [], isLoading: recLoading } = useQuery({
    queryKey: ['physical-receipts', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('physical_receipts').select('*').eq('manager_id', user!.id).order('created_at', { ascending: false }).limit(50);
      return (data || []) as unknown[];
    },
    enabled: !!user?.id,
  });

  const invTotal = invLines.reduce((s, l) => s + Number(l.amount || 0), 0);
  const recTotal = Number(recForm.amount) || recLines.reduce((s, l) => s + Number(l.amount || 0), 0);

  // Add line item
  const addLine = (type: 'inv' | 'rec') => {
    if (type === 'inv') setInvLines(p => [...p, { label: '', amount: 0 }]);
    else setRecLines(p => [...p, { label: '', amount: 0 }]);
  };
  const removeLine = (type: 'inv' | 'rec', i: number) => {
    if (type === 'inv') setInvLines(p => p.filter((_, idx) => idx !== i));
    else setRecLines(p => p.filter((_, idx) => idx !== i));
  };
  const updateLine = (type: 'inv' | 'rec', i: number, field: keyof LineItem, val: string | number) => {
    if (type === 'inv') setInvLines(p => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
    else setRecLines(p => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  };

  const selectedInvTenant = tenants.find(t => t.id === invForm.tenant_id);
  const selectedRecTenant = tenants.find(t => t.id === recForm.tenant_id);

  // Save invoice
  const saveInvoice = useMutation({
    mutationFn: async () => {
      if (!invForm.tenant_id || !invForm.invoice_number || invTotal <= 0) throw new Error('Tenant, invoice number, and amount required');
      const tenant = selectedInvTenant!;
      const { error } = await supabase.from('physical_invoices').insert({
        manager_id:    user!.id,
        tenant_id:     invForm.tenant_id,
        unit_id:       tenant.unit_id,
        property_id:   tenant.property_id,
        invoice_number: invForm.invoice_number,
        invoice_date:  invForm.invoice_date,
        due_date:      invForm.due_date || null,
        description:   invForm.description || 'Physical invoice',
        amount:        invTotal,
        total_amount:  invTotal,
        line_items:    invLines,
        notes:         invForm.notes || null,
        recorded_by:   user!.id,
        status:        'issued',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-invoices'] });
      toast({ title: 'Physical invoice recorded' });
      setAddOpen(false);
      setInvForm({ tenant_id: '', invoice_number: '', invoice_date: new Date().toISOString().slice(0, 10), due_date: '', description: '', notes: '' });
      setInvLines([{ label: 'Monthly Rent', amount: 0 }]);
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  // Save receipt
  const saveReceipt = useMutation({
    mutationFn: async () => {
      if (!recForm.tenant_id || !recForm.receipt_number || !recTotal) throw new Error('Tenant, receipt number, and amount required');
      const tenant = selectedRecTenant!;
      const { error } = await supabase.from('physical_receipts').insert({
        manager_id:    user!.id,
        tenant_id:     recForm.tenant_id,
        unit_id:       tenant.unit_id,
        property_id:   tenant.property_id,
        receipt_number: recForm.receipt_number,
        receipt_date:  recForm.receipt_date,
        amount:        recTotal,
        payment_method: recForm.payment_method,
        reference:     recForm.reference || null,
        description:   recForm.description,
        received_by:   recForm.received_by || null,
        line_items:    recLines.some(l => l.amount > 0) ? recLines : null,
        notes:         recForm.notes || null,
        recorded_by:   user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-receipts'] });
      toast({ title: 'Physical receipt recorded' });
      setAddOpen(false);
      setRecForm({ tenant_id: '', receipt_number: '', receipt_date: new Date().toISOString().slice(0, 10), amount: '', payment_method: 'cash', reference: '', description: 'Rent payment', received_by: '', notes: '' });
      setRecLines([{ label: 'Monthly Rent', amount: 0 }]);
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  // Send digital copy
  const sendDigital = useMutation({
    mutationFn: async (doc: PhysicalDoc) => {
      const tenant = tenants.find(t => t.id === doc.tenant_id);
      if (!tenant) throw new Error('Tenant not found');

      const isReceipt = doc.receipt_number !== undefined;
      const promises = [];

      if (sendVia.email && tenant.email) {
        promises.push(supabase.functions.invoke('send-receipt-email', {
          body: {
            tenantEmail:   tenant.email,
            tenantName:    tenant.name,
            invoiceNumber: doc.invoice_number || doc.receipt_number,
            amount:        doc.amount || doc.total_amount,
            paidDate:      doc.receipt_date || doc.invoice_date,
            property:      tenant.property,
            unit:          tenant.unit,
            paymentMethod: doc.payment_method || 'Physical receipt',
            bankRef:       doc.reference || doc.invoice_number,
            outstandingBalance: 0,
          },
        }));
      }

      if (sendVia.sms && tenant.phone) {
        const msg = isReceipt
          ? `Receipt ${doc.receipt_number}: ${fmt(doc.amount)} received. ${doc.payment_method}. Ref: ${doc.reference || 'N/A'}. ${tenant.unit} - ${tenant.property}. Thank you!`
          : `Invoice ${doc.invoice_number}: ${fmt(doc.total_amount || doc.amount)} due on ${doc.due_date || 'prompt'}. ${tenant.unit} - ${tenant.property}.`;
        promises.push(supabase.functions.invoke('send-sms-notification', { body: { phoneNumber: tenant.phone, message: msg } }));
      }

      await Promise.allSettled(promises);

      // Mark as digital sent
      const table = isReceipt ? 'physical_receipts' : 'physical_invoices';
      await supabase.from(table).update({ digital_receipt_sent: true, digital_sent_at: new Date().toISOString() }).eq('id', doc.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-receipts', 'physical-invoices'] });
      toast({ title: 'Digital copy sent' });
      setSendDigitalId(null);
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const LineItemEditor = ({ lines, type }: { lines: LineItem[]; type: 'inv' | 'rec' }) => (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input value={l.label} onChange={e => updateLine(type, i, 'label', e.target.value)} placeholder="Description" className="flex-1 h-8 text-sm" />
          <Input type="number" value={l.amount || ''} onChange={e => updateLine(type, i, 'amount', Number(e.target.value))} placeholder="Amount" className="w-28 h-8 text-sm" />
          {lines.length > 1 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeLine(type, i)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => addLine(type)}>
          <Plus className="h-3 w-3" />Add line
        </Button>
        <span className="text-sm font-semibold">Total: {fmt(type === 'inv' ? invTotal : recLines.reduce((s, l) => s + Number(l.amount || 0), 0))}</span>
      </div>
    </div>
  );

  const DocTable = ({ docs, type, loading }: { docs: PhysicalDoc[]; type: 'invoice' | 'receipt'; loading: boolean }) => (
    loading ? (
      <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
    ) : docs.length === 0 ? (
      <div className="py-10 text-center text-muted-foreground">
        {type === 'invoice' ? <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" /> : <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />}
        <p className="text-sm">No physical {type}s recorded yet</p>
      </div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Tenant / Unit</TableHead>
            <TableHead>Date</TableHead>
            {type === 'receipt' && <TableHead>Method</TableHead>}
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Digital</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map(doc => {
            const tenant = tenants.find(t => t.id === doc.tenant_id);
            return (
              <TableRow key={doc.id}>
                <TableCell className="font-mono text-xs">{doc.invoice_number || doc.receipt_number}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{tenant?.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{tenant?.unit}</p>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {(doc.invoice_date || doc.receipt_date) ? format(new Date(doc.invoice_date || doc.receipt_date), 'dd/MM/yy') : '—'}
                </TableCell>
                {type === 'receipt' && (
                  <TableCell className="text-xs capitalize">{doc.payment_method}</TableCell>
                )}
                <TableCell className="text-right font-semibold text-sm">
                  {fmt(Number(doc.total_amount || doc.amount))}
                </TableCell>
                <TableCell>
                  {doc.digital_receipt_sent ? (
                    <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50">
                      <CheckCircle className="h-3 w-3 mr-1" />Sent
                    </Badge>
                  ) : (
                    <Button
                      variant="outline" size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setSendDigitalId(doc.id)}
                    >
                      <Send className="h-3 w-3" />Send
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    )
  );

  const allDocs = [...physicalInvoices, ...physicalReceipts].find(d => d.id === sendDigitalId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Physical invoices &amp; receipts</h2>
          <p className="text-sm text-muted-foreground">Enter paper documents into the system and send digital copies</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record document
        </Button>
      </div>

      <Tabs defaultValue="receipts">
        <TabsList>
          <TabsTrigger value="receipts"><Receipt className="h-4 w-4 mr-2" />Physical receipts ({physicalReceipts.length})</TabsTrigger>
          <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-2" />Physical invoices ({physicalInvoices.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="receipts" className="mt-4">
          <Card><CardContent className="pt-4">
            <DocTable docs={physicalReceipts} type="receipt" loading={recLoading} />
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <Card><CardContent className="pt-4">
            <DocTable docs={physicalInvoices} type="invoice" loading={invLoading} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Entry dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record physical document</DialogTitle>
            <DialogDescription>Enter a paper invoice or receipt into the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Type toggle */}
            <div className="flex gap-2">
              {(['receipt', 'invoice'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setDocType(t)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                    docType === t ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
                  }`}
                >
                  {t === 'receipt' ? <><Receipt className="h-4 w-4 inline mr-2" />Receipt</> : <><FileText className="h-4 w-4 inline mr-2" />Invoice</>}
                </button>
              ))}
            </div>

            {/* Tenant */}
            <div>
              <Label>Tenant</Label>
              <Select
                value={docType === 'receipt' ? recForm.tenant_id : invForm.tenant_id}
                onValueChange={v => docType === 'receipt' ? setRecForm(p => ({ ...p, tenant_id: v })) : setInvForm(p => ({ ...p, tenant_id: v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select tenant" /></SelectTrigger>
                <SelectContent>
                  {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name} — {t.unit}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {docType === 'receipt' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Receipt number</Label><Input value={recForm.receipt_number} onChange={e => setRecForm(p => ({ ...p, receipt_number: e.target.value }))} placeholder="RCP-001" className="mt-1" /></div>
                  <div><Label>Date</Label><Input type="date" value={recForm.receipt_date} onChange={e => setRecForm(p => ({ ...p, receipt_date: e.target.value }))} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Total amount (KES)</Label>
                    <Input type="number" value={recForm.amount} onChange={e => setRecForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-0.5">Or use line items below</p>
                  </div>
                  <div>
                    <Label>Payment method</Label>
                    <Select value={recForm.payment_method} onValueChange={v => setRecForm(p => ({ ...p, payment_method: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Reference (cheque/M-Pesa code)</Label><Input value={recForm.reference} onChange={e => setRecForm(p => ({ ...p, reference: e.target.value }))} className="mt-1 font-mono" /></div>
                  <div><Label>Received by</Label><Input value={recForm.received_by} onChange={e => setRecForm(p => ({ ...p, received_by: e.target.value }))} className="mt-1" /></div>
                </div>
                <div><Label>Description</Label><Input value={recForm.description} onChange={e => setRecForm(p => ({ ...p, description: e.target.value }))} className="mt-1" /></div>
                <div><Label>Line items (optional breakdown)</Label><div className="mt-1"><LineItemEditor lines={recLines} type="rec" /></div></div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Invoice number</Label><Input value={invForm.invoice_number} onChange={e => setInvForm(p => ({ ...p, invoice_number: e.target.value }))} placeholder="INV-001" className="mt-1" /></div>
                  <div><Label>Invoice date</Label><Input type="date" value={invForm.invoice_date} onChange={e => setInvForm(p => ({ ...p, invoice_date: e.target.value }))} className="mt-1" /></div>
                </div>
                <div><Label>Due date</Label><Input type="date" value={invForm.due_date} onChange={e => setInvForm(p => ({ ...p, due_date: e.target.value }))} className="mt-1" /></div>
                <div><Label>Description</Label><Input value={invForm.description} onChange={e => setInvForm(p => ({ ...p, description: e.target.value }))} className="mt-1" /></div>
                <div><Label>Line items</Label><div className="mt-1"><LineItemEditor lines={invLines} type="inv" /></div></div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => docType === 'receipt' ? saveReceipt.mutate() : saveInvoice.mutate()}
              disabled={saveReceipt.isPending || saveInvoice.isPending}
            >
              {(saveReceipt.isPending || saveInvoice.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Record {docType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send digital copy dialog */}
      <Dialog open={!!sendDigitalId} onOpenChange={open => !open && setSendDigitalId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Send digital copy</DialogTitle>
            <DialogDescription>Send the tenant a digital copy of this document</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { key: 'email', label: 'Email', icon: Mail },
              { key: 'sms', label: 'SMS', icon: Smartphone },
              { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
            ].map(ch => (
              <div key={ch.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ch.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{ch.label}</span>
                </div>
                <Switch
                  checked={sendVia[ch.key as keyof typeof sendVia]}
                  onCheckedChange={v => setSendVia(p => ({ ...p, [ch.key]: v }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDigitalId(null)}>Cancel</Button>
            <Button
              onClick={() => allDocs && sendDigital.mutate(allDocs)}
              disabled={sendDigital.isPending || !Object.values(sendVia).some(Boolean)}
              className="gap-2"
            >
              {sendDigital.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhysicalDocumentEntry;
