/**
 * TenantSelfRegister
 *
 * Allows tenants to create a RentFlow account WITHOUT a manager invitation.
 * "Orphan tenant" — they self-manage their payment diary, receipts, and
 * property condition photos. They can later be linked to a manager's property
 * if the manager sends them an invitation.
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';
import { UserPlus, Home, ChevronRight, CheckCircle, Loader2, ShieldCheck } from 'lucide-react';
import rentflowLogo from '@/assets/rentflow-logo.png';

const STEPS = [
  { id: 'account',  label: 'Your account' },
  { id: 'property', label: 'Your rental' },
  { id: 'done',     label: 'All set' },
];

const TenantSelfRegister: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 — account
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [password, setPassword]     = useState('');
  const [password2, setPassword2]   = useState('');

  // Step 2 — rental info (optional)
  const [propertyName, setPropertyName] = useState('');
  const [unitLabel, setUnitLabel]       = useState('');
  const [landlordName, setLandlordName] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');
  const [county, setCounty]             = useState('');
  const [moveInDate, setMoveInDate]     = useState('');
  const [monthlyRent, setMonthlyRent]   = useState('');

  const [userId, setUserId] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    if (!name.trim() || !email.trim() || !password) {
      toast({ title: 'Required fields missing', variant: 'destructive' }); return;
    }
    if (password !== password2) {
      toast({ title: 'Passwords do not match', variant: 'destructive' }); return;
    }
    if (password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' }); return;
    }

    setLoading(true);
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: name.trim(), phone: phone || null, role: 'tenant' } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create account');

      if (!authData.session) {
        toast({
          title: 'Check your email',
          description: 'Confirm your email, then sign in to finish setting up your tenant portal.',
        });
        navigate('/tenant/login');
        return;
      }

      const uid = authData.user.id;
      setUserId(uid);

      // Create user_role as tenant (no tenant_id — orphan)
      const { error: roleError } = await supabase.from('user_roles').upsert({
        user_id:         uid,
        role:            'tenant',
        approval_status: 'approved',
        tenant_id:       null,  // orphan — no manager's tenant record
      }, {
        onConflict: 'user_id,role',
      });
      if (roleError) throw roleError;

      // Create profile
      await supabase.from('profiles').upsert({
        id:        uid,
        full_name: name.trim(),
        email:     email.trim().toLowerCase(),
        phone:     phone || null,
      }).catch(() => {});

      setStep(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Registration failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRental = async () => {
    setLoading(true);
    try {
      if (userId && propertyName.trim()) {
        // Create orphan tenant record
        await (supabase.from('orphan_tenant_records').insert({
          user_id:       userId,
          property_name: propertyName.trim(),
          unit_label:    unitLabel || null,
          landlord_name: landlordName || null,
          landlord_phone:landlordPhone || null,
          county:        county || null,
          move_in_date:  moveInDate || null,
          monthly_rent:  monthlyRent ? parseFloat(monthlyRent) : null,
        }));
      }
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Could not save rental info', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    window.location.assign('/portal');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={rentflowLogo} alt="RentFlow" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Create your tenant account</h1>
          <p className="text-slate-400 text-sm mt-1">
            Keep your payment records, receipts, and property condition photos — even without a manager invitation.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-6 px-4">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-colors ${
                  i < step  ? 'bg-green-600 border-green-600 text-white' :
                  i === step ? 'bg-primary border-primary text-white' :
                               'bg-slate-800 border-slate-600 text-slate-400'
                }`}>
                  {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs ${i === step ? 'text-white font-medium' : 'text-slate-500'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < step ? 'bg-green-600' : 'bg-slate-700'}`}/>}
            </React.Fragment>
          ))}
        </div>

        <Card className="bg-slate-900/80 border-slate-700/50">
          {/* Step 0: Account */}
          {step === 0 && (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-white">Create your account</CardTitle>
                <CardDescription className="text-slate-400">Your personal RentFlow login</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300">Full name *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Jane Wanjiru" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <Label className="text-slate-300">Email address *</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="jane@email.com" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <Label className="text-slate-300">Phone / WhatsApp (optional)</Label>
                  <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="0712 345 678" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <Label className="text-slate-300">Password *</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <Label className="text-slate-300">Confirm password *</Label>
                  <Input type="password" value={password2} onChange={e => setPassword2(e.target.value)}
                    placeholder="Re-enter password" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                </div>
                <Button onClick={handleCreateAccount} disabled={loading || !name || !email || !password}
                  className="w-full bg-primary hover:bg-primary/90 gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Create account
                </Button>
              </CardContent>
            </>
          )}

          {/* Step 1: Rental info */}
          {step === 1 && (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-white">Your rental (optional)</CardTitle>
                <CardDescription className="text-slate-400">
                  Add your current rental details so you can track payments and condition photos.
                  You can skip this and add it later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300">Property name</Label>
                  <Input value={propertyName} onChange={e => setPropertyName(e.target.value)}
                    placeholder="e.g. Kamau Estate Block A" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300">Unit / Room</Label>
                    <Input value={unitLabel} onChange={e => setUnitLabel(e.target.value)}
                      placeholder="e.g. Flat 4B" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                  </div>
                  <div>
                    <Label className="text-slate-300">County</Label>
                    <Input value={county} onChange={e => setCounty(e.target.value)}
                      placeholder="e.g. Nairobi" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300">Landlord / Agent name</Label>
                    <Input value={landlordName} onChange={e => setLandlordName(e.target.value)}
                      placeholder="Optional" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Landlord phone</Label>
                    <Input value={landlordPhone} onChange={e => setLandlordPhone(e.target.value)}
                      placeholder="Optional" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300">Move-in date</Label>
                    <Input type="date" value={moveInDate} onChange={e => setMoveInDate(e.target.value)}
                      className="mt-1 bg-slate-800 border-slate-600 text-white" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Monthly rent (KES)</Label>
                    <Input type="number" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)}
                      placeholder="e.g. 15000" className="mt-1 bg-slate-800 border-slate-600 text-white" />
                  </div>
                </div>

                <div className="rounded-lg bg-blue-900/20 border border-blue-700/30 p-3 text-xs text-blue-300">
                  <p className="font-medium mb-1">💡 Why add rental details?</p>
                  <p>You'll be able to track your rent payments, upload receipts for each month, and log property condition photos that are timestamped and signed. These protect you if there's a deposit dispute when you move out.</p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-slate-600 text-slate-300">
                    Skip for now
                  </Button>
                  <Button onClick={handleSaveRental} disabled={loading} className="flex-1 gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                    Save & continue
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Done */}
          {step === 2 && (
            <>
              <CardHeader className="pb-4 text-center">
                <div className="flex justify-center mb-3">
                  <div className="h-16 w-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                    <CheckCircle className="h-9 w-9 text-green-500" />
                  </div>
                </div>
                <CardTitle className="text-white text-xl">You're in!</CardTitle>
                <CardDescription className="text-slate-400">
                  Your RentFlow account is ready. Here's what you can do:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: '💰', title: 'Log your payments', desc: 'Record every rent payment with date, amount, and M-Pesa code' },
                  { icon: '📸', title: 'Photograph your rental', desc: 'Take move-in photos that are timestamped — evidence if landlord claims damage at move-out' },
                  { icon: '🧾', title: 'Upload receipts', desc: 'Photograph physical receipts so they\'re never lost. All in one place.' },
                  { icon: '🔧', title: 'Request repairs', desc: 'Log maintenance issues and find verified service providers' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/50">
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}

                <div className="rounded-lg bg-amber-900/20 border border-amber-700/30 p-3 text-xs text-amber-300">
                  <p className="flex items-center gap-1.5 font-medium mb-1"><ShieldCheck className="h-3.5 w-3.5" />Already invited by your manager?</p>
                  <p>If your manager sends you an invitation link later, accept it to link your account to their system and see your official invoices, lease, and payments.</p>
                </div>

                <Button onClick={handleFinish} className="w-full gap-2 bg-primary hover:bg-primary/90" size="lg">
                  <Home className="h-4 w-4" />
                  Go to my portal
                </Button>
              </CardContent>
            </>
          )}

          <CardFooter className="border-t border-slate-700/50 pt-4">
            <p className="text-xs text-slate-500 text-center w-full">
              Already have an account?{' '}
              <Link to="/tenant/login" className="text-primary hover:text-primary/80">Sign in</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default TenantSelfRegister;
