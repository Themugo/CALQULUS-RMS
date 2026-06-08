import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/features/auth/AuthContext';
import { DollarSign, Percent, Plus, Pencil, Tag, Shield, Ban } from 'lucide-react';
import { useActivityLog } from '@/shared/hooks/useActivityLog';

interface CustomerBillingBlock {
  id: string;
  customer_id: string;
  customer_type: 'manager' | 'landlord' | 'agency';
  price_per_unit: number | null;
  unit_count_locked: boolean;
  registration_fee_waived: boolean;
  registration_fee_amount: number;
  monthly_discount_pct: number;
  monthly_discount_flat: number;
  discount_label: string | null;
  discount_expires_at: string | null;
  zero_registration: boolean;
  custom_block_name: string | null;
  custom_block_price: number | null;
  custom_block_units: number | null;
  custom_block_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

interface CustomerOption {
  user_id: string;
  email: string;
  full_name: string | null;
  type: 'manager' | 'landlord';
}

const CustomerBillingBlocks = () => {
  const { toast } = useToast();
  const { isPlatformOwner, isPlatformBusiness, user } = useAuth();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<CustomerBillingBlock | null>(null);

  const canManage = isPlatformOwner || isPlatformBusiness;

  const [form, setForm] = useState({
    customer_id: '',
    customer_type: 'manager' as 'manager' | 'landlord',
    price_per_unit: '',
    unit_count_locked: false,
    registration_fee_waived: false,
    registration_fee_amount: '0',
    monthly_discount_pct: '0',
    monthly_discount_flat: '0',
    discount_label: '',
    discount_expires_at: '',
    zero_registration: false,
    custom_block_name: '',
    custom_block_price: '',
    custom_block_units: '',
    custom_block_notes: '',
  });

  const { data: blocks, isLoading } = useQuery({
    queryKey: ['customer-billing-blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_billing_blocks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CustomerBillingBlock[];
    },
    enabled: canManage,
  });

  const { data: customers } = useQuery({
    queryKey: ['customer-options'],
    queryFn: async () => {
      const [managers, landlords] = await Promise.all([
        supabase.from('user_roles').select('user_id').eq('role', 'manager'),
        supabase.from('user_roles').select('user_id').eq('role', 'landlord'),
      ]);
      const allIds = [
        ...(managers.data || []).map(r => ({ user_id: r.user_id, type: 'manager' as const })),
        ...(landlords.data || []).map(r => ({ user_id: r.user_id, type: 'landlord' as const })),
      ];
      const results: CustomerOption[] = [];
      for (const { user_id, type } of allIds) {
        const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', user_id).single();
        if (profile) results.push({ user_id, email: profile.email, full_name: profile.full_name, type });
      }
      return results;
    },
    enabled: canManage,
    staleTime: 60000,
  });

  const resetForm = () => {
    setForm({
      customer_id: '', customer_type: 'manager', price_per_unit: '',
      unit_count_locked: false, registration_fee_waived: false,
      registration_fee_amount: '0', monthly_discount_pct: '0',
      monthly_discount_flat: '0', discount_label: '',
      discount_expires_at: '', zero_registration: false,
      custom_block_name: '', custom_block_price: '', custom_block_units: '',
      custom_block_notes: '',
    });
    setEditingBlock(null);
  };

  const openEdit = (block: CustomerBillingBlock) => {
    setForm({
      customer_id: block.customer_id,
      customer_type: block.customer_type,
      price_per_unit: block.price_per_unit?.toString() || '',
      unit_count_locked: block.unit_count_locked,
      registration_fee_waived: block.registration_fee_waived,
      registration_fee_amount: block.registration_fee_amount.toString(),
      monthly_discount_pct: block.monthly_discount_pct.toString(),
      monthly_discount_flat: block.monthly_discount_flat.toString(),
      discount_label: block.discount_label || '',
      discount_expires_at: block.discount_expires_at || '',
      zero_registration: block.zero_registration,
      custom_block_name: block.custom_block_name || '',
      custom_block_price: block.custom_block_price?.toString() || '',
      custom_block_units: block.custom_block_units?.toString() || '',
      custom_block_notes: block.custom_block_notes || '',
    });
    setEditingBlock(block);
    setIsDialogOpen(true);
  };

  const saveBlock = useMutation({
    mutationFn: async () => {
      if (!form.customer_id) throw new Error('Select a customer');
      const payload = {
        customer_id: form.customer_id,
        customer_type: form.customer_type,
        price_per_unit: form.price_per_unit ? parseFloat(form.price_per_unit) : null,
        unit_count_locked: form.unit_count_locked,
        registration_fee_waived: form.registration_fee_waived,
        registration_fee_amount: parseFloat(form.registration_fee_amount) || 0,
        monthly_discount_pct: parseFloat(form.monthly_discount_pct) || 0,
        monthly_discount_flat: parseFloat(form.monthly_discount_flat) || 0,
        discount_label: form.discount_label || null,
        discount_expires_at: form.discount_expires_at || null,
        zero_registration: form.zero_registration,
        custom_block_name: form.custom_block_name || null,
        custom_block_price: form.custom_block_price ? parseFloat(form.custom_block_price) : null,
        custom_block_units: form.custom_block_units ? parseInt(form.custom_block_units) : null,
        custom_block_notes: form.custom_block_notes || null,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      };

      if (editingBlock) {
        const { error } = await supabase.from('customer_billing_blocks').update(payload).eq('id', editingBlock.id);
        if (error) throw error;
        logActivity({ action: 'Updated Customer Billing Block', entityType: 'customer_billing_blocks', entityId: editingBlock.id });
      } else {
        const { data, error } = await supabase.from('customer_billing_blocks').insert(payload).select().single();
        if (error) throw error;
        logActivity({ action: 'Created Customer Billing Block', entityType: 'customer_billing_blocks', entityId: data.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-billing-blocks'] });
      toast({ title: editingBlock ? 'Billing block updated' : 'Billing block created' });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customer_billing_blocks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-billing-blocks'] });
      toast({ title: 'Billing block removed' });
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const getCustomerName = (customerId: string) => {
    const c = customers?.find(c => c.user_id === customerId);
    return c ? (c.full_name || c.email) : customerId.slice(0, 8) + '...';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Customer Billing Blocks
            </CardTitle>
            <CardDescription>
              Per-unit pricing overrides, waivers, discounts, and custom negotiated blocks per customer.
              Only owner and business-level admins can manage billing blocks.
            </CardDescription>
          </div>
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={v => { setIsDialogOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}><Plus className="h-4 w-4 mr-2" />New Billing Block</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingBlock ? 'Edit' : 'New'} Billing Block</DialogTitle>
                  <DialogDescription>Configure custom pricing for a customer.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select
                      value={form.customer_id}
                      onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}
                      disabled={!!editingBlock}
                    >
                      <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>
                        {customers?.map(c => (
                          <SelectItem key={c.user_id} value={c.user_id}>
                            {c.full_name || c.email} ({c.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Type</Label>
                    <Select value={form.customer_type} onValueChange={(v: 'manager' | 'landlord') => setForm(f => ({ ...f, customer_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="landlord">Landlord</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">Per-Unit Pricing</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Price per unit (KES)</Label>
                        <Input type="number" value={form.price_per_unit} onChange={e => setForm(f => ({ ...f, price_per_unit: e.target.value }))} placeholder="Leave empty for tier default" />
                      </div>
                      <div className="space-y-2 flex items-end pb-2">
                        <Label className="flex items-center gap-2">
                          <Switch checked={form.unit_count_locked} onCheckedChange={v => setForm(f => ({ ...f, unit_count_locked: v }))} />
                          Lock unit count
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">Registration Fee</h4>
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Switch checked={form.registration_fee_waived} onCheckedChange={v => setForm(f => ({ ...f, registration_fee_waived: v }))} />
                        Waive registration fee
                      </Label>
                      {!form.registration_fee_waived && (
                        <div className="space-y-2">
                          <Label>Registration fee amount (KES)</Label>
                          <Input type="number" value={form.registration_fee_amount} onChange={e => setForm(f => ({ ...f, registration_fee_amount: e.target.value }))} />
                        </div>
                      )}
                      <Label className="flex items-center gap-2">
                        <Switch checked={form.zero_registration} onCheckedChange={v => setForm(f => ({ ...f, zero_registration: v }))} />
                        Zero registration (fully exempt)
                      </Label>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">Monthly Discounts</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Discount %</Label>
                        <Input type="number" value={form.monthly_discount_pct} onChange={e => setForm(f => ({ ...f, monthly_discount_pct: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Flat discount (KES)</Label>
                        <Input type="number" value={form.monthly_discount_flat} onChange={e => setForm(f => ({ ...f, monthly_discount_flat: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="space-y-2">
                        <Label>Discount label</Label>
                        <Input value={form.discount_label} onChange={e => setForm(f => ({ ...f, discount_label: e.target.value }))} placeholder="e.g. Early adopter" />
                      </div>
                      <div className="space-y-2">
                        <Label>Expires</Label>
                        <Input type="date" value={form.discount_expires_at?.split('T')[0] || ''} onChange={e => setForm(f => ({ ...f, discount_expires_at: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">Custom Negotiated Block</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Block name</Label>
                        <Input value={form.custom_block_name} onChange={e => setForm(f => ({ ...f, custom_block_name: e.target.value }))} placeholder="e.g. Bulk deal Q3" />
                      </div>
                      <div className="space-y-2">
                        <Label>Block price (KES)</Label>
                        <Input type="number" value={form.custom_block_price} onChange={e => setForm(f => ({ ...f, custom_block_price: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Block units</Label>
                        <Input type="number" value={form.custom_block_units} onChange={e => setForm(f => ({ ...f, custom_block_units: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2 mt-3">
                      <Label>Notes</Label>
                      <Input value={form.custom_block_notes} onChange={e => setForm(f => ({ ...f, custom_block_notes: e.target.value }))} placeholder="Internal notes about this negotiation" />
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => saveBlock.mutate()} disabled={saveBlock.isPending || !form.customer_id}>
                    {saveBlock.isPending ? 'Saving...' : editingBlock ? 'Update Block' : 'Create Block'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : !canManage ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Only owner and business-level admins can manage billing blocks.</p>
          </div>
        ) : !blocks || blocks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No custom billing blocks configured. Create one to override default tier pricing for a customer.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Reg. Fee</TableHead>
                <TableHead>Custom Block</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blocks.map(block => (
                <TableRow key={block.id}>
                  <TableCell className="font-medium">{getCustomerName(block.customer_id)}</TableCell>
                  <TableCell><Badge variant="secondary">{block.customer_type}</Badge></TableCell>
                  <TableCell>
                    {block.price_per_unit ? `KES ${block.price_per_unit}/unit` : <span className="text-muted-foreground">Tier default</span>}
                  </TableCell>
                  <TableCell>
                    {block.monthly_discount_pct > 0 || block.monthly_discount_flat > 0 ? (
                      <Badge className="bg-green-100 text-green-800">
                        {block.monthly_discount_pct > 0 && `${block.monthly_discount_pct}%`}
                        {block.monthly_discount_pct > 0 && block.monthly_discount_flat > 0 && ' + '}
                        {block.monthly_discount_flat > 0 && `KES ${block.monthly_discount_flat}`}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {block.registration_fee_waived || block.zero_registration ? (
                      <Badge className="bg-orange-100 text-orange-800">Waived</Badge>
                    ) : `KES ${block.registration_fee_amount}`}
                  </TableCell>
                  <TableCell>
                    {block.custom_block_name ? (
                      <span className="text-sm">{block.custom_block_name} ({block.custom_block_units} units @ KES {block.custom_block_price})</span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(block)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteBlock.mutate(block.id)}><Ban className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerBillingBlocks;
