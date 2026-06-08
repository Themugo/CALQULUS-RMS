import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Building2, CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';

interface Invitation {
  id: string;
  property_id: string;
  manager_id: string;
  email: string;
  status: string;
  expires_at: string;
  properties?: { name: string; address: string };
}

const LandlordInvitationAccept: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signUp, signIn } = useAuth();
  const { toast } = useToast();

  const token = searchParams.get('token');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [property, setProperty] = useState<{ name: string; address: string } | null>(null);
  const [status, setStatus] = useState<'loading' | 'found' | 'expired' | 'accepted' | 'error'>('loading');
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const loadInvitation = useCallback(async () => {
    const { data: inv, error } = await supabase
      .from('landlord_invitations')
      .select('*, properties(name, address)')
      .eq('token', token!)
      .maybeSingle();

    if (error || !inv) { setStatus('error'); return; }
    if ((inv as Invitation).status === 'accepted') { setStatus('accepted'); return; }
    if (new Date((inv as Invitation).expires_at) < new Date()) { setStatus('expired'); return; }

    setInvitation(inv as Invitation);
    setProperty((inv as Invitation).properties || null);
    setForm(p => ({ ...p, email: (inv as Invitation).email }));
    setStatus('found');
  }, [token]);

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    loadInvitation();
  }, [token, loadInvitation]);

  const acceptInvitation = useCallback(async () => {
    if (!user || !invitation) return;
    setSubmitting(true);
    try {
      // Create property_landlords link
      await supabase.from('property_landlords').upsert({
        property_id:      invitation.property_id,
        landlord_user_id: user.id,
        manager_id:       invitation.manager_id,
        revenue_share_pct: 100,
      }, { onConflict: 'property_id' });

      // Create user_role as landlord if not exists
      await supabase.from('user_roles').upsert({
        user_id: user.id,
        role:    'landlord',
      }, { onConflict: 'user_id' });

      // Mark invitation accepted
      await supabase.from('landlord_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      toast({ title: 'Welcome!', description: `You now have access to ${property?.name}` });
      navigate('/landlord/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept';
      toast({ title: 'Failed to accept', description: message, variant: 'destructive' });
    }
    setSubmitting(false);
  }, [user, invitation, toast, navigate, property]);

  useEffect(() => {
    if (user && invitation) acceptInvitation();
  }, [user, invitation, acceptInvitation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'register') {
        const { error } = await signUp(form.email, form.password, form.name, 'landlord');
        if (error) throw error;
        toast({ title: 'Account created', description: 'Please check your email to verify, then you\'ll be linked automatically.' });
      } else {
        const { error } = await signIn(form.email, form.password);
        if (error) throw error;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed';
      toast({ title: 'Failed', description: message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="font-semibold text-lg mb-2">Invalid invitation</h2>
            <p className="text-muted-foreground text-sm">This invitation link is invalid or has been used.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <h2 className="font-semibold text-lg mb-2">Invitation expired</h2>
            <p className="text-muted-foreground text-sm">This invitation link has expired. Ask your property manager to send a new one.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h2 className="font-semibold text-lg mb-2">Already accepted</h2>
            <p className="text-muted-foreground text-sm mb-4">This invitation has already been accepted.</p>
            <Button onClick={() => navigate('/landlord/login')}>Go to login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-950 via-slate-900 to-amber-950 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Property info */}
        <Card className="border-amber-700/30 bg-slate-900/80 text-white">
          <CardContent className="py-6 text-center">
            <div className="h-12 w-12 mx-auto rounded-xl bg-amber-600/20 flex items-center justify-center mb-3">
              <Building2 className="h-6 w-6 text-amber-400" />
            </div>
            <h2 className="font-semibold text-lg">{property?.name}</h2>
            <p className="text-amber-300/70 text-sm">{property?.address}</p>
            <p className="text-white/60 text-xs mt-2">You have been invited as a landlord</p>
          </CardContent>
        </Card>

        {/* Auth form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>{mode === 'register' ? 'Create your landlord account' : 'Sign in to accept'}</CardTitle>
            <CardDescription>
              {mode === 'register'
                ? 'Set up your account to view your property earnings and request payouts.'
                : 'Sign in to your existing account to accept this invitation.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <Label>Full name</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" className="mt-1" required />
                </div>
              )}
              <div>
                <Label>Email address</Label>
                <Input type="email" value={form.email} readOnly className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Choose a secure password"
                    required
                    minLength={8}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {mode === 'register' ? 'Create account & accept' : 'Sign in & accept'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {mode === 'register' ? 'Already have an account? ' : 'New to RentFlow? '}
                <button type="button" className="text-primary hover:underline" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
                  {mode === 'register' ? 'Sign in instead' : 'Create an account'}
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LandlordInvitationAccept;
