import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Plus, Receipt, Camera, CreditCard, Home, CheckCircle,
  AlertTriangle, Upload, Eye, Trash2, Calendar, Loader2,
  ImageIcon, FileText, ShieldCheck, Link2
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';

type OrphanRecord = Database['public']['Tables']['orphan_tenant_records']['Row'];
type OrphanPaymentEntry = Database['public']['Tables']['orphan_payment_entries']['Row'];
type MoveConditionPhoto = Database['public']['Tables']['move_condition_photos']['Row'];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

const PAYMENT_METHODS = [
  { value: 'mpesa',  label: 'M-Pesa' },
  { value: 'cash',   label: 'Cash' },
  { value: 'bank',   label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
];

const ROOMS = ['Bedroom', 'Living room', 'Kitchen', 'Bathroom', 'Toilet', 'Balcony', 'Parking', 'Store', 'Exterior'];
const CONDITIONS = [
  { value: 'excellent', label: 'Excellent', color: 'text-green-700 bg-green-100' },
  { value: 'good',      label: 'Good',      color: 'text-green-600 bg-green-50' },
  { value: 'fair',      label: 'Fair',      color: 'text-amber-700 bg-amber-100' },
  { value: 'poor',      label: 'Poor',      color: 'text-orange-700 bg-orange-100' },
  { value: 'damaged',   label: 'Damaged',   color: 'text-red-700 bg-red-100' },
];

const OrphanTenantHome: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [payDialog, setPayDialog]   = useState(false);
  const [photoDialog, setPhotoDialog] = useState(false);
  const [payForm, setPayForm] = useState({
    payment_date: new Date().toISOString().slice(0, 10),
    amount: '', payment_method: 'mpesa', reference: '', description: '',
  });
  const [photoForm, setPhotoForm] = useState({
    phase: 'general', room: 'Bedroom',
    condition_rating: 'good', description: '', location_note: '',
  });
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch orphan record
  const { data: record } = useQuery({
    queryKey: ['orphan-record', user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from('orphan_tenant_records')
        .select('*').eq('user_id', user!.id).maybeSingle());
      return data as OrphanRecord | null;
    },
    enabled: !!user?.id,
  });

  // Payment entries
  const { data: payments = [], isLoading: payLoading } = useQuery({
    queryKey: ['orphan-payments', user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from('orphan_payment_entries')
        .select('*').eq('user_id', user!.id)
        .order('payment_date', { ascending: false }));
      return (data ?? []) as OrphanPaymentEntry[];
    },
    enabled: !!user?.id,
  });

  // Condition photos
  const { data: photos = [], isLoading: photosLoading } = useQuery({
    queryKey: ['orphan-photos', user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from('move_condition_photos')
        .select('*').eq('user_id', user!.id)
        .order('taken_at', { ascending: false }));
      return (data ?? []) as MoveConditionPhoto[];
    },
    enabled: !!user?.id,
  });

  const totalPaid = payments.reduce((s: number, p: OrphanPaymentEntry) => s + Number(p.amount), 0);
  const paymentsThisMonth = payments.filter((p: OrphanPaymentEntry) => p.payment_date?.slice(0, 7) === new Date().toISOString().slice(0, 7));

  // Add payment
  const addPayment = useMutation({
    mutationFn: async () => {
      if (!payForm.amount) throw new Error('Enter an amount');
      await (supabase.from('orphan_payment_entries').insert({
        user_id:        user!.id,
        record_id:      record?.id ?? null,
        payment_date:   payForm.payment_date,
        amount:         parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        reference:      payForm.reference || null,
        description:    payForm.description || null,
      }));
    },
    onSuccess: () => {
      toast({ title: 'Payment recorded' });
      queryClient.invalidateQueries({ queryKey: ['orphan-payments'] });
      setPayDialog(false);
      setPayForm({ payment_date: new Date().toISOString().slice(0, 10), amount: '', payment_method: 'mpesa', reference: '', description: '' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  // Upload receipt photo against existing payment
  const uploadReceipt = async (paymentId: string, file: File) => {
    setUploadingReceipt(paymentId);
    try {
      const path = `orphan-receipts/${user!.id}/${paymentId}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('maintenance-photos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('maintenance-photos').getPublicUrl(path);
      await (supabase.from('orphan_payment_entries').update({ receipt_photo: publicUrl }).eq('id', paymentId));
      queryClient.invalidateQueries({ queryKey: ['orphan-payments'] });
      toast({ title: 'Receipt uploaded' });
    } catch (err: unknown) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setUploadingReceipt(null);
    }
  };

  // Add condition photo
  const addConditionPhoto = useMutation({
    mutationFn: async () => {
      if (!selectedPhotoFile) throw new Error('Select a photo first');
      const path = `condition-photos/${user!.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('maintenance-photos').upload(path, selectedPhotoFile, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('maintenance-photos').getPublicUrl(path);
      await (supabase.from('move_condition_photos').insert({
        user_id:          user!.id,
        tenant_id:        null,
        phase:            photoForm.phase,
        room:             photoForm.room,
        photo_url:        publicUrl,
        description:      photoForm.description || null,
        condition_rating: photoForm.condition_rating,
        location_note:    photoForm.location_note || null,
        taken_at:         new Date().toISOString(),
      }));
    },
    onSuccess: () => {
      toast({ title: 'Photo logged', description: 'Timestamped and saved to your record.' });
      queryClient.invalidateQueries({ queryKey: ['orphan-photos'] });
      setPhotoDialog(false);
      setSelectedPhotoFile(null); setPreviewUrl(null);
      setPhotoForm({ phase: 'general', room: 'Bedroom', condition_rating: 'good', description: '', location_note: '' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      {/* Orphan banner */}
      <div className="rounded-xl border border-amber-300/50 bg-amber-50/20 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-200">Independent account — not linked to a manager</p>
            <p className="text-xs text-amber-300/80 mt-0.5">
              You're managing your own records. If your manager invites you to their system, your payment history will merge with their official records.
            </p>
          </div>
          <Link to="/tenant/invitation">
            <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-300 hover:bg-amber-900/20 gap-1.5 shrink-0">
              <Link2 className="h-3.5 w-3.5" />Link account
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total recorded',     value: fmt(totalPaid),           color: 'text-green-400' },
          { label: 'Payments logged',    value: String(payments.length),  color: 'text-blue-400' },
          { label: 'Condition photos',   value: String(photos.length),    color: 'text-purple-400' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-border/50 bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="payments">
        <TabsList className="w-full">
          <TabsTrigger value="payments" className="flex-1 gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />Payments
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex-1 gap-1.5">
            <Camera className="h-3.5 w-3.5" />Condition photos
          </TabsTrigger>
          <TabsTrigger value="rental" className="flex-1 gap-1.5">
            <Home className="h-3.5 w-3.5" />My rental
          </TabsTrigger>
        </TabsList>

        {/* Payments tab */}
        <TabsContent value="payments" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Payment diary</p>
            <Button size="sm" className="gap-1.5" onClick={() => setPayDialog(true)}>
              <Plus className="h-3.5 w-3.5" />Add payment
            </Button>
          </div>

          {payLoading ? <Skeleton className="h-20 w-full" /> : payments.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No payments logged yet</p>
              <p className="text-xs mt-1">Tap + Add payment to record your first rent payment</p>
            </div>
          ) : payments.map((p: OrphanPaymentEntry) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${p.payment_method === 'mpesa' ? 'bg-green-100' : 'bg-slate-100'}`}>
                {p.payment_method === 'mpesa' ? '📱' : '💵'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{fmt(Number(p.amount))}</p>
                  <Badge variant="outline" className="text-xs capitalize">{p.payment_method}</Badge>
                  {p.receipt_photo && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(p.payment_date), 'dd/MM/yy')}
                  {p.reference && ` · ${p.reference}`}
                  {p.description && ` — ${p.description}`}
                </p>
              </div>
              <div className="shrink-0">
                {p.receipt_photo ? (
                  <a href={p.receipt_photo} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                      <Eye className="h-3 w-3" />Receipt
                    </Button>
                  </a>
                ) : (
                  <>
                    <input
                      type="file" accept="image/*" className="hidden"
                      id={`receipt-${p.id}`}
                      onChange={e => e.target.files?.[0] && uploadReceipt(p.id, e.target.files[0])}
                    />
                    <label htmlFor={`receipt-${p.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                        <span>
                          {uploadingReceipt === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          Receipt
                        </span>
                      </Button>
                    </label>
                  </>
                )}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Condition photos tab */}
        <TabsContent value="photos" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Property condition photos</p>
            <Button size="sm" className="gap-1.5" onClick={() => setPhotoDialog(true)}>
              <Camera className="h-3.5 w-3.5" />Add photo
            </Button>
          </div>

          <div className="rounded-lg bg-blue-50/10 border border-blue-500/20 p-3 text-xs text-blue-300">
            <p className="flex items-center gap-1.5 font-medium mb-1"><ShieldCheck className="h-3.5 w-3.5" />Why log condition photos?</p>
            <p>Photos are timestamped when saved. This creates evidence of the property's condition at move-in — protecting you from false damage claims when you move out.</p>
          </div>

          {photosLoading ? <Skeleton className="h-32 w-full" /> : photos.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Camera className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No condition photos yet</p>
              <p className="text-xs mt-1">Start by logging your move-in photos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((ph: MoveConditionPhoto) => {
                const cond = CONDITIONS.find(c => c.value === ph.condition_rating);
                return (
                  <div key={ph.id} className="rounded-xl overflow-hidden border border-border/50">
                    <a href={ph.photo_url} target="_blank" rel="noopener noreferrer">
                      <img src={ph.photo_url} alt={ph.room} className="w-full h-32 object-cover" />
                    </a>
                    <div className="p-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-xs capitalize">
                          {ph.phase?.replace('_', ' ')}
                        </Badge>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cond?.color ?? ''}`}>
                          {cond?.label ?? ph.condition_rating}
                        </span>
                      </div>
                      <p className="text-xs font-medium mt-1">{ph.room}</p>
                      {ph.location_note && <p className="text-xs text-muted-foreground">{ph.location_note}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(ph.taken_at), 'dd/MM/yy, HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* My rental tab */}
        <TabsContent value="rental" className="mt-4">
          {!record ? (
            <div className="py-8 text-center text-muted-foreground">
              <Home className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No rental info saved</p>
              <Link to="/portal/profile">
                <Button size="sm" className="mt-3 gap-1.5">
                  <Plus className="h-3.5 w-3.5" />Add rental details
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Property',      value: record.property_name },
                { label: 'Unit',          value: record.unit_label },
                { label: 'Landlord',      value: record.landlord_name },
                { label: 'Landlord tel',  value: record.landlord_phone },
                { label: 'County',        value: record.county },
                { label: 'Move-in date',  value: record.move_in_date ? format(new Date(record.move_in_date), 'dd/MM/yy') : null },
                { label: 'Monthly rent',  value: record.monthly_rent ? fmt(Number(record.monthly_rent)) : null },
              ].filter(r => r.value).map(r => (
                <div key={r.label} className="flex justify-between p-3 rounded-lg bg-card/50 border border-border/50 text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add payment dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record a payment</DialogTitle>
            <DialogDescription>Log a rent or other payment to your diary</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Payment date</Label>
              <Input type="date" value={payForm.payment_date} onChange={e => setPayForm(p => ({...p, payment_date: e.target.value}))} className="mt-1" />
            </div>
            <div>
              <Label>Amount (KES)</Label>
              <Input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({...p, amount: e.target.value}))} placeholder="e.g. 15000" className="mt-1" />
            </div>
            <div>
              <Label>Payment method</Label>
              <Select value={payForm.payment_method} onValueChange={v => setPayForm(p => ({...p, payment_method: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference (M-Pesa code, bank ref, etc.)</Label>
              <Input value={payForm.reference} onChange={e => setPayForm(p => ({...p, reference: e.target.value}))} placeholder="e.g. RBK7GXXXXX" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={payForm.description} onChange={e => setPayForm(p => ({...p, description: e.target.value}))} placeholder="e.g. April 2026 rent" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancel</Button>
            <Button onClick={() => addPayment.mutate()} disabled={!payForm.amount || addPayment.isPending}>
              {addPayment.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add condition photo dialog */}
      <Dialog open={photoDialog} onOpenChange={open => { setPhotoDialog(open); if (!open) { setSelectedPhotoFile(null); setPreviewUrl(null); }}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log condition photo</DialogTitle>
            <DialogDescription>Timestamped evidence of property condition</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Photo picker */}
            <div>
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                  <Button size="sm" variant="outline" className="absolute top-2 right-2 h-7"
                    onClick={() => { setSelectedPhotoFile(null); setPreviewUrl(null); }}>
                    Change
                  </Button>
                </div>
              ) : (
                <button type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary transition-colors">
                  <Camera className="h-8 w-8 opacity-50" />
                  <span className="text-sm">Tap to take/select photo</span>
                </button>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setSelectedPhotoFile(f); setPreviewUrl(URL.createObjectURL(f)); }
                }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phase</Label>
                <Select value={photoForm.phase} onValueChange={v => setPhotoForm(p => ({...p, phase: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="move_in">Move-in</SelectItem>
                    <SelectItem value="general">General / Ongoing</SelectItem>
                    <SelectItem value="move_out">Move-out</SelectItem>
                    <SelectItem value="during_dispute">During dispute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Room</Label>
                <Select value={photoForm.room} onValueChange={v => setPhotoForm(p => ({...p, room: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROOMS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={photoForm.condition_rating} onValueChange={v => setPhotoForm(p => ({...p, condition_rating: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location note</Label>
              <Input value={photoForm.location_note} onChange={e => setPhotoForm(p => ({...p, location_note: e.target.value}))}
                placeholder="e.g. North wall, near window" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={photoForm.description} onChange={e => setPhotoForm(p => ({...p, description: e.target.value}))}
                placeholder="e.g. Crack in plaster already present" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoDialog(false)}>Cancel</Button>
            <Button onClick={() => addConditionPhoto.mutate()} disabled={!selectedPhotoFile || addConditionPhoto.isPending}>
              {addConditionPhoto.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrphanTenantHome;
