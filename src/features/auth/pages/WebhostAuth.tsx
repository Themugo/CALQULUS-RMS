import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';
import { Globe, Shield } from 'lucide-react';
import { ensureSignedInRole, sanitizeAuthError } from '@/features/auth/lib/authFlow';

const isRecommendedWebhostHost = () => {
  const host = window.location.hostname;
  return host.startsWith('admin.') || host.endsWith('.rentflow.ink') || host === 'localhost' || host === '127.0.0.1';
};

const WebhostAuth = () => {
  const navigate = useNavigate();
  const { user, signIn, loading, userRole } = useAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user && !loading) {
      if (userRole?.role === 'webhost') {
        navigate('/webhost');
      } else if (userRole?.role === 'manager') {
        navigate('/');
      } else if (userRole?.role === 'tenant') {
        navigate('/portal');
      }
    }
  }, [user, loading, userRole, navigate]);

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

    const roleCheck = await ensureSignedInRole(['webhost']);
    if (!roleCheck.ok) {
      const roles = roleCheck.roles;
      if (roles.includes('tenant')) { navigate('/portal'); return; }
      if (roles.includes('manager')) { navigate('/'); return; }
      if (roles.includes('landlord')) { navigate('/landlord/dashboard'); return; }
      toast({
        title: 'No active role',
        description: roleCheck.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }
    navigate('/webhost');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-purple-950 px-4">
      <Card className="w-full max-w-md border-purple-800/50 bg-slate-900/80 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Globe className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">Webhost Portal</CardTitle>
          <CardDescription className="text-purple-300">
            Super-admin access for platform management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-purple-200">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@webhost.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-800/50 border-purple-700/50 text-white placeholder:text-purple-400/50 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-purple-200">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-800/50 border-purple-700/50 text-white placeholder:text-purple-400/50 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/25" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In to Webhost Portal'}
            </Button>
          </form>
          
          <div className="mt-6 p-3 rounded-lg bg-purple-900/30 border border-purple-800/50">
            <div className="flex items-center gap-2 text-purple-300 text-sm">
              <Shield className="h-4 w-4" />
              <span>This portal is for authorized administrators only</span>
            </div>
          </div>

          <div className="mt-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
            <p className="text-xs text-slate-500 text-center">
              First time? Run the <code className="text-purple-400 bg-purple-900/30 px-1 rounded">bootstrap-webhost</code> edge function to create the admin account.
              See <a href="https://github.com/Themugo/rentflowcom-42618f64#bootstrap" className="text-purple-400 hover:underline">setup docs</a>.
            </p>
          </div>
          {!isRecommendedWebhostHost() && (
            <div className="mt-3 p-3 rounded-lg bg-amber-900/30 border border-amber-700/40">
              <p className="text-xs text-amber-300 text-center">
                Tip: for production, use an <code className="px-1 rounded bg-amber-900/40">admin.</code> subdomain for webhost access.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhostAuth;
