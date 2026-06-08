import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/use-toast';
import { Mail, CheckCircle } from 'lucide-react';

interface ForgotPasswordDialogProps {
  trigger?: React.ReactNode;
  variant?: 'default' | 'landlord' | 'tenant';
}

const ForgotPasswordDialog: React.FC<ForgotPasswordDialogProps> = ({ 
  trigger, 
  variant = 'default' 
}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const portal = variant === 'tenant' ? 'tenant' : variant === 'landlord' ? 'manager' : 'manager';
    const redirectUrl = `${window.location.origin}/reset-password?portal=${portal}`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setEmailSent(true);
      toast({
        title: 'Email sent!',
        description: 'Check your inbox for the password reset link.',
      });
    }

    setIsSubmitting(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setEmail('');
      setEmailSent(false);
    }, 300);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'landlord':
        return {
          iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
          inputClass: 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500',
          buttonClass: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white',
          textClass: 'text-slate-300',
          mutedClass: 'text-slate-400',
        };
      case 'tenant':
        return {
          iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
          inputClass: 'bg-slate-800/50 border-emerald-700/50 text-white placeholder:text-emerald-400/50 focus:border-emerald-500 focus:ring-emerald-500',
          buttonClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white',
          textClass: 'text-emerald-200',
          mutedClass: 'text-slate-400',
        };
      default:
        return {
          iconBg: 'bg-primary',
          inputClass: '',
          buttonClass: '',
          textClass: '',
          mutedClass: 'text-muted-foreground',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button type="button" className="text-primary hover:underline text-sm">
            Forgot password?
          </button>
        )}
      </DialogTrigger>
      <DialogContent className={variant !== 'default' ? 'bg-slate-800 border-slate-700' : ''}>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className={`h-12 w-12 rounded-xl ${styles.iconBg} flex items-center justify-center`}>
              {emailSent ? (
                <CheckCircle className="h-6 w-6 text-white" />
              ) : (
                <Mail className="h-6 w-6 text-white" />
              )}
            </div>
          </div>
          <DialogTitle className={variant !== 'default' ? 'text-white text-center' : 'text-center'}>
            {emailSent ? 'Check Your Email' : 'Reset Password'}
          </DialogTitle>
          <DialogDescription className={`text-center ${styles.mutedClass}`}>
            {emailSent 
              ? `We've sent a password reset link to ${email}`
              : "Enter your email address and we'll send you a link to reset your password."
            }
          </DialogDescription>
        </DialogHeader>
        
        {emailSent ? (
          <div className="space-y-4 py-4">
            <p className={`text-sm text-center ${styles.mutedClass}`}>
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setEmailSent(false)}
              >
                Try Again
              </Button>
              <Button 
                className={`flex-1 ${styles.buttonClass}`}
                onClick={handleClose}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className={styles.textClass}>Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.inputClass}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className={`flex-1 ${styles.buttonClass}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
