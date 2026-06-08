import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';
import { UserPlus, Link2 } from 'lucide-react';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { BiometricLoginButton } from '@/features/auth/components/BiometricLoginButton';
import { useBiometricAuth } from '@/shared/hooks/useBiometricAuth';
import rentflowLogo from '@/assets/rentflow-logo.png';
import { ensureSignedInRole, sanitizeAuthError } from '@/features/auth/lib/authFlow';

const TenantLogin = () => {
  const navigate = useNavigate();
  const { user, signIn, loading, userRole } = useAuth();
  const { toast } = useToast();
  const {
    isAvailable: biometricAvailable,
    biometryType,
    hasStoredCredentials,
    isLoading: biometricLoading,
    performBiometricLogin,
  } = useBiometricAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBiometricLoggingIn, setIsBiometricLoggingIn] = useState(false);

  useEffect(() => {
    if (user && !loading && userRole) {
      // Only redirect tenants to portal - other roles should use their own login pages
      if (userRole.role === 'tenant') {
        navigate('/portal');
      }
      // Don't redirect managers/webhosts from tenant login - they're on the wrong page
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
            title: 'Biometric login failed',
            description: sanitizeAuthError(error.message),
            variant: 'destructive',
          });
        } else {
          const roleCheck = await ensureSignedInRole(['tenant']);
          if (!roleCheck.ok) {
            const roles = roleCheck.roles;
            if (roles.includes('manager') || roles.includes('submanager')) {
              navigate('/');
            } else if (roles.includes('webhost')) {
              navigate('/webhost');
            } else if (roles.includes('landlord')) {
              navigate('/landlord/dashboard');
            } else {
              toast({
                title: 'No active role',
                description: roleCheck.message,
                variant: 'destructive',
              });
            }
            return;
          }
          toast({
            title: 'Welcome back!',
            description: 'You have been logged in successfully.',
          });
        }
      } else {
        toast({
          title: 'Biometric login cancelled',
          description: 'Please try again or use email login.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Biometric login failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsBiometricLoggingIn(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Login failed',
        description: sanitizeAuthError(error.message),
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    const roleCheck = await ensureSignedInRole(['tenant']);
    if (!roleCheck.ok) {
      const roles = roleCheck.roles;
      if (roles.includes('manager') || roles.includes('submanager')) {
        navigate('/');
      } else if (roles.includes('webhost')) {
        navigate('/webhost');
      } else if (roles.includes('landlord')) {
        navigate('/landlord/dashboard');
      } else {
        toast({
          title: 'No active role',
          description: roleCheck.message,
          variant: 'destructive',
        });
      }
      setIsSubmitting(false);
      return;
    }

    toast({
      title: 'Welcome back!',
      description: 'You have been logged in successfully.',
    });
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/20 via-background to-primary/10 px-4">
      <Card className="w-full max-w-md border-accent/20 bg-card/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={rentflowLogo} 
              alt="RentFlow.ink" 
              className="h-14 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Welcome Back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to access your tenant portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Biometric Login */}
          {biometricAvailable && hasStoredCredentials && !biometricLoading && (
            <BiometricLoginButton
              biometryType={biometryType}
              onPress={handleBiometricLogin}
              isLoading={isBiometricLoggingIn}
              className="border-accent/50 text-accent hover:bg-accent/10"
            />
          )}

          {biometricAvailable && hasStoredCredentials && !biometricLoading && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-accent/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-accent">Or continue with email</span>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <ForgotPasswordDialog 
                  variant="tenant"
                  trigger={
                    <button type="button" className="text-accent hover:text-accent/80 text-sm">
                      Forgot password?
                    </button>
                  }
                />
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full btn-brand" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 border-t border-border pt-6">
          <div className="text-center w-full space-y-3">
            <p className="text-muted-foreground text-sm">Don't have an account?</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link to="/tenant/signup" className="flex-1">
                <Button variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent/10">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register independently
                </Button>
              </Link>
              <Link to="/tenant/invitation" className="flex-1">
                <Button variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/10">
                  <Link2 className="h-4 w-4 mr-2" />
                  Accept manager invite
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Invited by your manager? Use "Accept manager invite". Otherwise register independently.
            </p>
          </div>
          <div className="text-center space-y-1">
            <Link to="/landlord" className="text-accent hover:text-accent/80 text-sm block">
              Property Manager? Sign in here →
            </Link>
          </div>
          <div className="flex justify-center gap-4 pt-1">
            <Link to="/legal?tab=privacy" className="text-xs text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
            <span className="text-xs text-muted-foreground">·</span>
            <Link to="/legal?tab=terms" className="text-xs text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TenantLogin;
