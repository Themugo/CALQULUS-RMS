import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import {
  Building2, CreditCard, CheckCircle, ChevronRight,
  Loader2, Smartphone, Landmark, User, Zap
} from 'lucide-react';

const STEPS = [
  { id: 'agency',   title: 'Your agency',     icon: Building2,   desc: 'Set up your agency profile' },
  { id: 'billing',  title: 'Billing method',  icon: CreditCard,  desc: 'How you pay platform fees' },
  { id: 'done',     title: 'All set!',         icon: CheckCircle, desc: 'Start managing properties' },
];

interface Props {
  onComplete: () => void;
}

const ManagerOnboarding: React.FC<Props> = ({ onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  // Agency form
  const [agencyName, setAgencyName] = useState('');
  const [agencyPhone, setAgencyPhone] = useState('');
  const [agencyEmail, setAgencyEmail] = useState(user?.email ?? '');
  const [agencyAddress, setAgencyAddress] = useState('');
  const [county, setCounty] = useState('');

  // Billing
  const [billingMethod, setBillingMethod] = useState('mpesa');

  const saveAgency = useMutation({
    mutationFn: async () => {
      if (!agencyName.trim()) throw new Error('Agency name is required');
      const { data: existing } = await supabase.from('agencies').select('id').eq('manager_id', user!.id).maybeSingle();
      const agencyData = {
        manager_id: user!.id,
        name: agencyName.trim(),
        phone: agencyPhone || null,
        email: agencyEmail || null,
        address: agencyAddress || null,
        county: county || null,
      };
      if (existing) {
        const { error } = await supabase.from('agencies').update(agencyData).eq('id', existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('agencies').insert(agencyData);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => { setStep(1); },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const saveBilling = useMutation({
    mutationFn: async () => {
      await (supabase.from('manager_profiles').upsert({
        manager_user_id: user!.id,
        billing_method: billingMethod,
        status: 'approved',
      }, { onConflict: 'manager_user_id' }));
    },
    onSuccess: () => { setStep(2); },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const progress = Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome to RentFlow</h1>
          <p className="text-slate-400">Let's get your account set up in 2 quick steps</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-6 px-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                    done   ? 'bg-green-600 border-green-600 text-white' :
                    active ? 'bg-primary border-primary text-white' :
                             'bg-slate-800 border-slate-600 text-slate-400'
                  }`}>
                    {done ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-xs ${active ? 'text-white font-medium' : 'text-slate-500'}`}>{s.title}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < step ? 'bg-green-600' : 'bg-slate-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <Progress value={progress} className="mb-6 h-1.5" />

        {/* Step content */}
        <Card className="bg-slate-900/80 border-slate-700/50">
          <CardContent className="p-6">
            {/* Step 0: Agency */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-0.5">Your agency profile</h2>
                  <p className="text-sm text-slate-400">This appears on invoices and receipts sent to tenants.</p>
                </div>
                <div>
                  <Label className="text-slate-300">Agency / Company name *</Label>
                  <Input value={agencyName} onChange={e => setAgencyName(e.target.value)}
                    placeholder="e.g. Kamau Properties Ltd" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300">Phone / M-Pesa</Label>
                    <Input value={agencyPhone} onChange={e => setAgencyPhone(e.target.value)}
                      placeholder="0712 345 678" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Business email</Label>
                    <Input type="email" value={agencyEmail} onChange={e => setAgencyEmail(e.target.value)}
                      className="mt-1 bg-slate-800 border-slate-600 text-white" />
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">County</Label>
                  <Select value={county} onValueChange={setCounty}>
                    <SelectTrigger className="mt-1 bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Select county" /></SelectTrigger>
                    <SelectContent>
                      {['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Kiambu','Machakos','Kajiado','Nyeri','Meru','Embu','Thika','Other'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Address (optional)</Label>
                  <Input value={agencyAddress} onChange={e => setAgencyAddress(e.target.value)}
                    placeholder="Street, building, town" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                </div>
                <Button className="w-full" onClick={() => saveAgency.mutate()} disabled={saveAgency.isPending || !agencyName.trim()}>
                  {saveAgency.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Step 1: Billing method */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-0.5">Platform billing</h2>
                  <p className="text-sm text-slate-400">How would you like to pay your monthly platform fees?</p>
                </div>
                <div className="grid gap-3">
                  {[
                    { value: 'mpesa',        label: 'M-Pesa',          icon: Smartphone, desc: 'Pay via M-Pesa Paybill each month' },
                    { value: 'bank_transfer', label: 'Bank transfer',   icon: Landmark,   desc: 'Pay via bank transfer or EFT' },
                    { value: 'invoice_only',  label: 'Invoice only',    icon: CreditCard, desc: 'Receive invoice and pay manually' },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setBillingMethod(opt.value)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                        billingMethod === opt.value
                          ? 'border-primary bg-primary/10 text-white'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}>
                      <opt.icon className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-xs opacity-70">{opt.desc}</p>
                      </div>
                      {billingMethod === opt.value && <CheckCircle className="h-4 w-4 text-primary ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-slate-400">
                  <p className="font-medium text-slate-300 mb-1">Platform fee</p>
                  <p>KES 500 per property per month (Starter plan). Your plan can be upgraded as your portfolio grows. First 30 days free.</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 border-slate-600 text-slate-300" onClick={() => setStep(0)}>Back</Button>
                  <Button className="flex-1" onClick={() => saveBilling.mutate()} disabled={saveBilling.isPending}>
                    {saveBilling.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Continue <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Done */}
            {step === 2 && (
              <div className="space-y-5 text-center">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">You're all set!</h2>
                  <p className="text-slate-400 text-sm">Your agency is configured. Start by adding your first property.</p>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { icon: Building2, text: 'Add a property → then add units' },
                    { icon: User, text: 'Invite your first tenant' },
                    { icon: CreditCard, text: 'Generate your first invoice' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/50 text-slate-300">
                      <item.icon className="h-4 w-4 text-primary shrink-0" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full" size="lg" onClick={onComplete}>
                  Go to dashboard <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerOnboarding;
