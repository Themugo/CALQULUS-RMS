import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useToast } from '@/shared/hooks/use-toast';
import { CheckCircle, XCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import { signupSchema, formatValidationErrors } from '@/shared/lib/validations';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { BiometricLoginButton } from '@/features/auth/components/BiometricLoginButton';
import { useBiometricAuth } from '@/shared/hooks/useBiometricAuth';
import { supabase } from '@/integrations/supabase/client';
import rentflowLogo from '@/assets/rentflow-logo.png';
import { ensureSignedInRole, sanitizeAuthError } from '@/features/auth/lib/authFlow';

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();
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
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [isBiometricLoggingIn, setIsBiometricLoggingIn] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupEmailError, setSignupEmailError] = useState('');

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleBiometricLogin = async () => {
    setIsBiometricLoggingIn(true);
    try {
      const credentials = await performBiometricLogin();
      if (credentials) {
        const { error } = await signIn(credentials.email, credentials.password);
        if (error) {
          toast({ title: 'Login failed', description: 'Biometric auth succeeded but login failed. Please try again.', variant: 'destructive' });
        } else {
          const roleCheck = await ensureSignedInRole(['manager', 'submanager']);
          if (!roleCheck.ok) {
            toast({ title: 'Wrong portal', description: roleCheck.message, variant: 'destructive' });
            return;
          }
          toast({ title: 'Welcome back!', description: 'Logged in with biometrics.' });
          navigate('/');
        }
      } else {
        toast({ title: 'Biometric login failed', description: 'Please try again or use email and password.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Biometric error', description: 'An error occurred during biometric authentication.', variant: 'destructive' });
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
        description: sanitizeAuthError(error.message),
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    const roleCheck = await ensureSignedInRole(['manager', 'submanager']);
    if (!roleCheck.ok) {
      const roles = roleCheck.roles;
      if (roles.includes('tenant')) { navigate('/portal'); return; }
      if (roles.includes('webhost')) { navigate('/webhost'); return; }
      if (roles.includes('landlord')) { navigate('/landlord/dashboard'); return; }
      toast({
        title: 'No active role',
        description: roleCheck.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    if (enableBiometric && biometricAvailable) {
      await saveCredentials(loginEmail, loginPassword);
    }
    toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
    navigate('/');
    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const validationResult = signupSchema.safeParse({ email: signupEmail, password: signupPassword, fullName: signupFullName });
    if (!validationResult.success) {
      toast({ title: 'Validation Error', description: formatValidationErrors(validationResult.error), variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    const { error } = await signUp(signupEmail, signupPassword, signupFullName, 'manager');
    if (error) {
      toast({
        title: 'Signup failed',
        description: sanitizeAuthError(error.message),
        variant: 'destructive',
      });
    } else {
      supabase.functions.invoke('send-welcome-email', { body: { email: signupEmail, fullName: signupFullName, userType: 'manager' } })
        .catch(() => {});
      toast({ title: 'Account created!', description: 'Check your email for onboarding instructions.' });
      navigate('/');
    }
    setIsSubmitting(false);
  };

  const getPasswordStrength = (password: string) => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  });

  const passwordStrength = getPasswordStrength(signupPassword);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center auth-gradient">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center auth-gradient relative overflow-hidden px-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 noise-overlay" />
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

      <Card className="w-full max-w-md card-shadow border-white/10 relative animate-scale-in bg-white/95 backdrop-blur-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img src={rentflowLogo} alt="RentFlow.ink" className="h-14 w-auto" />
            </div>
          </div>
          <CardTitle className="text-2xl font-heading">Welcome to RentFlow</CardTitle>
          <CardDescription className="text-muted-foreground">
            Smart rental management made simple
          </CardDescription>
        </CardHeader>
        <CardContent>
          {biometricAvailable && hasStoredCredentials && !biometricLoading && (
            <div className="mb-6">
              <BiometricLoginButton biometryType={biometryType} onPress={handleBiometricLogin} isLoading={isBiometricLoggingIn} />
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Get Started</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-2">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <ForgotPasswordDialog />
                  </div>
                  <div className="relative">
                    <Input id="login-password" type={showLoginPassword ? "text" : "password"} placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="h-11 pr-10" />
                    <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {biometricAvailable && !hasStoredCredentials && (
                  <div className="flex items-center space-x-2">
                    <Checkbox id="enable-biometric" checked={enableBiometric} onCheckedChange={(c) => setEnableBiometric(c as boolean)} />
                    <label htmlFor="enable-biometric" className="text-sm font-medium leading-none cursor-pointer">
                      Enable {biometryType === 'faceId' ? 'Face ID' : 'fingerprint'} login
                    </label>
                  </div>
                )}
                <Button type="submit" className="w-full btn-brand h-11" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-2">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input id="signup-name" type="text" placeholder="John Doe" value={signupFullName} onChange={(e) => setSignupFullName(e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="you@example.com" value={signupEmail} onChange={(e) => handleSignupEmailChange(e.target.value)} required className={`h-11 ${signupEmailError ? 'border-destructive' : ''}`} />
                  {signupEmailError && (
                    <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" />{signupEmailError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input id="signup-password" type={showSignupPassword ? "text" : "password"} placeholder="••••••••" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={8} className="h-11 pr-10" />
                    <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupPassword && (
                    <div className="grid grid-cols-2 gap-1 text-xs p-3 bg-muted/50 rounded-lg">
                      {[
                        { key: 'length', label: '8+ characters' },
                        { key: 'uppercase', label: 'Uppercase' },
                        { key: 'lowercase', label: 'Lowercase' },
                        { key: 'number', label: 'Number' },
                        { key: 'special', label: 'Special char' },
                      ].map(({ key, label }) => (
                        <div key={key} className={`flex items-center gap-1.5 ${passwordStrength[key as keyof typeof passwordStrength] ? 'text-success' : 'text-muted-foreground'}`}>
                          {passwordStrength[key as keyof typeof passwordStrength]
                            ? <CheckCircle className="h-3 w-3" />
                            : <XCircle className="h-3 w-3" />}
                          {label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full btn-brand h-11" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 space-y-2 text-center">
            <p className="text-sm text-muted-foreground">
              Are you a tenant?{' '}
              <Link to="/tenant/signup" className="text-accent hover:underline font-medium">Register here</Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Are you a landlord?{' '}
              <Link to="/landlord" className="text-accent hover:underline font-medium">Sign in here</Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Platform admin?{' '}
              <Link to="/webhost/login" className="text-accent hover:underline font-medium">Webhost login</Link>
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
            <Link to="/legal?tab=privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <span className="text-muted-foreground/30">·</span>
            <Link to="/legal?tab=terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" /> RentFlow.ink</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
