/**
 * MpesaPaymentDialog.tsx — Fixed
 *
 * FIX SUMMARY:
 * 1. Does NOT send managerId in the STK push request body.
 *    The fixed edge function derives manager from the unit chain server-side.
 *    Sending it from the client was a security issue (tenant could spoof any manager).
 * 2. Shows the unit number prominently so the tenant knows which unit they're paying.
 * 3. AccountReference displayed to tenant matches what appears in landlord's M-Pesa.
 * 4. Better error messaging with actionable steps.
 * 5. Poll interval increased (was not shown – now using verify-mpesa-stk-status).
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import {
  Loader2,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Home,
  Hash,
} from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  description: string | null;
  lease_id: string | null;
  tenants: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  leases: {
    property: string;
    unit: string;
    property_id?: string | null;
    unit_id?: string | null;
  } | null;
}

interface MpesaSettings {
  paybill_enabled: boolean;
  paybill_shortcode: string | null;
  paybill_account_reference: string | null;
  till_enabled: boolean;
  till_shortcode: string | null;
  use_unit_as_account_ref?: boolean;
}

interface MpesaPaymentDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentComplete: () => void;
}

export function MpesaPaymentDialog({
  invoice,
  open,
  onOpenChange,
  onPaymentComplete,
}: MpesaPaymentDialogProps) {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "pending" | "verifying" | "success" | "failed"
  >("idle");
  const [paymentType, setPaymentType] = useState<"paybill" | "till">("paybill");
  const [mpesaSettings, setMpesaSettings] = useState<MpesaSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [unitNumber, setUnitNumber] = useState<string>("N/A");
  const [accountReference, setAccountReference] = useState<string>("");

  // ── Load M-Pesa settings when dialog opens ──────────────────────────────
  useEffect(() => {
    if (!open || !invoice?.lease_id) return;

    setSettingsError(null);
    setMpesaSettings(null);

    const loadSettings = async () => {
      // Derive unit number from the lease
      const unitNum = invoice.leases?.unit ?? "N/A";
      setUnitNumber(unitNum);

      // Resolve manager from lease → property chain
      const { data: leaseData, error: leaseError } = await supabase
        .from("leases")
        .select("property_id, unit_id, units(unit_number), properties(manager_id)")
        .eq("id", invoice.lease_id!)
        .maybeSingle();

      if (leaseError || !leaseData) {
        setSettingsError("Could not load lease information. Please try again.");
        return;
      }

      // Use unit_number from units table if available (more authoritative)
      const resolvedUnit =
        (leaseData.units as { unit_number: string } | null)?.unit_number ??
        unitNum;
      setUnitNumber(resolvedUnit);

      const managerId = (
        leaseData.properties as { manager_id: string | null } | null
      )?.manager_id;

      if (!managerId) {
        setSettingsError(
          "This property doesn't have an assigned manager with M-Pesa configured."
        );
        return;
      }

      const propertyId = leaseData.property_id;
      let paymentReceiverType: "manager" | "landlord" = "manager";
      let landlordId: string | null = null;

      if (propertyId) {
        const { data: pl } = await supabase
          .from("property_landlords")
          .select("landlord_user_id, payment_destination")
          .eq("property_id", propertyId)
          .maybeSingle();
        if (pl?.payment_destination === "landlord" && pl?.landlord_user_id) {
          paymentReceiverType = "landlord";
          landlordId = pl.landlord_user_id;
        }
      }

      // Load the correct M-Pesa settings based on payment destination
      let settings: MpesaSettings | null = null;

      if (paymentReceiverType === "landlord" && landlordId) {
        const { data: s } = await supabase
          .from("landlord_mpesa_settings")
          .select(
            "paybill_enabled, paybill_shortcode, paybill_account_reference, till_enabled, till_shortcode, use_unit_as_account_ref"
          )
          .eq("landlord_user_id", landlordId)
          .maybeSingle();
        settings = s;
      } else {
        const { data: s } = await supabase
          .from("manager_mpesa_settings")
          .select(
            "paybill_enabled, paybill_shortcode, paybill_account_reference, till_enabled, till_shortcode, use_unit_as_account_ref"
          )
          .eq("manager_user_id", managerId)
          .maybeSingle();
        settings = s;
      }

      if (!settings) {
        setSettingsError(
          "No M-Pesa payment method configured for this property. " +
            "Please contact your property manager."
        );
        return;
      }

      if (!settings.paybill_enabled && !settings.till_enabled) {
        setSettingsError(
          "No M-Pesa payment methods are enabled for this property."
        );
        return;
      }

      setMpesaSettings(settings);

      // Determine the AccountReference shown to tenant
      const useUnitRef = settings.use_unit_as_account_ref !== false;
      setAccountReference(
        useUnitRef
          ? resolvedUnit.slice(0, 12)
          : settings.paybill_account_reference?.slice(0, 12) ?? resolvedUnit.slice(0, 12)
      );

      // Pre-fill from tenant profile
      if (invoice.tenants?.phone) {
        setPhoneNumber(invoice.tenants.phone);
      }
    };

    loadSettings();
  }, [open, invoice]);

  // ── Poll for payment result ──────────────────────────────────────────────
  const pollPaymentStatus = useCallback(
    (reqId: string) => {
      let attempts = 0;
      const MAX_ATTEMPTS = 12; // 12 × 5s = 60s

      const timer = setInterval(async () => {
        attempts++;
        if (attempts > MAX_ATTEMPTS) {
          clearInterval(timer);
          setPaymentStatus("failed");
          toast({
            title: "Payment timeout",
            description:
              "We didn't receive a confirmation. If you completed the payment " +
              "on your phone, please wait a minute and refresh.",
            variant: "destructive",
          });
          return;
        }

        try {
          const { data } = await supabase.functions.invoke(
            "verify-mpesa-stk-status",
            { body: { checkoutRequestId: reqId } }
          );

          if (data?.status === "completed") {
            clearInterval(timer);
            setPaymentStatus("success");
            toast({
              title: "Payment successful! 🎉",
              description: `KES ${invoice!.amount.toLocaleString()} received for Unit ${unitNumber}.`,
            });
            setTimeout(() => {
              onPaymentComplete();
              onOpenChange(false);
            }, 2500);
          } else if (data?.status === "failed") {
            clearInterval(timer);
            setPaymentStatus("failed");
            toast({
              title: "Payment failed",
              description:
                data.failureReason ?? "Payment was cancelled or failed.",
              variant: "destructive",
            });
          }
        } catch {
          // Polling error – continue polling
        }
      }, 5000);
    },
    [invoice, unitNumber, onPaymentComplete, onOpenChange, toast]
  );

  // ── Initiate STK push ────────────────────────────────────────────────────
  const handleSTKPush = useCallback(async () => {
    if (!invoice || !phoneNumber || !mpesaSettings) return;

    setIsProcessing(true);
    setPaymentStatus("pending");

    try {
      const { data, error } = await supabase.functions.invoke(
        "initiate-mpesa-stk-push",
        {
          body: {
            invoiceId: invoice.id,
            amount: invoice.amount,
            phoneNumber,
            paymentType,
            // ⚠️ NO managerId here — the edge function resolves it server-side
            //    from the unit → property chain. Sending it from the client
            //    allowed tenants to spoof a different manager's M-Pesa.
          },
        }
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "STK push failed");

      setCheckoutRequestId(data.checkoutRequestId);
      setPaymentStatus("verifying");

      toast({
        title: "Check your phone",
        description: `A payment prompt of ${formatCurrency(invoice.amount)} has been sent to ${phoneNumber}.`,
      });

      // Start polling for completion
      pollPaymentStatus(data.checkoutRequestId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPaymentStatus("failed");
      toast({
        title: "Payment initiation failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [invoice, phoneNumber, mpesaSettings, paymentType, formatCurrency, toast, pollPaymentStatus]);

  const canPay =
    !!phoneNumber &&
    !isProcessing &&
    paymentStatus === "idle" &&
    !!mpesaSettings;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            M-Pesa Payment
          </DialogTitle>
          <DialogDescription>
            Pay rent via M-Pesa STK push directly to your phone.
          </DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="space-y-4">
            {/* Unit + Amount summary */}
            <div className="rounded-lg border bg-green-50 p-4">
              <div className="flex items-center gap-2 mb-1 text-green-800">
                <Home className="h-4 w-4" />
                <span className="font-semibold">{invoice.leases?.property ?? "Property"}</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="gap-1 text-sm">
                  <Hash className="h-3 w-3" />
                  Unit {unitNumber}
                </Badge>
                <span className="text-lg font-bold text-green-700">
                  {formatCurrency(invoice.amount)}
                </span>
              </div>
              {accountReference && (
                <p className="mt-1 text-xs text-green-600">
                  M-Pesa account ref: <strong>{accountReference}</strong>
                </p>
              )}
            </div>

            {/* Settings error */}
            {settingsError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{settingsError}</AlertDescription>
              </Alert>
            )}

            {/* Payment type selector */}
            {mpesaSettings && (
              <div className="space-y-3">
                {mpesaSettings.paybill_enabled && mpesaSettings.till_enabled && (
                  <div>
                    <Label className="text-sm font-medium">Payment method</Label>
                    <RadioGroup
                      value={paymentType}
                      onValueChange={(v) => setPaymentType(v as "paybill" | "till")}
                      className="flex gap-4 mt-1"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="paybill" id="paybill" />
                        <Label htmlFor="paybill">
                          Paybill {mpesaSettings.paybill_shortcode && `(${mpesaSettings.paybill_shortcode})`}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="till" id="till" />
                        <Label htmlFor="till">
                          Till {mpesaSettings.till_shortcode && `(${mpesaSettings.till_shortcode})`}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Phone number */}
                <div>
                  <Label htmlFor="phone">M-Pesa phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="07XXXXXXXX or 2547XXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={paymentStatus !== "idle"}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Status indicators */}
            {paymentStatus === "verifying" && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Waiting for M-Pesa confirmation… Please complete the prompt on your phone.
                </AlertDescription>
              </Alert>
            )}
            {paymentStatus === "success" && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Payment received! Your receipt will be emailed to you.
                </AlertDescription>
              </Alert>
            )}
            {paymentStatus === "failed" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Payment failed or timed out. You can try again below.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {paymentStatus === "failed" ? (
            <Button onClick={() => setPaymentStatus("idle")}>Try again</Button>
          ) : (
            <Button
              onClick={handleSTKPush}
              disabled={!canPay}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending prompt…
                </>
              ) : (
                `Pay ${invoice ? formatCurrency(invoice.amount) : ""}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
