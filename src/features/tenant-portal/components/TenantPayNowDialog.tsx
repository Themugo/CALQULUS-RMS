/**
 * TenantPayNowDialog — Self-initiated M-Pesa STK push (single or combined bills).
 */
import { format } from "date-fns";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Smartphone, CheckCircle, XCircle, Loader2, Clock, RefreshCw, Shield, Layers } from 'lucide-react';

export interface PayableInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  balance_due?: number | null;
  due_date: string;
  status: string;
  description?: string | null;
}

interface TenantPayNowDialogProps {
  invoices: PayableInvoice[];
  tenantPhone: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess: () => void;
}

type PayStatus = 'idle' | 'initiating' | 'waiting' | 'success' | 'failed' | 'timeout';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

const balanceOf = (inv: PayableInvoice) => Number(inv.balance_due ?? inv.amount);

const TenantPayNowDialog: React.FC<TenantPayNowDialogProps> = ({
  invoices,
  tenantPhone,
  open,
  onOpenChange,
  onPaymentSuccess,
}) => {
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<PayStatus>('idle');
  const [mpesaReceipt, setMpesaReceipt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const amountDue = useMemo(
    () => invoices.reduce((sum, inv) => sum + balanceOf(inv), 0),
    [invoices],
  );
  const isCombined = invoices.length > 1;
  const primary = invoices[0];

  useEffect(() => {
    if (open) {
      setPhone(tenantPhone?.replace(/^\+/, '') || '');
      setStatus('idle');
      setMpesaReceipt(null);
      setErrorMsg('');
    }
  }, [open, tenantPhone]);

  useEffect(() => {
    if (!open) clearPolling();
    return () => clearPolling();
  }, [open]);

  const clearPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    pollRef.current = null;
    countdownRef.current = null;
  };

  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
    if (digits.startsWith('254') && digits.length === 12) return digits;
    if (digits.startsWith('7') && digits.length === 9) return '254' + digits;
    return digits;
  };

  const initiatePayment = async () => {
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length !== 12 || !normalizedPhone.startsWith('254')) {
      toast({
        title: 'Invalid phone number',
        description: 'Enter a valid Kenyan M-Pesa number, e.g. 0712 345 678',
        variant: 'destructive',
      });
      return;
    }

    setStatus('initiating');
    setErrorMsg('');

    try {
      const body: Record<string, unknown> = {
        phoneNumber: normalizedPhone,
        amount: amountDue,
        paymentType: 'paybill',
      };
      if (isCombined) {
        body.invoiceIds = invoices.map((i) => i.id);
      } else {
        body.invoiceId = primary.id;
      }

      const { data, error } = await supabase.functions.invoke('initiate-mpesa-stk-push', { body });

      if (error || !data?.checkoutRequestId && !data?.CheckoutRequestID) {
        throw new Error(data?.error || error?.message || 'Failed to initiate payment');
      }

      const requestId = data.checkoutRequestId ?? data.CheckoutRequestID;
      setStatus('waiting');
      startCountdown(90);
      startPolling(requestId);
    } catch (err: unknown) {
      setStatus('failed');
      setErrorMsg(err instanceof Error ? err.message : 'Payment initiation failed');
    }
  };

  const startCountdown = (seconds: number) => {
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearPolling();
          setStatus('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startPolling = (requestId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('verify-mpesa-stk-status', {
          body: { checkoutRequestId: requestId },
        });

        if (data?.status === 'completed') {
          clearPolling();
          setMpesaReceipt(data.mpesaReceiptNumber || null);
          setStatus('success');
          setTimeout(onPaymentSuccess, 2000);
        } else if (data?.status === 'failed') {
          clearPolling();
          setErrorMsg(data.failureReason || 'Payment was cancelled or failed');
          setStatus('failed');
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
  };

  const handleClose = () => {
    if (status === 'waiting' || status === 'initiating') {
      toast({
        title: 'Payment in progress',
        description: 'Please wait for the M-Pesa prompt on your phone.',
        variant: 'destructive',
      });
      return;
    }
    clearPolling();
    onOpenChange(false);
  };

  if (!primary) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            Pay via M-Pesa
          </DialogTitle>
          <DialogDescription>
            {isCombined
              ? `${invoices.length} bills · ${fmt(amountDue)}`
              : `${primary.invoice_number} · ${fmt(amountDue)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {status === 'idle' && (
            <>
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-2 max-h-48 overflow-y-auto">
                {isCombined && (
                  <div className="flex items-center gap-2 text-xs font-medium text-green-800 mb-2">
                    <Layers className="h-3.5 w-3.5" />
                    Combined payment — allocated to each bill automatically
                  </div>
                )}
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex justify-between text-sm border-b border-green-100 last:border-0 pb-2 last:pb-0">
                    <span className="text-muted-foreground truncate max-w-[55%]">
                      {inv.description || inv.invoice_number}
                    </span>
                    <span className="font-medium shrink-0">{fmt(balanceOf(inv))}</span>
                  </div>
                ))}
                <div className="border-t border-green-200 pt-2 flex justify-between items-center">
                  <span className="font-semibold text-green-900">Total due</span>
                  <span className="text-xl font-bold text-green-800">{fmt(amountDue)}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="mpesa-phone" className="text-sm font-medium">
                  Your M-Pesa number
                </Label>
                <Input
                  id="mpesa-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="0712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 text-base h-11"
                  autoFocus
                />
              </div>

              <Button
                onClick={initiatePayment}
                className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <Smartphone className="h-5 w-5" />
                Send M-Pesa Request — {fmt(amountDue)}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Receipt sent instantly by email & SMS after payment</span>
              </div>
            </>
          )}

          {status === 'initiating' && (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="h-12 w-12 mx-auto text-green-600 animate-spin" />
              <p className="font-semibold text-lg">Connecting to Safaricom…</p>
            </div>
          )}

          {status === 'waiting' && (
            <div className="py-6 text-center space-y-5">
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute h-20 w-20 rounded-full bg-green-100 animate-ping opacity-50" />
                <div className="relative h-20 w-20 rounded-full bg-green-50 border-2 border-green-300 flex items-center justify-center">
                  <Smartphone className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <p className="font-bold text-xl">Check your phone</p>
              <p className="text-sm text-muted-foreground">
                Enter your M-Pesa PIN to pay {fmt(amountDue)}
              </p>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-1000"
                  style={{ width: `${(countdown / 90) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Expires in {countdown}s</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <p className="font-bold text-2xl text-green-700">Payment confirmed!</p>
              <p className="text-sm text-muted-foreground">{fmt(amountDue)} received</p>
              {mpesaReceipt && (
                <p className="font-mono text-sm bg-green-50 py-2 rounded-lg">{mpesaReceipt}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Your receipt is on its way — check email and Documents.
              </p>
            </div>
          )}

          {(status === 'failed' || status === 'timeout') && (
            <div className="py-6 text-center space-y-4">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="font-semibold text-destructive">
                {status === 'timeout' ? 'Request expired' : 'Payment not completed'}
              </p>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button onClick={() => setStatus('idle')} variant="outline" className="gap-2 w-full">
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          )}
        </div>

        {(status === 'idle' || status === 'failed' || status === 'timeout') && (
          <Button variant="ghost" size="sm" onClick={handleClose} className="w-full">
            Cancel
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TenantPayNowDialog;
