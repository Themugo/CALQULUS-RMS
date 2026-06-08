import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { addDays, format } from 'date-fns';

interface Manager {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  property_count: number;
  has_registration_invoice: boolean;
  net_collection: number;
}

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface BillingConfig {
  registration: {
    name: string;
    description: string;
    amount: number;
  };
  subscription: {
    name: string;
    description: string;
    rate: number;
  };
}

interface ManualInvoiceFormProps {
  managers: Manager[] | undefined;
  billingConfig: BillingConfig;
  onSubmit: (data: {
    manager_user_id: string;
    amount: number;
    description: string;
    due_date: string;
    invoice_type: string;
    net_collection: number;
    commission_rate: number;
  }) => void;
  isPending: boolean;
}

const ManualInvoiceForm: React.FC<ManualInvoiceFormProps> = ({
  managers,
  billingConfig,
  onSubmit,
  isPending,
}) => {
  const [selectedManager, setSelectedManager] = useState('');
  const [invoiceType, setInvoiceType] = useState<'registration' | 'subscription' | 'custom'>('registration');
  const [dueInDays, setDueInDays] = useState('30');
  const [notes, setNotes] = useState('');
  
  // Line items for custom invoice
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { id: '1', description: '', quantity: 1, rate: 0, amount: 0 }
  ]);

  const selectedManagerData = useMemo(() => 
    managers?.find(m => m.user_id === selectedManager),
    [managers, selectedManager]
  );

  // Calculate automatic amounts based on type
  const autoCalculatedAmount = useMemo(() => {
    if (invoiceType === 'registration') {
      return billingConfig.registration.amount;
    }
    if (invoiceType === 'subscription' && selectedManagerData) {
      return Math.round(selectedManagerData.net_collection * billingConfig.subscription.rate);
    }
    return 0;
  }, [invoiceType, selectedManagerData, billingConfig]);

  // Calculate total from line items
  const lineItemsTotal = useMemo(() => 
    lineItems.reduce((sum, item) => sum + item.amount, 0),
    [lineItems]
  );

  const totalAmount = invoiceType === 'custom' ? lineItemsTotal : autoCalculatedAmount;

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      // Recalculate amount if quantity or rate changes
      if (field === 'quantity' || field === 'rate') {
        updated.amount = Number(updated.quantity) * Number(updated.rate);
      }
      
      return updated;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedManager) return;

    let description = '';
    let netCollection = 0;
    let commissionRate = 0;

    if (invoiceType === 'registration') {
      description = `Registration Fee - KES ${billingConfig.registration.amount.toLocaleString()}`;
    } else if (invoiceType === 'subscription') {
      netCollection = selectedManagerData?.net_collection || 0;
      commissionRate = billingConfig.subscription.rate;
      const ratePercent = (commissionRate * 100).toFixed(1);
      description = `Monthly Subscription - ${ratePercent}% of KES ${netCollection.toLocaleString()} net collection`;
    } else {
      // Custom invoice - create description from line items
      const itemDescriptions = lineItems
        .filter(item => item.description && item.amount > 0)
        .map(item => `${item.description}: KES ${item.amount.toLocaleString()}`)
        .join('; ');
      description = notes ? `${notes} | ${itemDescriptions}` : itemDescriptions;
    }

    const dueDate = addDays(new Date(), parseInt(dueInDays));

    onSubmit({
      manager_user_id: selectedManager,
      amount: totalAmount,
      description,
      due_date: dueDate.toISOString().split('T')[0],
      invoice_type: invoiceType === 'custom' ? 'other' : invoiceType,
      net_collection: netCollection,
      commission_rate: commissionRate,
    });
  };

  // Filter managers for registration (exclude those with existing registration invoice)
  const filteredManagers = useMemo(() => {
    if (invoiceType === 'registration') {
      return managers?.filter(m => !m.has_registration_invoice) || [];
    }
    return managers || [];
  }, [managers, invoiceType]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Invoice Type Selection */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant={invoiceType === 'registration' ? 'default' : 'outline'}
          className={invoiceType === 'registration' 
            ? 'bg-purple-600 hover:bg-purple-700' 
            : 'border-purple-700/50 text-purple-300 hover:bg-purple-900/30'}
          onClick={() => setInvoiceType('registration')}
        >
          Registration
        </Button>
        <Button
          type="button"
          variant={invoiceType === 'subscription' ? 'default' : 'outline'}
          className={invoiceType === 'subscription' 
            ? 'bg-purple-600 hover:bg-purple-700' 
            : 'border-purple-700/50 text-purple-300 hover:bg-purple-900/30'}
          onClick={() => setInvoiceType('subscription')}
        >
          Subscription
        </Button>
        <Button
          type="button"
          variant={invoiceType === 'custom' ? 'default' : 'outline'}
          className={invoiceType === 'custom' 
            ? 'bg-purple-600 hover:bg-purple-700' 
            : 'border-purple-700/50 text-purple-300 hover:bg-purple-900/30'}
          onClick={() => setInvoiceType('custom')}
        >
          Custom
        </Button>
      </div>

      {/* Manager Selection */}
      <div className="space-y-2">
        <Label className="text-purple-200">Select Manager</Label>
        <Select value={selectedManager} onValueChange={setSelectedManager}>
          <SelectTrigger className="bg-slate-700 border-purple-700/50 text-white">
            <SelectValue placeholder="Choose a manager" />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-purple-700/50">
            {filteredManagers.map((manager) => (
              <SelectItem key={manager.user_id} value={manager.user_id} className="text-white">
                <div className="flex items-center gap-2">
                  <span>{manager.full_name || manager.email}</span>
                  {invoiceType === 'subscription' && (
                    <Badge variant="outline" className="text-xs text-purple-300 border-purple-600">
                      KES {manager.net_collection.toLocaleString()}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Line Items Table (for all types) */}
      <div className="border border-purple-700/50 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-700/50 border-purple-700/30 hover:bg-slate-700/50">
              <TableHead className="text-purple-300 font-semibold">Description</TableHead>
              <TableHead className="text-purple-300 font-semibold w-20 text-center">Qty</TableHead>
              <TableHead className="text-purple-300 font-semibold w-28 text-right">Rate (KES)</TableHead>
              <TableHead className="text-purple-300 font-semibold w-28 text-right">Amount</TableHead>
              {invoiceType === 'custom' && (
                <TableHead className="text-purple-300 w-12"></TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoiceType !== 'custom' ? (
              // Auto-calculated row for registration/subscription
              <TableRow className="border-purple-700/30">
                <TableCell className="text-white">
                  {invoiceType === 'registration' 
                    ? billingConfig.registration.name
                    : `${billingConfig.subscription.name} (${(billingConfig.subscription.rate * 100).toFixed(1)}%)`
                  }
                </TableCell>
                <TableCell className="text-center text-purple-200">1</TableCell>
                <TableCell className="text-right text-purple-200">
                  {invoiceType === 'registration' 
                    ? billingConfig.registration.amount.toLocaleString()
                    : (selectedManagerData?.net_collection || 0).toLocaleString()
                  }
                </TableCell>
                <TableCell className="text-right text-white font-semibold">
                  {autoCalculatedAmount.toLocaleString()}
                </TableCell>
              </TableRow>
            ) : (
              // Editable line items for custom invoice
              lineItems.map((item) => (
                <TableRow key={item.id} className="border-purple-700/30">
                  <TableCell className="p-1">
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Enter description"
                      className="bg-slate-700/50 border-purple-700/30 text-white h-9"
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="bg-slate-700/50 border-purple-700/30 text-white h-9 text-center"
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                      className="bg-slate-700/50 border-purple-700/30 text-white h-9 text-right"
                    />
                  </TableCell>
                  <TableCell className="p-1 text-right">
                    <div className="bg-slate-700/50 border border-purple-700/30 rounded-md px-3 py-1.5 text-white font-semibold">
                      {item.amount.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-9 w-9 p-0"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
            
            {/* Add Row Button (for custom) */}
            {invoiceType === 'custom' && (
              <TableRow className="border-purple-700/30 hover:bg-transparent">
                <TableCell colSpan={5} className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 border border-dashed border-purple-700/50"
                    onClick={addLineItem}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line Item
                  </Button>
                </TableCell>
              </TableRow>
            )}

            {/* Total Row */}
            <TableRow className="bg-purple-900/30 border-purple-700/30 hover:bg-purple-900/30">
              <TableCell colSpan={invoiceType === 'custom' ? 3 : 3} className="text-right text-purple-200 font-semibold">
                Total:
              </TableCell>
              <TableCell className="text-right text-white font-bold text-lg" colSpan={invoiceType === 'custom' ? 2 : 1}>
                KES {totalAmount.toLocaleString()}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Due Date & Notes Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-purple-200">Due In</Label>
          <Select value={dueInDays} onValueChange={setDueInDays}>
            <SelectTrigger className="bg-slate-700 border-purple-700/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-purple-700/50">
              <SelectItem value="7" className="text-white">7 days</SelectItem>
              <SelectItem value="14" className="text-white">14 days</SelectItem>
              <SelectItem value="30" className="text-white">30 days</SelectItem>
              <SelectItem value="60" className="text-white">60 days</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-purple-400">
            Due: {format(addDays(new Date(), parseInt(dueInDays)), 'dd/MM/yy')}
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-purple-200">Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            className="bg-slate-700 border-purple-700/50 text-white h-[76px] resize-none"
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full bg-purple-600 hover:bg-purple-700"
        disabled={isPending || !selectedManager || totalAmount <= 0}
      >
        <Calculator className="h-4 w-4 mr-2" />
        {isPending ? 'Creating Invoice...' : `Create Invoice - KES ${totalAmount.toLocaleString()}`}
      </Button>
    </form>
  );
};

export default ManualInvoiceForm;
