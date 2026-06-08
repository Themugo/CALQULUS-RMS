import { format } from "date-fns";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRBAC } from "@/shared/hooks/useRBAC";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import {
  Search, Mail, Phone, History, Upload, User, Calendar,
  Home, FileText, Wallet, Users, Send, UserCheck, UserX,
  Clock, Archive, UserPlus, Building2,
} from "lucide-react";
import { TenantStatement } from "@/features/tenants/components/TenantStatement";
import { InvitationTracker } from "@/features/tenants/components/InvitationTracker";
import { InviteTenantDialog } from "@/features/tenants/components/InviteTenantDialog";
import MoveOutDialog from "@/features/tenants/components/MoveOutDialog";
import TenantProfilePanel from "@/features/tenants/components/TenantProfilePanel";
import DepositAccountabilityStatement from "@/features/tenants/components/DepositAccountabilityStatement";
import TenantNoticeComposer from "@/features/tenants/components/TenantNoticeComposer";
import PaymentPayersManager from "@/features/payments/components/PaymentPayersManager";
import { useToast } from "@/shared/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useManagerScope } from "@/shared/hooks/useManagerScope";

interface Property {
  id: string;
  name: string;
  address: string;
}

interface TenantData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  property: string | null;
  property_id: string | null;
  unit_id: string | null;
  unit: string | null;
  status: string;
  photo_url: string | null;
  move_in_date: string | null;
  monthly_rent: number | null;
  deposit_amount: number | null;
  deposit_months: number | null;
  deposit_balance: number | null;
  other_charges: number | null;
  other_charges_description: string | null;
  statement_history_months: number | null;
  created_at: string;
  updated_at: string;
}

interface TenantHistoryItem {
  id: string;
  tenant_id: string;
  action: string;
  description: string;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  inactive: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const Tenants = () => {
  const { toast } = useToast();
  const { can } = useRBAC();
  const { managerId, restrictToAssignedProperties, assignedPropertyIds } = useManagerScope();
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<TenantData | null>(null);
  const [tenantHistory, setTenantHistory] = useState<TenantHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [statusTab, setStatusTab] = useState<"active" | "pending" | "inactive">("active");
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [moveOutTenant, setMoveOutTenant] = useState<TenantData | null>(null);
  const [moveOutDialogOpen, setMoveOutDialogOpen] = useState(false);

  const generateSignedUrls = async (tenantsList: TenantData[]) => {
    const urlMap: Record<string, string> = {};
    for (const tenant of tenantsList) {
      if (tenant.photo_url) {
        let filePath = tenant.photo_url;
        if (filePath.includes('/tenant-photos/')) {
          filePath = filePath.split('/tenant-photos/').pop() || filePath;
        }
        const { data, error } = await supabase.storage
          .from('tenant-photos')
          .createSignedUrl(filePath, 3600);
        if (data && !error) {
          urlMap[tenant.id] = data.signedUrl;
        }
      }
    }
    setSignedUrls(urlMap);
  };

  const fetchTenants = useCallback(async () => {
    if (!managerId) {
      setTenants([]);
      setIsLoading(false);
      return;
    }
    if (restrictToAssignedProperties && assignedPropertyIds.length === 0) {
      setTenants([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from("tenants")
        .select("*")
        .eq("manager_id", managerId)
        .order("created_at", { ascending: false });

      if (restrictToAssignedProperties) {
        query = query.in("property_id", assignedPropertyIds);
      }

      const { data, error } = await query;

      if (error) {
        toast({ title: "Error", description: error.message || "Failed to fetch tenants", variant: "destructive" });
      } else {
        setTenants((data || []) as TenantData[]);
        if (data && data.length > 0) {
          generateSignedUrls((data || []) as TenantData[]);
        }
      }
    } catch (err) {
      console.error('[Tenants] fetchTenants error:', err);
      toast({ title: "Error", description: "Failed to load tenants. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [assignedPropertyIds, managerId, restrictToAssignedProperties, toast]);

  const fetchProperties = useCallback(async () => {
    if (!managerId) {
      setProperties([]);
      return;
    }
    if (restrictToAssignedProperties && assignedPropertyIds.length === 0) {
      setProperties([]);
      return;
    }
    try {
      let query = supabase
        .from("properties")
        .select("id, name, address")
        .eq("manager_id", managerId)
        .order("name", { ascending: true });

      if (restrictToAssignedProperties) {
        query = query.in("id", assignedPropertyIds);
      }

      const { data, error } = await query;
      if (!error && data) setProperties(data);
    } catch (err) {
      console.error('[Tenants] fetchProperties error:', err);
    }
  }, [assignedPropertyIds, managerId, restrictToAssignedProperties]);

  const fetchTenantHistory = async (tenantId: string) => {
    const { data, error } = await supabase
      .from("tenant_history")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to fetch tenant history", variant: "destructive" });
    } else {
      setTenantHistory(data || []);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchProperties();
  }, [fetchTenants, fetchProperties]);

  const openHistory = async (tenant: TenantData) => {
    setSelectedTenant(tenant);
    await fetchTenantHistory(tenant.id);
    setIsHistoryOpen(true);
  };

  const openStatement = (tenant: TenantData) => {
    setSelectedTenant(tenant);
    setIsStatementOpen(true);
  };

  // Filter tenants by status tab, property, and search
  const filteredTenants = tenants.filter((tenant) => {
    if (tenant.status !== statusTab) return false;
    if (propertyFilter && tenant.property_id !== propertyFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(q) ||
      tenant.email.toLowerCase().includes(q) ||
      (tenant.property && tenant.property.toLowerCase().includes(q)) ||
      (tenant.unit && tenant.unit.toLowerCase().includes(q))
    );
  });

  const activeTenants = tenants.filter(t => t.status === "active");
  const pendingTenants = tenants.filter(t => t.status === "pending");
  const inactiveTenants = tenants.filter(t => t.status === "inactive");

  const TenantTable = ({ tenantList }: { tenantList: TenantData[] }) => (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading tenants...</div>
      ) : tenantList.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          {searchQuery ? "No tenants match your search." : "No tenants in this category."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="font-heading font-semibold">Tenant</TableHead>
              <TableHead className="font-heading font-semibold">Contact</TableHead>
              <TableHead className="font-heading font-semibold">Property</TableHead>
              <TableHead className="font-heading font-semibold">Move-in Date</TableHead>
              <TableHead className="font-heading font-semibold">Payment Details</TableHead>
              <TableHead className="font-heading font-semibold">Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenantList.map((tenant, index) => (
              <TableRow
                key={tenant.id}
                className="hover:bg-muted/30 border-border animate-slide-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-transparent">
                      <AvatarImage src={signedUrls[tenant.id] || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {tenant.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{tenant.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {tenant.email}
                    </div>
                    {tenant.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {tenant.phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {tenant.property ? (
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Home className="h-3.5 w-3.5 text-muted-foreground" />
                        {tenant.property}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    )}
                    {tenant.unit && (
                      <div className="text-sm text-muted-foreground pl-5">{tenant.unit}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {tenant.move_in_date ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(tenant.move_in_date), 'dd/MM/yy')}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5 text-sm">
                    {tenant.monthly_rent ? (
                      <div className="font-medium text-foreground">
                        KES {tenant.monthly_rent.toLocaleString()}/mo
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No rent set</span>
                    )}
                    {tenant.deposit_amount && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        Balance: KES {(tenant.deposit_balance ?? tenant.deposit_amount).toLocaleString()}
                        <span className="text-muted-foreground/60">
                          / {tenant.deposit_amount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {tenant.other_charges && tenant.other_charges > 0 && (
                      <div className="text-xs text-muted-foreground">
                        +KES {tenant.other_charges.toLocaleString()} {tenant.other_charges_description ? `(${tenant.other_charges_description})` : 'other'}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusStyles[tenant.status] || statusStyles.active}>
                    {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openStatement(tenant)}
                      title="View Statement"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openHistory(tenant)}
                      title="View History"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    {tenant.status === 'active' && tenant.unit_id && can('approve_moveouts') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => {
                          setMoveOutTenant(tenant);
                          setMoveOutDialogOpen(true);
                        }}
                        title="Process Move-Out"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  return (
    <Layout title="Tenants" subtitle="View tenant records across all properties">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-56 h-9 text-sm">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 h-9 pl-8 text-sm bg-card border-border"
          />
        </div>

        <div className="flex items-center gap-2">
          <InviteTenantDialog trigger={<Button size="sm" className="gap-1.5"><UserPlus className="h-3.5 w-3.5" />Invite Tenant</Button>} />
        </div>
      </div>

      {/* Per-property quick-add sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {(propertyFilter ? properties.filter(p => p.id === propertyFilter) : properties).map((p) => {
          const propertyTenants = tenants.filter(t => t.property_id === p.id);
          return (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{propertyTenants.length} tenant{propertyTenants.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <InviteTenantDialog
                preSelectedPropertyId={p.id}
                trigger={<Button variant="outline" size="sm" className="shrink-0 gap-1"><UserPlus className="h-3 w-3" />Add Tenant</Button>}
              />
            </div>
          );
        })}
      </div>

      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as "active" | "pending" | "inactive")} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="active" className="flex items-center gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
              <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Current
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{activeTenants.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Onboarding
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{pendingTenants.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex items-center gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
              <UserX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Deactivated
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{inactiveTenants.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm bg-card border-border"
            />
          </div>
        </div>

        <TabsContent value="active" className="mt-0">
          <TenantTable tenantList={filteredTenants} />
        </TabsContent>
        <TabsContent value="pending" className="mt-0">
          <TenantTable tenantList={filteredTenants} />
        </TabsContent>
        <TabsContent value="inactive" className="mt-0">
          <TenantTable tenantList={filteredTenants} />
        </TabsContent>
      </Tabs>

      {/* Tenant Detail Sheet — full tabbed panel */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent className="bg-card border-border w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-foreground flex items-center gap-3">
              {selectedTenant && (
                <>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={signedUrls[selectedTenant.id] || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {selectedTenant.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p>{selectedTenant.name}</p>
                    <p className="text-xs text-muted-foreground font-normal">{selectedTenant.unit} · {selectedTenant.property}</p>
                  </div>
                </>
              )}
            </SheetTitle>
          </SheetHeader>
          {selectedTenant && (
            <div className="mt-6">
              <Tabs defaultValue="profile">
                <TabsList className="flex-wrap h-auto gap-1 p-1 mb-4 text-xs">
                  <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
                  <TabsTrigger value="payers" className="text-xs">Payers</TabsTrigger>
                  <TabsTrigger value="deposit" className="text-xs">Deposit</TabsTrigger>
                  <TabsTrigger value="notices" className="text-xs">Notices</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                  <TabsTrigger value="portal" className="text-xs">Portal</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <TenantProfilePanel tenant={selectedTenant} onUpdate={fetchTenants} />
                </TabsContent>

                <TabsContent value="payers">
                  <PaymentPayersManager
                    tenantId={selectedTenant.id}
                    tenantName={selectedTenant.name}
                    unitId={selectedTenant.unit_id}
                    propertyId={selectedTenant.property_id}
                    monthlyRent={selectedTenant.monthly_rent}
                  />
                </TabsContent>

                <TabsContent value="deposit">
                  <DepositAccountabilityStatement
                    tenant={selectedTenant}
                    unitId={selectedTenant.unit_id}
                  />
                </TabsContent>

                <TabsContent value="notices">
                  <TenantNoticeComposer tenant={selectedTenant} />
                </TabsContent>

                <TabsContent value="history">
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    {tenantHistory.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No history records yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tenantHistory.map((item) => (
                          <div key={item.id} className="relative pl-6 pb-4 border-l-2 border-border last:border-l-0">
                            <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary" />
                            <div className="bg-muted/30 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                  {item.action}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(item.created_at), 'dd/MM/yy')}
                                </span>
                              </div>
                              <p className="text-sm text-foreground">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="portal">
                  <div className="space-y-4 p-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Tenant Portal Access</p>
                        <p className="text-xs text-muted-foreground">
                          Invite tenant to create their portal login and access invoices, maintenance, documents.
                        </p>
                      </div>
                      <InviteTenantDialog
                        trigger={
                          <Button size="sm" className="gap-1.5">
                            <UserPlus className="h-3.5 w-3.5" />
                            Send Invite
                          </Button>
                        }
                      />
                    </div>
                    <InvitationTracker tenantId={selectedTenant.id} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Statement Sheet */}
      <TenantStatement
        tenant={selectedTenant}
        isOpen={isStatementOpen}
        onOpenChange={setIsStatementOpen}
      />

      {/* Move-Out Dialog */}
      {moveOutTenant && (
        <MoveOutDialog
          tenant={moveOutTenant}
          open={moveOutDialogOpen}
          onOpenChange={(open) => {
            setMoveOutDialogOpen(open);
            if (!open) setMoveOutTenant(null);
          }}
          onSuccess={() => {
            // Refresh tenant list after move-out
            setTenants(prev => prev.map(t =>
              t.id === moveOutTenant.id ? { ...t, status: 'inactive' } : t
            ));
          }}
        />
      )}
    </Layout>
  );
};

export default Tenants;
