import { format } from "date-fns";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useRBAC } from "@/shared/hooks/useRBAC";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import {
  ArrowLeft, Building2, MapPin, Users, Home, Mail, Phone, Calendar,
  Plus, UserPlus, DollarSign, Pencil, X, Layers, History, Hash,
  Wrench, CreditCard, FileText, Droplets, FileSignature, CalendarX, Settings2,
  FileSpreadsheet, User,
} from "lucide-react";
import PropertyLandlordTab from "@/features/properties/components/PropertyLandlordTab";
import { useToast } from "@/shared/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/shared/lib/utils";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { UnitManagement } from "@/features/units/components/UnitManagement";
import UnitBillingConfig from "@/features/units/components/UnitBillingConfig";
import { PropertyHistory } from "@/features/properties/components/PropertyHistory";
import { PropertyMaintenanceTab } from "@/features/properties/components/PropertyMaintenanceTab";
import { PropertyInvoicesTab } from "@/features/properties/components/PropertyInvoicesTab";
import { PropertyLeasesTab } from "@/features/properties/components/PropertyLeasesTab";
import { PropertyBillingTab } from "@/features/properties/components/PropertyBillingTab";
import { PropertyAgreementsTab } from "@/features/properties/components/PropertyAgreementsTab";
import { PropertyVacationNoticesTab } from "@/features/properties/components/PropertyVacationNoticesTab";
import { PropertySettingsTab } from "@/features/properties/components/PropertySettingsTab";
import PropertyBillingConfig from "@/features/properties/components/PropertyBillingConfig";
import { AddTenantToPropertyDialog } from "@/features/properties/components/AddTenantToPropertyDialog";

import { WaterBillingManager } from "@/features/water/components/WaterBillingManager";
import { PropertyStatementTab } from "@/features/properties/components/PropertyStatementTab";
import PropertyCollectionStatement from "@/features/properties/components/PropertyCollectionStatement";

interface Property {
  id: string;
  name: string;
  address: string;
  house_number: string | null;
  units: number;
  occupied: number;
  revenue: number;
  image_url: string | null;
  created_at: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  unit: string | null;
  status: string;
  photo_url: string | null;
  move_in_date: string | null;
}

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

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  inactive: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  expiring: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  expired: "bg-red-500/10 text-red-600 border-red-500/20",
};

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const { can, is } = useRBAC();
  // Permission gates for submanagers
  const canWrite           = is('manager') || can('edit_tenants');
  const canRecordPayments  = is('manager') || can('record_payments');
  const canManageMaint     = is('manager') || can('manage_maintenance');
  const canSendNotices     = is('manager') || can('send_notices');
  const canCreateInvoices  = is('manager') || can('create_invoices');
  const canApproveMoveouts = is('manager') || can('approve_moveouts');
    // Get initial tab from URL query param
  const initialTab = searchParams.get('tab') || 'units';

  const [property, setProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Assign tenant dialog
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [assignUnit, setAssignUnit] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Add tenant dialog
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);

  const generateSignedUrls = async (tenantsList: Tenant[]) => {
    const urlMap: Record<string, string> = {};

    for (const tenant of tenantsList) {
      if (tenant.photo_url) {
        let filePath = tenant.photo_url;
        if (filePath.includes("/tenant-photos/")) {
          filePath = filePath.split("/tenant-photos/").pop() || filePath;
        }

        const { data, error } = await supabase.storage
          .from("tenant-photos")
          .createSignedUrl(filePath, 3600);

        if (data && !error) {
          urlMap[tenant.id] = data.signedUrl;
        }
      }
    }

    setSignedUrls(urlMap);
  };

  const fetchPropertyData = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);

    // Fetch property
    const { data: propertyData, error: propertyError } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (propertyError || !propertyData) {
      toast({
        title: "Error",
        description: "Property not found",
        variant: "destructive",
      });
      navigate("/properties");
      return;
    }

    setProperty(propertyData);

    // Fetch related data in parallel
    const [tenantsRes, leasesRes, allTenantsRes] = await Promise.all([
      supabase.from("tenants").select("*").eq("property_id", id).order("name"),
      supabase.from("leases").select("*").eq("property_id", id).order("unit"),
      supabase.from("tenants").select("*").is("property_id", null).eq("status", "active").order("name"),
    ]);

    if (tenantsRes.data) {
      setTenants(tenantsRes.data);
      generateSignedUrls(tenantsRes.data);
    }

    if (leasesRes.data) {
      setLeases(leasesRes.data);
    }

    if (allTenantsRes.data) {
      setAllTenants(allTenantsRes.data);
    }

    setIsLoading(false);
  }, [id, toast, navigate]);

  useEffect(() => {
    fetchPropertyData();
  }, [fetchPropertyData, id]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUnitsWithTenants = () => {
    const unitMap = new Map<string, { tenant: Tenant | null; lease: Lease | null }>();

    // Initialize units from leases
    leases.forEach((lease) => {
      const tenant = tenants.find((t) => t.id === lease.tenant_id);
      unitMap.set(lease.unit, { tenant: tenant || null, lease });
    });

    // Add tenants with units but no matching lease
    tenants.forEach((tenant) => {
      if (tenant.unit && !unitMap.has(tenant.unit)) {
        unitMap.set(tenant.unit, { tenant, lease: null });
      }
    });

    // Generate empty units for remaining capacity
    const totalUnits = property?.units || 0;
    const existingUnits = unitMap.size;
    
    if (existingUnits < totalUnits) {
      for (let i = 1; i <= totalUnits; i++) {
        const unitName = `Unit ${i}`;
        if (!unitMap.has(unitName) && ![...unitMap.keys()].some(k => k.includes(i.toString()))) {
          unitMap.set(unitName, { tenant: null, lease: null });
        }
      }
    }

    return Array.from(unitMap.entries()).sort((a, b) => {
      // Try to sort numerically if possible
      const numA = parseInt(a[0].replace(/\D/g, "")) || 0;
      const numB = parseInt(b[0].replace(/\D/g, "")) || 0;
      return numA - numB || a[0].localeCompare(b[0]);
    });
  };

  const handleAssignTenant = async () => {
    if (!selectedTenantId || !assignUnit.trim() || !property) {
      toast({
        title: "Error",
        description: "Please select a tenant and enter a unit number",
        variant: "destructive",
      });
      return;
    }

    setIsAssigning(true);

    try {
      const unitNumber = assignUnit.trim();
      let unitId: string | null = null;
      const { data: existingUnit, error: lookupError } = await supabase
        .from("units")
        .select("id")
        .eq("property_id", property.id)
        .eq("unit_number", unitNumber)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (existingUnit) {
        unitId = existingUnit.id;
        const { error: updateUnitError } = await supabase
          .from("units")
          .update({ status: "occupied" })
          .eq("id", unitId);
        if (updateUnitError) throw updateUnitError;
      } else {
        const { data: newUnit, error: createUnitError } = await supabase
          .from("units")
          .insert({ property_id: property.id, unit_number: unitNumber, status: "occupied" })
          .select("id")
          .single();
        if (createUnitError) throw createUnitError;
        unitId = newUnit.id;
      }

      const { error } = await supabase
        .from("tenants")
        .update({
          property_id: property.id,
          property: property.name,
          unit: unitNumber,
          unit_id: unitId,
        })
        .eq("id", selectedTenantId);
      if (error) throw error;

      const { count } = await supabase
        .from("units")
        .select("id", { count: "exact", head: true })
        .eq("property_id", property.id)
        .eq("status", "occupied");
      if (count !== null) {
        await supabase.from("properties").update({ occupied: count }).eq("id", property.id);
      }

      toast({
        title: "Tenant Assigned",
        description: "Tenant has been assigned to this property successfully.",
      });
      setIsAssignDialogOpen(false);
      setSelectedTenantId("");
      setAssignUnit("");
      fetchPropertyData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign tenant",
        variant: "destructive",
      });
    }

    setIsAssigning(false);
  };

  const handleRemoveTenant = async (tenantId: string) => {
    const { error } = await supabase
      .from("tenants")
      .update({
        property_id: null,
        property: null,
        unit: null,
        unit_id: null,
      })
      .eq("id", tenantId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove tenant from property",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Tenant Removed",
        description: "Tenant has been removed from this property.",
      });
      fetchPropertyData();
    }
  };

  if (isLoading) {
    return (
      <Layout title="Property Details" subtitle="Loading...">
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!property) {
    return null;
  }

  const occupancyRate = property.units > 0 ? Math.round((property.occupied / property.units) * 100) : 0;
  const unitsData = getUnitsWithTenants();

  return (
    <Layout
      title={property.name}
      subtitle={property.address}
      headerActions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/properties")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>
          <Button onClick={() => setIsAddTenantOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </div>
      }
    >
      {/* Property Overview */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {property.image_url ? (
                  <img
                    src={property.image_url}
                    alt={property.name}
                    className="h-20 w-20 object-cover"
                  />
                ) : (
                  <Building2 className="h-10 w-10 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-1">{property.name}</CardTitle>
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <MapPin className="h-4 w-4" />
                  {property.address}
                </p>
                {property.house_number && (
                  <p className="text-muted-foreground flex items-center gap-1 text-sm mt-0.5">
                    <Hash className="h-4 w-4" />
                    House No: {property.house_number}
                  </p>
                )}
                {/* Category + amenity badges */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(property as {category_key?: string}).category_key && (
                    <Badge variant="outline" className="text-xs">
                      {(() => {
                        const k = (property as {category_key?: string}).category_key as string;
                        return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      })()}
                    </Badge>
                  )}
                  {(property as {is_gated?: boolean}).is_gated && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">🛡 Gated</Badge>
                  )}
                  {(property as {has_lift?: boolean}).has_lift && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">🛗 Lift</Badge>
                  )}
                  {(property as {has_backup_power?: boolean}).has_backup_power && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">⚡ Generator</Badge>
                  )}
                  {(property as {has_borehole?: boolean}).has_borehole && (
                    <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-200">💧 Borehole</Badge>
                  )}
                  {(property as {is_furnished_units?: boolean}).is_furnished_units && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">🪑 Furnished</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Home className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Units</span>
                </div>
                <p className="text-2xl font-bold">{property.units}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium">Occupied</span>
                </div>
                <p className="text-2xl font-bold">{property.occupied}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs font-medium">Occupancy</span>
                </div>
                <p className={cn(
                  "text-2xl font-bold",
                  occupancyRate >= 90 && "text-emerald-600",
                  occupancyRate >= 70 && occupancyRate < 90 && "text-amber-600",
                  occupancyRate < 70 && "text-red-600"
                )}>
                  {occupancyRate}%
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs font-medium">Revenue</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(property.revenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Active Tenants</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {tenants.filter((t) => t.status === "active").length}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Active Leases</span>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                {leases.filter((l) => l.status === "active").length}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Vacant Units</span>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                {property.units - property.occupied}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Expiring Leases</span>
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                {leases.filter((l) => l.status === "expiring").length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Property Details */}
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="units" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Houses
          </TabsTrigger>
          <TabsTrigger value="tenants" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Tenants
          </TabsTrigger>
          <TabsTrigger value="leases" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Leases
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="agreements" className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Agreements
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="vacation" className="flex items-center gap-2">
            <CalendarX className="h-4 w-4" />
            Vacation
          </TabsTrigger>
          <TabsTrigger value="water" className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            Water
          </TabsTrigger>
          <TabsTrigger value="statement" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Statement
          </TabsTrigger>
          <TabsTrigger value="landlord" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Landlord
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="units">
          <UnitManagement 
            propertyId={property.id} 
            propertyName={property.name}
            houseLabelPrefix={(property as {house_label_prefix?: string}).house_label_prefix || ""}
            onUnitsChange={fetchPropertyData}
          />
        </TabsContent>

        <TabsContent value="tenants">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                Tenants & Leases
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unitsData.length === 0 ? (
                <div className="text-center py-12">
                  <Home className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No tenants assigned to this property</p>
                  <div className="flex justify-center gap-2 mt-4">
                    <Button onClick={() => setIsAddTenantOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Tenant
                    </Button>
                    <Button variant="outline" onClick={() => setIsAssignDialogOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Existing
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Lease Status</TableHead>
                      <TableHead>Rent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unitsData.map(([unit, { tenant, lease }]) => (
                      <TableRow key={unit}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-medium",
                              tenant ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                            )}>
                              <Home className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{unit}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {tenant ? (
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={signedUrls[tenant.id]} alt={tenant.name} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {getInitials(tenant.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{tenant.name}</p>
                                {tenant.move_in_date && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Since {format(new Date(tenant.move_in_date), 'dd/MM/yy')}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm italic">Vacant</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {tenant ? (
                            <div className="space-y-1">
                              <p className="text-xs flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {tenant.email}
                              </p>
                              {tenant.phone && (
                                <p className="text-xs flex items-center gap-1 text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {tenant.phone}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lease ? (
                            <Badge
                              variant="outline"
                              className={cn("capitalize", statusStyles[lease.status] || statusStyles.inactive)}
                            >
                              {lease.status}
                            </Badge>
                          ) : tenant ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-500/20 bg-amber-500/10">
                              No Lease
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lease ? (
                            <span className="font-medium text-emerald-600">
                              {formatCurrency(lease.monthly_rent)}/mo
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {tenant ? (
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleRemoveTenant(tenant.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setAssignUnit(unit);
                                setIsAssignDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Assign
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leases">
          <PropertyLeasesTab 
            leases={leases} 
            tenants={tenants.map(t => ({ id: t.id, name: t.name }))} 
          />
        </TabsContent>

        <TabsContent value="billing">
          <div className="space-y-6">
            <PropertyBillingConfig propertyId={property.id} propertyName={property.name} />
            <PropertyBillingTab propertyId={property.id} propertyName={property.name} />
          </div>
        </TabsContent>

        <TabsContent value="agreements">
          <PropertyAgreementsTab propertyId={property.id} propertyName={property.name} />
        </TabsContent>

        <TabsContent value="maintenance">
          <PropertyMaintenanceTab propertyName={property.name} />
        </TabsContent>

        <TabsContent value="vacation">
          <PropertyVacationNoticesTab propertyId={property.id} propertyName={property.name} />
        </TabsContent>

        <TabsContent value="water">
          <WaterBillingManager propertyId={property.id} propertyName={property.name} />
        </TabsContent>

        <TabsContent value="statement">
          <div className="space-y-6">
            <PropertyCollectionStatement propertyId={property.id} propertyName={property.name} />
            <PropertyStatementTab propertyId={property.id} propertyName={property.name} />
          </div>
        </TabsContent>

        <TabsContent value="landlord">
          <PropertyLandlordTab propertyId={property.id} />
        </TabsContent>

        <TabsContent value="settings">
          <PropertySettingsTab propertyId={property.id} propertyName={property.name} />
        </TabsContent>

        <TabsContent value="history">
          <PropertyHistory propertyId={property.id} />
        </TabsContent>
      </Tabs>

      {/* Add Tenant Dialog */}
      <AddTenantToPropertyDialog
        propertyId={property.id}
        propertyName={property.name}
        isOpen={isAddTenantOpen}
        onOpenChange={setIsAddTenantOpen}
        onTenantAdded={fetchPropertyData}
      />

      {/* Assign Existing Tenant Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Existing Tenant</DialogTitle>
            <DialogDescription>
              Select an unassigned tenant and assign them to a unit in {property.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tenant">Tenant</Label>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {allTenants.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No unassigned tenants available
                    </SelectItem>
                  ) : (
                    allTenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit Number</Label>
              <Input
                id="unit"
                value={assignUnit}
                onChange={(e) => setAssignUnit(e.target.value)}
                placeholder="e.g., Unit 1, A101, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTenant} disabled={isAssigning || !selectedTenantId}>
              {isAssigning ? "Assigning..." : "Assign Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default PropertyDetail;
