import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatDate } from "@/shared/lib/dateFormat";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { isInvoiceOverdue, getDaysUntilDue } from "@/features/billing/lib/invoiceDueLogic";
import { useManagerScope } from "@/shared/hooks/useManagerScope";

type PaymentStatus = "upcoming" | "due_soon" | "due_today" | "overdue";

interface Payment {
  id: string;
  tenant_name: string;
  tenant_photo: string | null;
  unit: string | null;
  amount: number;
  due_date: string;
  status: PaymentStatus;
  daysUntilDue: number;
}

export function UpcomingPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useCurrency();
  const { managerId, restrictToAssignedProperties, assignedPropertyIds } = useManagerScope();

  const fetchPayments = useCallback(async () => {
    try {
      if (!managerId) {
        setPayments([]);
        return;
      }
      if (restrictToAssignedProperties && assignedPropertyIds.length === 0) {
        setPayments([]);
        return;
      }

      const _today = new Date().toISOString().split("T")[0];
      let scopedTenantIds: string[] | null = null;

      if (restrictToAssignedProperties) {
        const { data: scopedTenants } = await supabase
          .from("tenants")
          .select("id")
          .eq("manager_id", managerId)
          .in("property_id", assignedPropertyIds);
        scopedTenantIds = (scopedTenants || []).map((tenant) => tenant.id);
        if (scopedTenantIds.length === 0) {
          setPayments([]);
          return;
        }
      }

      // Fetch pending and overdue invoices with tenant info
      let invoiceQuery = supabase
        .from("invoices")
        .select(`
          id,
          amount,
          due_date,
          status,
          tenant_id
        `)
        .eq("manager_id", managerId)
        .in("status", ["pending", "overdue"])
        .order("due_date", { ascending: true })
        .limit(6);

      if (scopedTenantIds) {
        invoiceQuery = invoiceQuery.in("tenant_id", scopedTenantIds);
      }

      const { data: invoices, error } = await invoiceQuery;

      if (error) {
        setPayments([]);
        return;
      }

      if (!invoices || invoices.length === 0) {
        setPayments([]);
        return;
      }

      // Get unique tenant IDs
      const tenantIds = [...new Set(invoices.map((inv) => inv.tenant_id).filter(Boolean))];

      // Fetch tenant details
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name, photo_url, unit")
        .eq("manager_id", managerId)
        .in("id", tenantIds);

      const tenantMap = new Map(tenants?.map((t) => [t.id, t]) || []);

      const paymentsData: Payment[] = invoices.map((inv) => {
        const tenant = tenantMap.get(inv.tenant_id);
        const daysUntilDue = getDaysUntilDue(inv.due_date);
        const isOverdue = inv.status === "overdue" || isInvoiceOverdue(inv.due_date, inv.status);
        
        // Determine status based on days until due
        let status: PaymentStatus;
        if (isOverdue) {
          status = "overdue";
        } else if (daysUntilDue === 0) {
          status = "due_today";
        } else if (daysUntilDue <= 3) {
          status = "due_soon";
        } else {
          status = "upcoming";
        }
        
        return {
          id: inv.id,
          tenant_name: tenant?.name || "Unknown Tenant",
          tenant_photo: tenant?.photo_url || null,
          unit: tenant?.unit || null,
          amount: inv.amount,
          due_date: inv.due_date,
          status,
          daysUntilDue,
        };
      });

      setPayments(paymentsData);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [assignedPropertyIds, managerId, restrictToAssignedProperties]);

  useEffect(() => {
    fetchPayments();

    // Subscribe to real-time invoice changes
    const channel = supabase
      .channel('upcoming-payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPayments]);

  const formatDateStr = (dateStr: string) => {
    return formatDate(dateStr);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 card-shadow animate-fade-in">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <Skeleton className="h-5 sm:h-6 w-32 sm:w-40" />
          <Skeleton className="h-5 w-16 sm:w-20" />
        </div>
        <div className="space-y-2.5 sm:space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 sm:h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 card-shadow animate-fade-in">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="font-heading text-base sm:text-lg font-semibold text-card-foreground">
          Upcoming Payments
        </h3>
        <Badge variant="secondary" className="font-medium text-xs">
          {payments.length} pending
        </Badge>
      </div>
      <div className="space-y-2.5 sm:space-y-3">
        {payments.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4">
            No pending payments
          </p>
        ) : (
          payments.map((payment, index) => (
            <div
              key={payment.id}
              className="flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-slide-in touch-manipulation"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                <AvatarImage src={payment.tenant_photo || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px] sm:text-xs">
                  {payment.tenant_name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-card-foreground truncate">
                  {payment.tenant_name}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{payment.unit || "No unit"}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs sm:text-sm font-semibold text-card-foreground">
                  {formatCurrency(payment.amount)}
                </p>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden xs:inline">
                    {formatDateStr(payment.due_date)}
                  </span>
                  {payment.status === "overdue" && (
                    <Badge variant="destructive" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">
                      Overdue
                    </Badge>
                  )}
                  {payment.status === "due_today" && (
                    <Badge className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 bg-amber-500/20 text-amber-600 border-amber-500/30">
                      Due Today
                    </Badge>
                  )}
                  {payment.status === "due_soon" && (
                    <Badge className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 bg-orange-500/20 text-orange-600 border-orange-500/30">
                      {payment.daysUntilDue}d
                    </Badge>
                  )}
                  {payment.status === "upcoming" && (
                    <Badge className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 bg-blue-500/20 text-blue-600 border-blue-500/30">
                      {payment.daysUntilDue}d
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
