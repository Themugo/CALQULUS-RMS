import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/use-toast';

const WebhostAccountSecurity: React.FC = () => {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const updatePassword = async () => {
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirm('');
      toast({ title: 'Password updated', description: 'Your webhost password was changed successfully.' });
    } catch (err) {
      toast({ title: 'Failed to update password', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const sendResetEmail = async () => {
    setSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user?.email;
      if (!email) throw new Error('No active user email found.');
      const redirectTo = `${window.location.origin}/reset-password?portal=webhost`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      toast({ title: 'Reset email sent', description: 'Check your inbox for a secure password-reset link.' });
    } catch (err) {
      toast({ title: 'Failed to send reset email', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Account security</CardTitle>
        <CardDescription>
          Rotate your password, or send yourself a secure reset link for handover to client admins.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>New password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Confirm password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={updatePassword} disabled={saving}>
            {saving ? 'Updating…' : 'Update password'}
          </Button>
          <Button variant="outline" onClick={sendResetEmail} disabled={sending}>
            {sending ? 'Sending…' : 'Email reset link'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhostAccountSecurity;
