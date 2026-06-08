import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Wrench, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/shared/lib/utils";
import { Link } from "react-router-dom";

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tenant_name: string;
  unit_number: string | null;
  category: string | null;
  requested_date: string;
  completion_date: string | null;
}

const statusStyles: Record<string, string> = {
  open: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

const priorityStyles: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-600 border-red-500/20",
};

interface PropertyMaintenanceTabProps {
  propertyName: string;
}

export function PropertyMaintenanceTab({ propertyName }: PropertyMaintenanceTabProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*")
        .eq("property_name", propertyName)
        .order("requested_date", { ascending: false });

      if (!error) setRequests(data || []);
      setIsLoading(false);
    };
    fetchRequests();
  }, [propertyName]);

  const openCount = requests.filter(r => r.status === "open").length;
  const inProgressCount = requests.filter(r => r.status === "in_progress").length;
  const completedCount = requests.filter(r => r.status === "completed").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Maintenance Requests
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {requests.length} total • {openCount} open • {inProgressCount} in progress • {completedCount} completed
          </p>
        </div>
        <Link to="/maintenance">
          <Button variant="outline" size="sm">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500/50 mb-4" />
            <p className="text-muted-foreground">No maintenance requests for this property</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.title}</TableCell>
                  <TableCell>{req.unit_number || "—"}</TableCell>
                  <TableCell>{req.tenant_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize", priorityStyles[req.priority] || "")}>
                      {req.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize", statusStyles[req.status] || "")}>
                      {req.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(req.requested_date), 'dd/MM/yy')}
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
