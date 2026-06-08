import { useState, useEffect, useCallback, Fragment } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Plus, MapPin, Users, User, UserPlus, DollarSign, Building, Pencil, Trash2, ChevronDown, Building2, Phone, Mail, Search, ArrowUpDown, CheckSquare, Square, X, Eye, Layers } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { ImageUpload } from "@/shared/components/ui/image-upload";
import { useToast } from "@/shared/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { propertySchema, formatValidationErrors } from "@/shared/lib/validations";
import { useActivityLog } from "@/shared/hooks/useActivityLog";
import { useViewOnly } from "@/shared/contexts/ViewOnlyContext";
import { useQuery } from "@tanstack/react-query";
import { CATEGORY_BY_KEY, CATEGORIES_BY_GROUP, GROUP_LABELS, PROPERTY_CATEGORIES } from "@/shared/constants/propertyTypes";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { useManagerScope } from "@/shared/hooks/useManagerScope";

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
  updated_at: string;
  category_key?: string;
  property_type?: string;
  number_of_floors?: number;
  rent_per_house?: number;
  house_label_prefix?: string;
  payment_details?: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  unit: string | null;
  property_id: string | null;
  status: string;
}

const Properties = () => {
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const { isViewOnly } = useViewOnly();
  const { managerId, restrictToAssignedProperties, assignedPropertyIds } = useManagerScope();

  // Check property limit from subscription tier
  const { data: subProfile } = useQuery({
    queryKey: ['manager-sub-profile', managerId],
    queryFn: async () => {
      const { data } = await (supabase.from('manager_profiles')
        .select('max_properties, property_count, subscription_tier')
        .eq('manager_user_id', managerId!).maybeSingle());
      return data as {max_properties?: number; property_count?: number; subscription_tier?: string} | null;
    },
    enabled: !!managerId,
  });
  const atPropertyLimit = subProfile
    ? (subProfile.property_count ?? 0) >= (subProfile.max_properties ?? 5)
    : false;
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newProperty, setNewProperty] = useState({
    name: "",
    address: "",
    house_number: "",
    house_label_prefix: "",
    units: "",
    image_url: "",
    property_type: "flat",
    number_of_floors: "",
    rent_per_house: "",
    payment_details: "",
  });

  // Edit state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editProperty, setEditProperty] = useState<Property | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    address: "",
    house_number: "",
    house_label_prefix: "",
    units: "",
    occupied: "",
    revenue: "",
    image_url: "",
    property_type: "flat",
    number_of_floors: "",
    rent_per_house: "",
    payment_details: "",
  });

  // Delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteProperty, setDeleteProperty] = useState<Property | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Occupancy filter state
  const [filterOccupancy, setFilterOccupancy] = useState<string>("all");

  // Sort state
  const [sortBy, setSortBy] = useState<"name" | "units" | "occupancy" | "revenue">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchData = useCallback(async () => {
    if (!managerId) {
      setProperties([]);
      setTenants([]);
      setIsLoading(false);
      return;
    }
    if (restrictToAssignedProperties && assignedPropertyIds.length === 0) {
      setProperties([]);
      setTenants([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let propertiesQuery = supabase
        .from("properties")
        .select("*")
        .eq("manager_id", managerId)
        .neq("status", "inactive")
        .order("created_at", { ascending: false });
      let tenantsQuery = supabase
        .from("tenants")
        .select("id, name, email, unit, property_id, status")
        .eq("manager_id", managerId)
        .order("name", { ascending: true });

      if (restrictToAssignedProperties) {
        propertiesQuery = propertiesQuery.in("id", assignedPropertyIds);
        tenantsQuery = tenantsQuery.in("property_id", assignedPropertyIds);
      }

      const [propertiesRes, tenantsRes] = await Promise.all([
        propertiesQuery,
        tenantsQuery,
      ]);

      if (propertiesRes.error) {
        toast({ title: "Error", description: propertiesRes.error.message || "Failed to fetch properties", variant: "destructive" });
      } else {
        setProperties(propertiesRes.data || []);
      }

      if (!tenantsRes.error) {
        setTenants(tenantsRes.data || []);
      }
    } catch (err) {
      console.error('[Properties] fetchData error:', err);
      toast({ title: "Error", description: "Failed to load data. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [assignedPropertyIds, managerId, restrictToAssignedProperties, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddProperty = async () => {
    if (!managerId) {
      toast({
        title: "Error",
        description: "You must be signed in to add a property.",
        variant: "destructive",
      });
      return;
    }

    const validationResult = propertySchema.safeParse(newProperty);
    if (!validationResult.success) {
      toast({ title: "Validation Error", description: formatValidationErrors(validationResult.error), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("properties").insert({
      name: validationResult.data.name,
      address: validationResult.data.address,
      house_number: newProperty.house_number.trim() || null,
      house_label_prefix: newProperty.house_label_prefix.trim() || null,
      units: validationResult.data.units ? parseInt(validationResult.data.units) : 0,
      occupied: 0,
      revenue: 0,
      image_url: validationResult.data.image_url || null,
      manager_id: managerId,
      property_type: newProperty.property_type || 'flat',
      number_of_floors: newProperty.number_of_floors ? parseInt(newProperty.number_of_floors) : 1,
      rent_per_house: newProperty.rent_per_house ? parseFloat(newProperty.rent_per_house) : 0,
      payment_details: newProperty.payment_details.trim() || null,
      created_at: now,
      updated_at: now,
      status: 'active',
    });

    if (error) {
      const detail = error.details ? ` (${error.details})` : '';
      const hint = error.hint ? ` Hint: ${error.hint}` : '';
      toast({
        title: "Property creation failed",
        description: `${error.message}${detail}${hint}`,
        variant: "destructive",
      });
    } else {
      toast({ title: "Property Added", description: `${validationResult.data.name} has been added successfully.` });
      logActivity({
        action: 'Created property',
        entityType: 'property',
        details: { name: validationResult.data.name, address: validationResult.data.address }
      });
      setNewProperty({ name: "", address: "", house_number: "", house_label_prefix: "", units: "",     image_url: "",
    property_type: "flat", number_of_floors: "", rent_per_house: "", payment_details: "" });
      setIsDialogOpen(false);
      fetchData();
    }
    setIsSaving(false);
  };

  const openEditDialog = (property: Property) => {
    setEditProperty(property);
    setEditFormData({
      name: property.name,
      address: property.address,
      house_number: property.house_number || "",
      house_label_prefix: property.house_label_prefix || "",
      units: property.units.toString(),
      occupied: property.occupied.toString(),
      revenue: property.revenue.toString(),
      image_url: property.image_url || "",
      property_type: property.property_type || "flat",
      number_of_floors: property.number_of_floors?.toString() || "1",
      rent_per_house: property.rent_per_house?.toString() || "0",
      payment_details: property.payment_details || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProperty = async () => {
    if (!editProperty) return;

    const validationResult = propertySchema.safeParse({
      name: editFormData.name,
      address: editFormData.address,
      units: editFormData.units,
      image_url: editFormData.image_url,
    });
    if (!validationResult.success) {
      toast({ title: "Validation Error", description: formatValidationErrors(validationResult.error), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("properties")
      .update({
        name: validationResult.data.name,
        address: validationResult.data.address,
        house_number: editFormData.house_number.trim() || null,
        house_label_prefix: editFormData.house_label_prefix.trim() || null,
        units: validationResult.data.units ? parseInt(validationResult.data.units) : 0,
        occupied: parseInt(editFormData.occupied) || 0,
        revenue: parseFloat(editFormData.revenue) || 0,
        image_url: validationResult.data.image_url || null,
        property_type: editFormData.property_type || 'flat',
        number_of_floors: editFormData.number_of_floors ? parseInt(editFormData.number_of_floors) : 1,
        rent_per_house: editFormData.rent_per_house ? parseFloat(editFormData.rent_per_house) : 0,
        payment_details: editFormData.payment_details.trim() || null,
        updated_at: now,
      })
      .eq("id", editProperty.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update property", variant: "destructive" });
    } else {
      toast({ title: "Property Updated", description: `${validationResult.data.name} has been updated successfully.` });
      logActivity({
        action: 'Updated property',
        entityType: 'property',
        entityId: editProperty.id,
        details: { name: validationResult.data.name }
      });
      setIsEditDialogOpen(false);
      setEditProperty(null);
      fetchData();
    }
    setIsSaving(false);
  };

  const openDeleteDialog = (property: Property) => {
    setDeleteProperty(property);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteProperty = async () => {
    if (!deleteProperty) return;

    setIsDeleting(true);
    const { error } = await supabase.from("properties").update({ status: 'inactive' }).eq("id", deleteProperty.id);

    if (error) {
      toast({ title: "Error", description: "Failed to deactivate property", variant: "destructive" });
    } else {
      toast({ title: "Property Deactivated", description: `${deleteProperty.name} has been deactivated and moved to history.` });
      logActivity({
        action: 'Deactivated property',
        entityType: 'property',
        entityId: deleteProperty.id,
        details: { name: deleteProperty.name }
      });
      if (managerId) supabase.rpc('refresh_manager_stats', { p_manager_id: managerId }).catch(() => {});
      fetchData();
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
    setDeleteProperty(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter properties based on search query
  const getFilteredProperties = () => {
    let filtered = properties;
    
    // Apply occupancy filter
    if (filterOccupancy !== "all") {
      filtered = filtered.filter(property => {
        const rate = property.units > 0 ? (property.occupied / property.units) * 100 : 0;
        switch (filterOccupancy) {
          case "empty": return rate === 0;
          case "low": return rate > 0 && rate < 50;
          case "medium": return rate >= 50 && rate < 80;
          case "high": return rate >= 80 && rate < 100;
          case "full": return rate === 100;
          default: return true;
        }
      });
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(property =>
        property.name.toLowerCase().includes(query) ||
        property.address.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "units":
          comparison = a.units - b.units;
          break;
        case "occupancy": {
          const occA = a.units > 0 ? a.occupied / a.units : 0;
          const occB = b.units > 0 ? b.occupied / b.units : 0;
          comparison = occA - occB;
          break;
        }
        case "revenue":
          comparison = a.revenue - b.revenue;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  };

  const handleQuickAssignTenant = async (tenantId: string, propertyId: string, propertyName: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    const { error } = await supabase
      .from("tenants")
      .update({
        property_id: propertyId,
        property: propertyName,
      })
      .eq("id", tenantId);

    if (error) {
      toast({ title: "Error", description: "Failed to assign tenant", variant: "destructive" });
    } else {
      toast({ title: "Tenant Assigned", description: `${tenant.name} assigned to ${propertyName}` });
      fetchData();
    }
  };

  const handleUnassignTenant = async (tenantId: string, tenantName: string, propertyName: string) => {
    const { error } = await supabase
      .from("tenants")
      .update({
        property_id: null,
        property: null,
      })
      .eq("id", tenantId);

    if (error) {
      toast({ title: "Error", description: "Failed to unassign tenant", variant: "destructive" });
    } else {
      toast({ title: "Tenant Unassigned", description: `${tenantName} removed from ${propertyName}` });
      fetchData();
    }
  };


  return (
    <Layout title="Properties" subtitle="Manage your property portfolio">
      {/* Clean toolbar */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm bg-background border-border"
            />
          </div>

          {/* Filters dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" />
                Filters
                {filterOccupancy !== "all" && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">1</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Sort By</Label>
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                  const [field, order] = value.split("-") as [typeof sortBy, typeof sortOrder];
                  setSortBy(field);
                  setSortOrder(order);
                }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="units-desc">Units (High-Low)</SelectItem>
                    <SelectItem value="occupancy-desc">Occupancy (High-Low)</SelectItem>
                    <SelectItem value="revenue-desc">Revenue (High-Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Occupancy</Label>
                <Select value={filterOccupancy} onValueChange={setFilterOccupancy}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="empty">Empty (0%)</SelectItem>
                    <SelectItem value="low">Low (&lt;50%)</SelectItem>
                    <SelectItem value="medium">Medium (50-79%)</SelectItem>
                    <SelectItem value="high">High (80-99%)</SelectItem>
                    <SelectItem value="full">Full (100%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filterOccupancy !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => setFilterOccupancy("all")}
                >
                  Clear Filters
                </Button>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          {/* Action buttons */}
          <Button
            size="sm"
            className="h-9 bg-primary hover:bg-primary/90"
            onClick={() => atPropertyLimit
              ? toast({ title: 'Property limit reached', description: `Your ${subProfile?.subscription_tier ?? 'Starter'} plan allows ${subProfile?.max_properties ?? 5} properties. Upgrade at Platform Billing to add more.`, variant: 'destructive' })
              : setIsDialogOpen(true)
            }
            title={atPropertyLimit ? `Limit reached — upgrade to add more properties` : 'Add a new property'}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Property
            {atPropertyLimit && <span className="ml-1 text-xs opacity-75">(limit reached)</span>}
          </Button>
        </div>

        {/* Summary line */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{getFilteredProperties().length} properties</span>
          <span>·</span>
          <span>{getFilteredProperties().reduce((sum, p) => sum + p.units, 0)} total units</span>
          <span>·</span>
          <span>{formatCurrency(getFilteredProperties().reduce((sum, p) => sum + p.revenue, 0))} revenue</span>
        </div>
      </div>
      {/* Add Property Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground">Add New Property</DialogTitle>
            <DialogDescription>Enter the property details to add it to your portfolio.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Property Name *</Label>
              <Input id="name" value={newProperty.name} onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })} placeholder="Sunset Apartments" className="bg-background border-border" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address *</Label>
              <Input id="address" value={newProperty.address} onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })} placeholder="1234 Main St, City, State ZIP" className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="property-type">Property Type</Label>
                <Select value={newProperty.property_type} onValueChange={(value) => setNewProperty({ ...newProperty, property_type: value })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES_BY_GROUP).map(([group, cats]) => (
                      <Fragment key={group}>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/50 mt-1">
                          {GROUP_LABELS[group]}
                        </div>
                        {cats.map(cat => (
                          <SelectItem key={cat.key} value={cat.key}>
                            <div className="flex items-center justify-between w-full gap-3">
                              <span>{cat.name}</span>
                              {cat.requiresTier !== 'lite' && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cat.requiresTier === 'enterprise' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {cat.requiresTier === 'enterprise' ? 'Enterprise' : 'Pro+'}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="floors">Number of Floors</Label>
                <Input id="floors" type="number" min="1" value={newProperty.number_of_floors} onChange={(e) => setNewProperty({ ...newProperty, number_of_floors: e.target.value })} placeholder="e.g., 3" className="bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="units">Number of Units</Label>
                <Input id="units" type="number" value={newProperty.units} onChange={(e) => setNewProperty({ ...newProperty, units: e.target.value })} placeholder="24" className="bg-background border-border" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rent-per-house">Rent Per House</Label>
                <Input id="rent-per-house" type="number" min="0" value={newProperty.rent_per_house} onChange={(e) => setNewProperty({ ...newProperty, rent_per_house: e.target.value })} placeholder="e.g., 15000" className="bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="house-number">House Number</Label>
                <Input id="house-number" value={newProperty.house_number} onChange={(e) => setNewProperty({ ...newProperty, house_number: e.target.value })} placeholder="e.g., B12, Plot 45" className="bg-background border-border" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="house-label-prefix">House Label Prefix</Label>
                <Input id="house-label-prefix" value={newProperty.house_label_prefix} onChange={(e) => setNewProperty({ ...newProperty, house_label_prefix: e.target.value })} placeholder="e.g., HSE, APT" className="bg-background border-border" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-details">Payment Details</Label>
              <Input id="payment-details" value={newProperty.payment_details} onChange={(e) => setNewProperty({ ...newProperty, payment_details: e.target.value })} placeholder="e.g., Pay via M-Pesa to 123456" className="bg-background border-border" />
              <p className="text-xs text-muted-foreground">Payment instructions shown to tenants</p>
            </div>
            <ImageUpload
              value={newProperty.image_url}
              onChange={(url) => setNewProperty({ ...newProperty, image_url: url })}
              bucket="property-images"
              label="Property Image"
              placeholder="Upload or paste image URL"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleAddProperty} className="bg-primary hover:bg-primary/90" disabled={isSaving}>{isSaving ? "Adding..." : "Add Property"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Properties grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading properties...</div>
      ) : getFilteredProperties().length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? `No properties found matching "${searchQuery}"` : "No properties found. Add your first property to get started."}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {getFilteredProperties().map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              index={index}
              tenants={tenants}
              isSelected={false}
              formatCurrency={formatCurrency}
              onEdit={openEditDialog}
              onDelete={openDeleteDialog}
            />
          ))}
        </div>
      )}

      {/* Edit Property Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground">Edit Property</DialogTitle>
            <DialogDescription>Update the property information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Property Name *</Label>
              <Input id="edit-name" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} placeholder="Sunset Apartments" className="bg-background border-border" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address *</Label>
              <Input id="edit-address" value={editFormData.address} onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })} placeholder="1234 Main St, City, State ZIP" className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-house-number">House Number</Label>
                <Input id="edit-house-number" value={editFormData.house_number} onChange={(e) => setEditFormData({ ...editFormData, house_number: e.target.value })} placeholder="e.g., B12, Plot 45" className="bg-background border-border" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-house-label-prefix">House Label Prefix</Label>
                <Input id="edit-house-label-prefix" value={editFormData.house_label_prefix} onChange={(e) => setEditFormData({ ...editFormData, house_label_prefix: e.target.value })} placeholder="e.g., HSE, APT, Villa" className="bg-background border-border" />
                <p className="text-xs text-muted-foreground">Units will be labeled as PREFIX-001, PREFIX-002, etc.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-units">Units</Label>
                <Input id="edit-units" type="number" value={editFormData.units} onChange={(e) => setEditFormData({ ...editFormData, units: e.target.value })} className="bg-background border-border" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-occupied">Occupied</Label>
                <Input id="edit-occupied" type="number" value={editFormData.occupied} onChange={(e) => setEditFormData({ ...editFormData, occupied: e.target.value })} className="bg-background border-border" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-revenue">Revenue</Label>
                <Input id="edit-revenue" type="number" value={editFormData.revenue} onChange={(e) => setEditFormData({ ...editFormData, revenue: e.target.value })} className="bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-property-type">Property Type</Label>
                <Select value={editFormData.property_type} onValueChange={(value) => setEditFormData({ ...editFormData, property_type: value })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="bungalow">Bungalow</SelectItem>
                    <SelectItem value="mixed_use">Mixed Use</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-floors">Number of Floors</Label>
                <Input id="edit-floors" type="number" min="1" value={editFormData.number_of_floors} onChange={(e) => setEditFormData({ ...editFormData, number_of_floors: e.target.value })} placeholder="e.g., 3" className="bg-background border-border" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-rent-per-house">Rent Per House</Label>
              <Input id="edit-rent-per-house" type="number" min="0" value={editFormData.rent_per_house} onChange={(e) => setEditFormData({ ...editFormData, rent_per_house: e.target.value })} placeholder="e.g., 15000" className="bg-background border-border" />
              <p className="text-xs text-muted-foreground">Default rent amount per house/unit</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-payment-details">Payment Details</Label>
              <Input id="edit-payment-details" value={editFormData.payment_details} onChange={(e) => setEditFormData({ ...editFormData, payment_details: e.target.value })} placeholder="e.g., Pay via M-Pesa to 123456, Acc: Property Name" className="bg-background border-border" />
              <p className="text-xs text-muted-foreground">Payment instructions shown to tenants</p>
            </div>
            <ImageUpload
              value={editFormData.image_url}
              onChange={(url) => setEditFormData({ ...editFormData, image_url: url })}
              bucket="property-images"
              label="Property Image"
              placeholder="Upload or paste image URL"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleUpdateProperty} className="bg-primary hover:bg-primary/90" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Deactivate Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <span className="font-semibold text-foreground">{deleteProperty?.name}</span>? The property will be moved to history and can be reactivated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProperty} disabled={isDeleting} className="bg-amber-600 text-white hover:bg-amber-700">
              {isDeleting ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Layout>
  );
};

export default Properties;
