import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Clock, LogOut, Mail, RefreshCw, Building2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import rentflowLogo from "@/assets/rentflow-logo.png";

interface ManagerProfileData {
  approval_status?: string;
  status?: string;
  rejection_reason?: string;
  suspension_reason?: string;
}

const PendingApproval = () => {
  const { signOut, user, userRole } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRejected = userRole?.approval_status === 'rejected';
  const isSuspended = userRole?.approval_status === 'suspended';
  const isTerminal = isRejected || isSuspended;

  // Auto-poll every 30 seconds to detect approval
  useEffect(() => {
    if (isTerminal) return;

    const checkApproval = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('approval_status')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (data?.approval_status === 'approved') {
        navigate('/');
      }
    };

    setCountdown(30);
    cdRef.current = setInterval(() => {
      setCountdown(p => {
        if (p <= 1) { checkApproval(); return 30; }
        return p - 1;
      });
    }, 1000);

    pollRef.current = setInterval(checkApproval, 30_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (cdRef.current) clearInterval(cdRef.current);
    };
  }, [isTerminal, user?.id, user, navigate]);

  // Fetch manager profile to check if suspended (vs simply rejected)
  const { data: managerProfile } = useQuery({
    queryKey: ['pending-manager-profile', user?.id],
    queryFn: async (): Promise<ManagerProfileData | null> => {
      const { data } = await supabase.from('manager_profiles')
        .select('status, rejection_reason, suspension_reason')
        .eq('manager_user_id', user!.id).maybeSingle();
      return data as ManagerProfileData | null;
    },
    enabled: !!user?.id && isRejected,
  });

  const isNonPaymentSuspension = isSuspended || (isRejected && managerProfile?.status === 'suspended_nonpayment');
  const suspensionReason = managerProfile?.suspension_reason;
  const rejectionReason = managerProfile?.rejection_reason;

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  // Show the countdown + auto-refresh info only when pending (not rejected/suspended)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img src={rentflowLogo} alt="RentFlow" className="h-12" />
          </div>
          <div className="flex items-center justify-center gap-2 text-amber-500 mb-2">
            <Building2 className="h-5 w-5" />
            <span className="text-sm font-medium">Property Manager Portal</span>
          </div>
        </div>

        <Card className="w-full border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isSuspended ? 'bg-orange-500/10' : isRejected ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                <Clock className={`h-8 w-8 ${isSuspended ? 'text-orange-500' : isRejected ? 'text-red-500' : 'text-amber-500'}`} />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              {isSuspended ? (isNonPaymentSuspension ? 'Account Suspended — Payment Required' : 'Account Suspended') : isRejected ? 'Account Not Approved' : 'Account Pending Approval'}
            </CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              {isSuspended
                ? 'Your account has been temporarily suspended by the platform administrator'
                : isRejected
                ? 'Your account application was not approved by the platform administrator'
                : 'Your property manager account is awaiting approval'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              {isSuspended ? (
                <div>
                  {isNonPaymentSuspension ? (
                    <>
                      <p className="text-slate-300 text-sm mb-3">
                        Your account has been suspended due to an outstanding platform invoice.
                        Pay the outstanding balance to restore access immediately.
                      </p>
                      {suspensionReason && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-left mb-3">
                          <p className="text-xs text-red-400 font-medium mb-1">Details:</p>
                          <p className="text-sm text-red-200">{suspensionReason}</p>
                        </div>
                      )}
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-left">
                        <p className="text-xs text-amber-400 font-semibold mb-2 uppercase tracking-wide">How to restore access</p>
                        <ol className="text-sm text-amber-200 space-y-1">
                          <li>1. Pay your outstanding invoice via the Platform Billing page</li>
                          <li>2. Once payment is confirmed, your account will be reinstated automatically</li>
                          <li>3. If payment was already made, contact the platform administrator</li>
                        </ol>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-300 text-sm mb-3">
                        Access to your account has been suspended. Please contact the platform administrator to resolve this.
                      </p>
                      {suspensionReason && (
                        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-left">
                          <p className="text-xs text-orange-400 font-medium mb-1">Reason given:</p>
                          <p className="text-sm text-orange-200">{suspensionReason}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : isRejected ? (
                <div>
                  <p className="text-slate-300 text-sm mb-3">
                    Unfortunately, your account application was not approved.
                    If you believe this was a mistake, please contact our support team for assistance.
                  </p>
                  {rejectionReason && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-left">
                      <p className="text-xs text-red-400 font-medium mb-1">Reason given:</p>
                      <p className="text-sm text-red-200">{rejectionReason}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-300 text-sm mb-4">
                  Thank you for registering as a property manager!
                  Your account is currently under review by our team.
                  You will receive access once your account has been approved.
                </p>
              )}
              
              {user?.email && (
                <div className="flex items-center justify-center gap-2 text-slate-400 text-sm bg-slate-700/50 py-3 px-4 rounded-lg border border-slate-600 mb-4">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </div>
              )}

              <p className="text-slate-500 text-xs">
                {isRejected 
                  ? 'Contact support@rentflow.com for more information.'
                  : 'This usually takes 24-48 hours. If you have any questions, please contact support.'
                }
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {!isRejected && (
                <>
                  <div className="text-center text-xs text-slate-500">
                    Auto-checking in {countdown}s…
                  </div>
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Check Now
                  </Button>
                </>
              )}
              
              <Button
                onClick={signOut}
                variant="ghost"
                className="w-full text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PendingApproval;
