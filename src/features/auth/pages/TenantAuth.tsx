import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';
import { CheckCircle, XCircle, Mail, LogIn } from 'lucide-react';
import { signupSchema, formatValidationErrors } from '@/shared/lib/validations';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/shared/lib/errorLogger';
import rentflowLogo from '@/assets/rentflow-logo.png';
import { useIsMobile } from '@/shared/hooks/use-mobile';

interface Invitation {
  id: string;
  email: string;
  tenant_name: string;
  phone: string | null;
  property_id: string;
  property_name: string;
  unit: string | null;
  status: string;
  expires_at: string;
  invited_by: string;
  monthly_rent?: number | null;
  house_deposit?: number | null;
  water_deposit?: number | null;
}

interface LandlordContact {
  full_name: string | null;
  email: string;
  phone: string | null;
}

const TenantAuth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation') || searchParams.get('token');
  const isMobile = useIsMobile();
  
  const { user, loading, userRole } = useAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isSelfRegistration, setIsSelfRegistration] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  // Invitation state
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [landlordContact, setLandlordContact] = useState<LandlordContact | null>(null);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(!!invitationToken);

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (email: string) => {
    setSignupEmail(email);
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  // Load invitation if token is present - REQUIRED for signup unless self-registration
  useEffect(() => {
    const loadInvitation = async () => {
      if (!invitationToken) {
        setIsLoadingInvitation(false);
        return;
      }
      
      setIsLoadingInvitation(true);
      
      // Use secure RPC function instead of direct table query
      const { data, error } = await supabase
        .rpc('validate_invitation_token', { token_value: invitationToken });
      
      if (error || !data || data.length === 0) {
        toast({
          title: 'Invalid Invitation',
          description: 'This invitation link is invalid or has expired. Please contact your property manager for a new invitation.',
          variant: 'destructive',
        });
        setIsLoadingInvitation(false);
        return;
      }
      
      const invitationData = data[0];
      setInvitation(invitationData);
      setSignupEmail(invitationData.email);
      setSignupFullName(invitationData.tenant_name);
      if (invitationData.phone) setSignupPhone(invitationData.phone);
      
      // Fetch landlord contact details
      if (invitationData.invited_by) {
        const { data: landlordData } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', invitationData.invited_by)
          .single();
        
        if (landlordData) {
          setLandlordContact(landlordData);
        }
      }
      
      setIsLoadingInvitation(false);
    };
    
    loadInvitation();
  }, [invitationToken, toast]);

  useEffect(() => {
    if (user && !loading && userRole) {
      // Only redirect tenants to portal - this is a tenant-only signup page
      if (userRole.role === 'tenant') {
        navigate('/portal');
      }
      // Don't redirect other roles - they shouldn't be signing up here
    }
  }, [user, loading, userRole, navigate]);

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true;
    const trimmed = phone.trim();
    const kenyanPattern = /^(07\d{8}|\+254\d{9})$/;
    return kenyanPattern.test(trimmed);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate input with schema
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

    // Validate phone if provided
    if (signupPhone && !validatePhone(signupPhone)) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Phone must start with 07 (e.g., 0712345678) or +254 (e.g., +254712345678)',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/portal`;

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: signupFullName,
          },
        },
      });

      if (authError) {
        toast({
          title: 'Signup failed',
          description: authError.message.includes('already registered')
            ? 'This email is already registered. Please login instead.'
            : authError.message,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      if (authData.user) {
        // Route through create-tenant-account edge function
        // For invited tenants: property/unit info from invitation
        // For self-registration (orphaned): no property/unit, accounting mode

        const { data: createResult, error: createError } = await supabase.functions.invoke(
          'create-tenant-account',
          {
            body: {
              userId:       authData.user.id,
              name:         signupFullName,
              email:        signupEmail,
              phone:        signupPhone || null,
              property:     isSelfRegistration ? null : (invitation?.property_name || null),
              property_id:  isSelfRegistration ? null : (invitation?.property_id   || null),
              unit:         isSelfRegistration ? null : (invitation?.unit           || null),
              manager_id:   isSelfRegistration ? null : (invitation?.invited_by     || null),
              monthlyRent:  isSelfRegistration ? null : (invitation?.monthly_rent  || null),
              depositAmount: isSelfRegistration ? null : (invitation?.house_deposit
                ? (invitation.house_deposit + (invitation.water_deposit || 0))
                : null),
              sendSms:      false,
              sendWhatsapp: false,
              isExistingUser: true, // user already created via supabase.auth.signUp
              isSelfRegistration: isSelfRegistration, // flag for orphaned tenant accounting mode
            },
          }
        );

        if (createError || createResult?.error) {
          const msg = createResult?.error || createError?.message || 'Failed to create tenant profile';
          logError('TenantAuth.handleSignup.createTenant', msg);
          toast({
            title: 'Signup failed',
            description: 'Failed to create tenant profile. Please try again.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }

        // Mark invitation as used if present
        if (invitation && !isSelfRegistration) {
          await supabase
            .from('tenant_invitations')
            .update({ status: 'used', used_at: new Date().toISOString() })
            .eq('id', invitation.id);
        }

        // Notify manager that tenant has signed up (if from invitation)
        if (invitation?.invited_by && !isSelfRegistration) {
          supabase.functions.invoke('notify-manager-tenant-signup', {
            body: {
              managerId: invitation.invited_by,
              tenantName: signupFullName,
              tenantEmail: signupEmail,
              propertyName: invitation.property_name,
              unit: invitation.unit || undefined,
            },
          }).catch((err) => logError('TenantAuth.notifyManager', err));
        }

        // Set registered email for verification screen
        setRegisteredEmail(signupEmail);

        // Success! Show toast - navigation will be handled by useEffect watching userRole
        toast({
          title: isSelfRegistration ? 'Account Created for Accounting' : 'Welcome to RentFlow!',
          description: isSelfRegistration 
            ? 'Your account has been created. You can manage your rental records for accounting purposes.'
            : 'Your account has been created successfully. Redirecting...',
        });

        // Force a session refresh to trigger role fetch
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      logError('TenantAuth.handleSignup', error);
      toast({
        title: 'Signup failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  // Password strength indicator
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/20 via-background to-primary/10 px-4">
        <Card className="w-full max-w-md border-accent/20 bg-card/95 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/25">
                <Mail className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Check Your Email</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              We've sent a verification link to
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-foreground font-medium text-lg bg-muted py-3 px-4 rounded-lg border border-border">
              {registeredEmail}
            </p>
            <div className="space-y-3 text-muted-foreground text-sm">
              <p>Click the link in the email to verify your account and complete registration.</p>
              <p>
                Didn't receive the email? Check your spam folder or{' '}
                <button 
                  onClick={() => setShowVerificationMessage(false)}
                  className="text-accent hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-muted-foreground text-sm">
                Already verified?{' '}
                <Link to="/tenant/login" className="text-accent hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no invitation token, show registration options
  if (!invitationToken && !isLoadingInvitation && !isSelfRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/20 via-background to-primary/10 px-4">
        <Card className="w-full max-w-md border-accent/20 bg-card/95 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-warning flex items-center justify-center shadow-lg shadow-warning/25">
                <Mail className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Tenant Registration</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Choose your registration type
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-muted/50">
                <h3 className="font-semibold text-foreground mb-2">Invited by Property Manager</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you have an invitation link from your property manager or landlord, use it to register with your property and unit details.
                </p>
                <p className="text-xs text-muted-foreground">
                  Contact your property manager to request an invitation link.
                </p>
              </div>
              
              <div className="p-4 rounded-lg border border-border bg-muted/50">
                <h3 className="font-semibold text-foreground mb-2">Self-Registration (Accounting Mode)</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Register independently to manage your rental records for accounting and budgeting purposes. No property manager approval required.
                </p>
                <Button 
                  onClick={() => setIsSelfRegistration(true)}
                  className="w-full"
                >
                  Register for Accounting
                </Button>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-muted-foreground text-sm mb-3">Already have an account?</p>
              <Link to="/tenant/login">
                <Button variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent/10">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If self-registration mode, show self-registration form
  if (isSelfRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/20 via-background to-primary/10 px-4">
        <Card className="w-full max-w-md border-accent/20 bg-card/95 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={rentflowLogo} alt="RentFlow" className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Self-Registration</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Register to manage your rental records for accounting purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={signupFullName}
                  onChange={(e) => setSignupFullName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                />
                {emailError && <p className="text-sm text-destructive">{emailError}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+254 700 000000"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Format: 0712345678 or +254712345678</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                />
                <div className="space-y-1">
                  {Object.entries(passwordStrength).map(([key, valid]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      {valid ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}
                      <span className={valid ? 'text-emerald-600' : 'text-muted-foreground'}>
                        {key === 'length' && 'At least 8 characters'}
                        {key === 'uppercase' && 'One uppercase letter'}
                        {key === 'lowercase' && 'One lowercase letter'}
                        {key === 'number' && 'One number'}
                        {key === 'special' && 'One special character'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
            
            <div className="mt-4 pt-4 border-t border-border text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSelfRegistration(false)}
                className="text-sm"
              >
                ← Back to registration options
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/20 via-background to-primary/10 px-4 py-4 ${isMobile ? 'items-start pt-8' : ''}`}>
      <Card className="w-full max-w-md border-accent/20 bg-card/95 backdrop-blur-sm shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={rentflowLogo} 
              alt="RentFlow.ink" 
              className="h-14 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Create Tenant Account</CardTitle>
          <CardDescription className="text-muted-foreground">
            {invitation ? `Welcome, ${invitation.tenant_name}! Complete your registration.` : 'Sign up to access your rental portal'}
          </CardDescription>
          {invitation && (
            <div className="mt-3 p-3 bg-accent/10 rounded-lg border border-accent/20 space-y-2">
              <p className="text-xs text-accent font-medium">
                Property: {invitation.property_name}{invitation.unit ? ` - Unit ${invitation.unit}` : ''}
              </p>
              {landlordContact && (
                <div className="pt-2 border-t border-accent/20">
                  <p className="text-xs text-muted-foreground mb-1">Your Landlord/Manager:</p>
                  <p className="text-sm font-medium text-foreground">{landlordContact.full_name || 'Property Manager'}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {landlordContact.email && (
                      <a 
                        href={`mailto:${landlordContact.email}`}
                        className="text-xs text-accent hover:underline flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        {landlordContact.email}
                      </a>
                    )}
                    {landlordContact.phone && (
                      <a 
                        href={`tel:${landlordContact.phone}`}
                        className="text-xs text-accent hover:underline flex items-center gap-1"
                      >
                        📞 {landlordContact.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full Name</Label>
              <Input
                id="signup-name"
                type="text"
                placeholder="John Doe"
                value={signupFullName}
                onChange={(e) => setSignupFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={signupEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                required
                className={emailError ? 'border-destructive focus:border-destructive focus:ring-destructive' : ''}
              />
              {emailError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {emailError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-phone">Phone (Optional)</Label>
              <Input
                id="signup-phone"
                type="tel"
                placeholder="0712345678 or +254712345678"
                value={signupPhone}
                onChange={(e) => setSignupPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Format: 07XXXXXXXX or +254XXXXXXXXX</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="••••••••"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
                minLength={8}
              />
              {signupPassword && (
                <div className="text-xs space-y-1 mt-2 p-2 bg-muted rounded border border-border">
                  <p className="font-medium text-muted-foreground">Password requirements:</p>
                  <div className="grid grid-cols-2 gap-1">
                    <div className={`flex items-center gap-1 ${passwordStrength.length ? 'text-success' : 'text-muted-foreground'}`}>
                      {passwordStrength.length ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      8+ characters
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.uppercase ? 'text-success' : 'text-muted-foreground'}`}>
                      {passwordStrength.uppercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Uppercase
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.lowercase ? 'text-success' : 'text-muted-foreground'}`}>
                      {passwordStrength.lowercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Lowercase
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.number ? 'text-success' : 'text-muted-foreground'}`}>
                      {passwordStrength.number ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Number
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.special ? 'text-success' : 'text-muted-foreground'}`}>
                      {passwordStrength.special ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Special char
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full btn-brand" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="border-t border-border pt-6">
          <div className="text-center w-full">
            <p className="text-muted-foreground text-sm">
              Already have an account?{' '}
              <Link to="/tenant/login" className="text-accent hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TenantAuth;