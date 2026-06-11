import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';
import { Handshake, Shield, Eye, EyeOff } from 'lucide-react';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { sanitizeAuthError } from '@/features/auth/lib/authFlow';
import calqulusLogo from '@/assets/calqulusrms-logo.png';

const AgencyAuth = () => {
  const navigate = useNavigate();
  const { user, signIn, loading, userRole } = useAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && !loading && userRole) {
      if (userRole.role === 'agency') navigate('/agency');
      else if (userRole.role === 'manager') navigate('/');
      else if (userRole.role === 'landlord') navigate('/landlord/dashboard');
      else if (userRole.role === 'tenant') navigate('/portal');
      else if (userRole.role === 'webhost') navigate('/webhost');
    }
  }, [user, loading, userRole, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({
        title: 'Login failed',
        description: sanitizeAuthError(error.message),
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Welcome back!', description: 'Redirecting to your agency dashboard...' });
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 px-4 relative overflow-hidden">
      {/* Banner background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/calqulus-banner.jpg" 
          alt="CALQULUS RMS Banner" 
          className="w-full h-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-slate-900/90 to-emerald-950/85" />
      </div>
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl p-4 shadow-lg border border-emerald-200 mb-4">
            <img 
              src={calqulusLogo} 
              alt="CALQULUS RMS" 
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Agency Portal</h1>
          <p className="text-emerald-300 text-sm mt-1">Property agent access — manage landlords, tenants & operations</p>
        </div>

        <Card className="border-emerald-800/40 bg-slate-900/80 backdrop-blur-sm shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Sign in to your account</CardTitle>
            <CardDescription className="text-emerald-300/80">
              Access your agency dashboard, manage properties and clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-emerald-200">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@agency.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-slate-800/50 border-emerald-700/50 text-white placeholder:text-emerald-400/40 focus:border-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-emerald-200">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="bg-slate-800/50 border-emerald-700/50 text-white placeholder:text-emerald-400/40 focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400/60 hover:text-emerald-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <ForgotPasswordDialog>
                  <button type="button" className="text-xs text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline">
                    Forgot password?
                  </button>
                </ForgotPasswordDialog>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in to Agency Portal'}
              </Button>
            </form>

            <div className="mt-5 p-3 rounded-lg bg-emerald-900/30 border border-emerald-800/40">
              <div className="flex items-start gap-2 text-emerald-300 text-xs">
                <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  This portal is for property agencies and agents. Manage properties on behalf of landlords,
                  collect rent, and track commissions.
                </span>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-emerald-400/60 space-y-1">
              <p>Are you a property manager?{' '}
                <Link to="/landlord" className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline">
                  Manager login
                </Link>
              </p>
              <p>Are you a landlord?{' '}
                <Link to="/landlord/login" className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline">
                  Landlord portal
                </Link>
              </p>
              <p>Platform admin?{' '}
                <Link to="/webhost/login" className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline">
                  Webhost login
                </Link>
              </p>
            </div>
            <div className="flex justify-center gap-4 mt-3">
              <Link to="/legal?tab=privacy" className="text-xs text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Link>
              <span className="text-xs text-muted-foreground">·</span>
              <Link to="/legal?tab=terms" className="text-xs text-muted-foreground hover:text-foreground">
                Terms of Service
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgencyAuth;
