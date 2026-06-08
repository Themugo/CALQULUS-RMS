import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Calendar, Wallet, Paperclip, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { formatDate } from "@/shared/lib/dateFormat";

type LeaseStatus = "active" | "expiring" | "expired" | "pending" | "terminated";

interface Tenant {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
}

interface Lease {
  id: string;
  tenant_id: string | null;
  property_id: string | null;
  unit_id?: string | null;
  property: string;
  unit: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit: number | null;
  status: LeaseStatus;
  document_url: string | null;
  tenants: Tenant | null;
}

interface LeaseCardProps {
  lease: Lease;
  isSelected: boolean;
  formatCurrency: (amount: number) => string;
  onSelect: () => void;
  onView: () => void;
}

const statusStyles: Record<LeaseStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  expiring: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  expired: "bg-red-500/10 text-red-700 border-red-500/20",
  pending: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  terminated: "bg-gray-500/10 text-gray-700 border-gray-500/20",
};

const statusIcons: Record<LeaseStatus, React.ReactNode> = {
  active: <CheckCircle2 className="h-3 w-3" />,
  expiring: <Clock className="h-3 w-3" />,
  expired: <XCircle className="h-3 w-3" />,
  pending: <Clock className="h-3 w-3" />,
  terminated: <AlertTriangle className="h-3 w-3" />,
};

export const LeaseCard = ({ lease, isSelected, formatCurrency, onSelect, onView }: LeaseCardProps) => {
  return (
    <Card
      className={`group cursor-pointer transition-all duration-200 active:scale-[0.98] hover:border-primary/50 bg-card border-border ${isSelected ? "ring-2 ring-primary border-primary" : ""}`}
      onClick={onView}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select lease for ${lease.tenants?.name}`}
              className="flex-shrink-0 h-5 w-5"
            />
            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
              <AvatarImage src={lease.tenants?.photo_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm font-medium">
                {lease.tenants?.name?.split(" ").map((n) => n[0]).join("") || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                {lease.tenants?.name || "No Tenant"}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {lease.property} • {lease.unit}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={`${statusStyles[lease.status]} text-[10px] sm:text-xs flex-shrink-0 px-1.5 sm:px-2`}>
            {statusIcons[lease.status]}
            <span className="ml-1 capitalize">{lease.status}</span>
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border">
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{formatDate(lease.end_date)}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="font-semibold text-foreground">{formatCurrency(lease.monthly_rent)}</span>
            </div>
          </div>
          {lease.document_url && (
            <div className="flex items-center gap-1 text-emerald-500">
              <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
