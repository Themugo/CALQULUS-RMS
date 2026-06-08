import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { FileText, Calendar } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { Link } from "react-router-dom";

interface Lease {
  id: string;
  tenant_id: string | null;
  unit: string;
  monthly_rent: number;
  start_date: string;
  end_date: string;
  status: string;
  deposit: number | null;
}

interface Tenant {
  id: string;
  name: string;
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  expired: "bg-red-500/10 text-red-600 border-red-500/20",
  terminated: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  expiring: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

interface PropertyLeasesTabProps {
  leases: Lease[];
  tenants: Tenant[];
}

export function PropertyLeasesTab({ leases, tenants }: PropertyLeasesTabProps) {
  const { formatCurrency } = useCurrency();

  const getTenantName = (tenantId: string | null) => {
    if (!tenantId) return "—";
    return tenants.find(t => t.id === tenantId)?.name || "Unknown";
  };

  const totalMonthlyRent = leases
    .filter(l => l.status === "active")
    .reduce((sum, l) => sum + l.monthly_rent, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Leases
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {leases.length} total • Active monthly rent: {formatCurrency(totalMonthlyRent)}
          </p>
        </div>
        <Link to="/leases">
          <Button variant="outline" size="sm">Manage Leases</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {leases.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No leases for this property</p>
            <Link to="/leases">
              <Button variant="outline" className="mt-4" size="sm">Create Lease</Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases.map((lease) => (
                <TableRow key={lease.id}>
                  <TableCell className="font-medium">{lease.unit}</TableCell>
                  <TableCell>{getTenantName(lease.tenant_id)}</TableCell>
                  <TableCell className="font-medium text-emerald-600">
                    {formatCurrency(lease.monthly_rent)}/mo
                  </TableCell>
                  <TableCell>
                    {lease.deposit ? formatCurrency(lease.deposit) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(lease.start_date), 'dd/MM/yy')} - {format(new Date(lease.end_date), 'dd/MM/yy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize", statusStyles[lease.status] || "")}>
                      {lease.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
