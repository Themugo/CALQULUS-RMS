import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useToast } from '@/shared/hooks/use-toast';
import { CheckCircle, XCircle, Mail, Eye, EyeOff, User, Building, Home, Shield, Briefcase } from 'lucide-react';
import { signupSchema, formatValidationErrors } from '@/shared/lib/validations';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { BiometricLoginButton } from '@/features/auth/components/BiometricLoginButton';
import { useBiometricAuth } from '@/shared/hooks/useBiometricAuth';
import { supabase } from '@/integrations/supabase/client';
import calqulusLogo from '@/assets/calqulusrms-logo.png';
import { ensureSignedInRole, sanitizeAuthError } from '@/features/auth/lib/authFlow';

interface DemoAccount {
  role: string;
  label: string;
  email: string;
  password: string;
  portal: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
}

const LandlordAuth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading, userRole } = useAuth();
  const { toast } = useToast();
  const {
    isAvailable: biometricAvailable,
    biometryType,
    hasStoredCredentials,
    isLoading: biometricLoading,
    performBiometricLogin,
    saveCredentials,
  } = useBiometricAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [isBiometricLoggingIn, setIsBiometricLoggingIn] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupEmailError, setSignupEmailError] = useState('');
  const [demoLoggingIn, setDemoLoggingIn] = useState<string | null>(null);
  const [demoSeeding, setDemoSeeding] = useState(false);
  const demoEnabled = import.meta.env.VITE_ENABLE_PUBLIC_DEMO === 'true';
  const demoSeedEnabled = import.meta.env.VITE_ENABLE_DEMO_SEED === 'true';
  const demoSeedSecret = import.meta.env.VITE_DEMO_SEED_SECRET || '';

  const demoAccounts: DemoAccount[] = demoEnabled ? [
    { role: 'manager', label: 'James Kariuki', email: 'demo.manager@calqulusrms.com', password: 'Demo@2026', portal: '/', badge: 'MANAGER', icon: <Building className="h-4 w-4" />, description: '3 properties · 5 tenants · Pro tier' },
    { role: 'tenant-linked', label: 'Grace Wanjiku', email: 'demo.tenant1@calqulusrms.com', password: 'Demo@2026', portal: '/portal', badge: 'TENANT', icon: <User className="h-4 w-4" />, description: 'Flat A3 · KES 8,500/mo · overdue' },
    { role: 'tenant-linked', label: 'Brian Otieno', email: 'demo.tenant2@calqulusrms.com', password: 'Demo@2026', portal: '/portal', badge: 'TENANT', icon: <User className="h-4 w-4" />, description: 'Bungalow B1 · KES 35,000/mo · paid' },
    { role: 'tenant-orphan', label: 'Amina Hassan', email: 'demo.tenant3@calqulusrms.com', password: 'Demo@2026', portal: '/portal', badge: 'ORPHAN', icon: <Home className="h-4 w-4" />, description: 'Ngara Apts · KES 11,000/mo · unlinked' },
    { role: 'landlord', label: 'Peter Mwangi', email: 'demo.landlord@calqulusrms.com', password: 'Demo@2026', portal: '/landlord/dashboard', badge: 'LANDLORD', icon: <Briefcase className="h-4 w-4" />, description: '2 properties · KES 108K net rent' },
    { role: 'agent', label: 'Fatuma Abubakar', email: 'demo.agent@calqulusrms.com', password: 'Demo@2026', portal: '/', badge: 'AGENT', icon: <Shield className="h-4 w-4" />, description: 'Submanager · tenants + maintenance' },
  ] : [];

  const loginAs = async (account: DemoAccount) => {
    setDemoLoggingIn(account.email);
    try {
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({ email: account.email, password: account.password });
      if (error) throw error;
      navigate(account.portal);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Demo login failed', description: sanitizeAuthError(message), variant: 'destructive' });
    } finally {
      setDemoLoggingIn(null);
    }
  };

  const reseedDemoAccounts = async () => {
    if (!demoSeedEnabled) {
      toast({
        title: 'Demo seed disabled',
        description: 'Enable VITE_ENABLE_DEMO_SEED to reseed demo accounts.',
        variant: 'destructive',
      });
      return;
    }
    if (!demoSeedSecret) {
      toast({
        title: 'Missing demo seed secret',
        description: 'Set VITE_DEMO_SEED_SECRET to allow demo account reset.',
        variant: 'destructive',
      });
      return;
    }

    setDemoSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-demo-data', {
        body: { action: 'reset' },
        headers: { 'X-Demo-Secret': demoSeedSecret },
      });
      if (error) throw error;
      toast({
        title: 'Demo accounts reset',
        description: Array.isArray(data?.results)
          ? `Seeded ${data.results.length} demo setup steps.`
          : 'Demo users and demo portfolio refreshed.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Failed to reset demo accounts',
        description: sanitizeAuthError(message),
        variant: 'destructive',
      });
    } finally {
      setDemoSeeding(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignupEmailChange = (email: string) => {
    setSignupEmail(email);
    if (email && !validateEmail(email)) {
      setSignupEmailError('Please enter a valid email address');
    } else {
      setSignupEmailError('');
    }
  };

  useEffect(() => {
    if (user && !loading && userRole) {
      if (userRole.role === 'landlord') {
        navigate('/landlord/dashboard');
      } else if (userRole.role === 'tenant') {
        navigate('/portal');
      } else if (userRole.role === 'webhost') {
        navigate('/webhost');
      } else if (userRole.role === 'submanager') {
        navigate('/');
      } else {
        navigate('/properties');
      }
    }
  }, [user, loading, userRole, navigate]);

  const handleBiometricLogin = async () => {
    setIsBiometricLoggingIn(true);
    try {
      const credentials = await performBiometricLogin();
      if (credentials) {
        const { error } = await signIn(credentials.email, credentials.password);
        if (error) {
          toast({
            title: 'Login failed',
            description: 'Biometric authentication succeeded but login failed.',
            variant: 'destructive',
          });
        } else {
          const roleCheck = await ensureSignedInRole(['manager', 'submanager', 'landlord']);
          if (!roleCheck.ok) {
            toast({
              title: 'Wrong portal',
              description: roleCheck.message,
              variant: 'destructive',
            });
            return;
          }
          toast({
            title: 'Welcome back!',
            description: 'You have been logged in with biometrics.',
          });
        }
      } else {
        toast({
          title: 'Biometric login failed',
          description: 'Please try again or use email and password.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsBiometricLoggingIn(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast({
        title: 'Login failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.'
          : error.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    const roleCheck = await ensureSignedInRole(['manager', 'submanager', 'landlord']);
    if (!roleCheck.ok) {
      const roles = roleCheck.roles;
      if (roles.includes('tenant')) { navigate('/portal'); }
      else if (roles.includes('webhost')) { navigate('/webhost'); }
      else {
        toast({
          title: 'No active role',
          description: roleCheck.message,
          variant: 'destructive',
        });
      }
      setIsSubmitting(false);
      return;
    }

    if (enableBiometric && biometricAvailable) {
      await saveCredentials(loginEmail, loginPassword);
      toast({
        title: 'Biometric login enabled!',
        description: 'You can now use biometrics to log in.',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have been logged in successfully.',
      });
    }

    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validationResult = signupSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      fullName: signupFullName,
    });

    if (!validationResult.success) {
      toast({
        title: 'Validation Error',
        description: formatValidationErrors(validationResult.error),
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    // Landlords sign up with the landlord role — they go to /landlord/dashboard
    // pending webhost approval before they can see properties
    const { error } = await signUp(
      signupEmail, 
      signupPassword, 
      signupFullName, 
      'landlord'
    );

    if (error) {
      toast({
        title: 'Signup failed',
        description: error.message.includes('already registered')
          ? 'This email is already registered. Please login instead.'
          : sanitizeAuthError(error.message),
        variant: 'destructive',
      });
    } else {
      // Show verification message
      setRegisteredEmail(signupEmail);
      setShowVerificationMessage(true);
      toast({
        title: 'Check your email!',
        description: 'We sent you a verification link to complete your registration.',
      });
    }

    setIsSubmitting(false);
  };

  const getPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
    return checks;
  };

  const passwordStrength = getPasswordStrength(signupPassword);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show verification confirmation screen
  if (showVerificationMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 px-4">
        <Card className="w-full max-w-md border-amber-200/50 bg-white/95 backdrop-blur-lg shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-lg shadow-amber-400/25">
                <Mail className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Check Your Email</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              We've sent a verification link to
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-foreground font-medium text-lg bg-amber-50 py-3 px-4 rounded-lg border border-amber-200">
              {registeredEmail}
            </p>
            <div className="space-y-3 text-muted-foreground text-sm">
              <p>Click the link in the email to verify your account and complete registration.</p>
              <p className="text-muted-foreground">
                Didn't receive the email? Check your spam folder or{' '}
                <button 
                  onClick={() => setShowVerificationMessage(false)}
                  className="text-amber-600 hover:text-amber-700"
                >
                  try again
                </button>
              </p>
            </div>
            <div className="pt-4 border-t border-amber-200">
              <p className="text-muted-foreground text-sm">
                Already verified?{' '}
                <button 
                  onClick={() => setShowVerificationMessage(false)}
                  className="text-amber-600 hover:text-amber-700"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 px-4 relative overflow-hidden">
      {/* Banner background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/calqulus-banner.jpg" 
          alt="CALQULUS RMS Banner" 
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/95 via-yellow-50/90 to-orange-50/85" />
      </div>
      <Card className="w-full max-w-md border-amber-200/50 bg-white/95 backdrop-blur-lg shadow-2xl relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-amber-100 to-yellow-100 rounded-xl p-4 shadow-lg border border-amber-200">
              <img 
                src={calqulusLogo} 
                alt="CALQULUS RMS" 
                className="h-12 w-auto"
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Landlord Portal</CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage your properties and tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Biometric Login Button */}
          {biometricAvailable && hasStoredCredentials && !biometricLoading && (
            <div className="mb-6">
              <BiometricLoginButton
                biometryType={biometryType}
                onPress={handleBiometricLogin}
                isLoading={isBiometricLoggingIn}
                className="border-amber-300 text-amber-600 hover:bg-amber-50"
              />
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-amber-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-amber-100/50 border border-amber-200">
              <TabsTrigger value="login" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-foreground/70">Login</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-foreground/70">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-foreground">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="landlord@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="bg-white border-amber-200 text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-foreground">Password</Label>
                    <ForgotPasswordDialog 
                      variant="landlord"
                      trigger={
                        <button type="button" className="text-amber-600 hover:text-amber-700 text-sm">
                          Forgot password?
                        </button>
                      }
                    />
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="bg-white border-amber-200 text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:ring-amber-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                {/* Biometric enable option */}
                {biometricAvailable && !hasStoredCredentials && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-biometric"
                      checked={enableBiometric}
                      onCheckedChange={(checked) => setEnableBiometric(checked as boolean)}
                      className="border-amber-300 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <label
                      htmlFor="enable-biometric"
                      className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Enable {biometryType === 'faceId' ? 'Face ID' : 'fingerprint'} login
                    </label>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-foreground">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    required
                    className="bg-white border-amber-200 text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-foreground">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="landlord@example.com"
                    value={signupEmail}
                    onChange={(e) => handleSignupEmailChange(e.target.value)}
                    required
                    className={`bg-white border-amber-200 text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:ring-amber-500 ${signupEmailError ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                  />
                  {signupEmailError && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      {signupEmailError}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-foreground">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={8}
                      className="bg-white border-amber-200 text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:ring-amber-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupPassword && (
                    <div className="text-xs space-y-1 mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                      <p className="font-medium text-foreground">Password requirements:</p>
                      <div className="grid grid-cols-2 gap-1">
                        <div className={`flex items-center gap-1 ${passwordStrength.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.length ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          8+ characters
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.uppercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Uppercase
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.lowercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Lowercase
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.number ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Number
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.special ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.special ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Special char
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 text-center space-y-2">
            <p className="text-muted-foreground text-sm">
              Are you a tenant?{' '}
              <a href="/tenant/login" className="text-amber-600 hover:text-amber-700">
                Login here
              </a>
            </p>
            <p className="text-muted-foreground text-sm">
              Platform admin?{' '}
              <a href="/webhost/login" className="text-amber-600 hover:text-amber-700">
                Webhost login
              </a>
            </p>
          </div>

          {/* Demo accounts */}
          {demoEnabled && (
          <div className="mt-6 pt-4 border-t border-amber-200">
            <div className="mb-2 flex items-center justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-amber-300 text-foreground hover:bg-amber-50"
                onClick={reseedDemoAccounts}
                disabled={demoSeeding}
              >
                {demoSeeding ? 'Resetting demo…' : 'Reset demo accounts'}
              </Button>
            </div>
            <details className="group" open>
              <summary className="text-[11px] tracking-widest uppercase text-muted-foreground hover:text-foreground cursor-pointer list-none flex items-center justify-between select-none py-1">
                <span className="flex items-center gap-2">
                  <span>Quick Demo Access</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{demoAccounts.length} accounts</span>
                </span>
                <svg className={`w-3 h-3 text-muted-foreground group-open:rotate-180 transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="mt-3 space-y-1.5">
                {demoAccounts.map(acc => (
                  <button
                    key={acc.email}
                    onClick={() => loginAs(acc)}
                    disabled={demoLoggingIn === acc.email}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-300 transition-all text-left disabled:opacity-50"
                  >
                    <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                      {acc.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground text-sm font-medium truncate">{acc.label}</span>
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">{acc.badge}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground truncate">{acc.description}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <code className="text-[9px] text-muted-foreground font-mono tracking-wide bg-amber-100 px-1.5 py-0.5 rounded">Demo@2026</code>
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                        {demoLoggingIn === acc.email ? 'signing in...' : '1-click login'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </details>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LandlordAuth;
