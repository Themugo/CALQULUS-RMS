import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/shared/components/layout/Layout";
import { openSafely } from "@/shared/lib/safeWindow";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
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
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Plus,
  Search,
  FileText,
  Calendar,
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Upload,
  Download,
  ExternalLink,
  Loader2,
  Paperclip,
  Trash2,
  Receipt,
} from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { leaseSchema, formatValidationErrors } from "@/shared/lib/validations";
import { useActivityLog } from "@/shared/hooks/useActivityLog";
import { useViewOnly } from "@/shared/contexts/ViewOnlyContext";
import { formatDate } from "@/shared/lib/dateFormat";
import { logError } from "@/shared/lib/errorLogger";
import { LeaseStatements } from "@/features/leases/components/LeaseStatements";
import { useAuth } from "@/features/auth/AuthContext";
import { LeaseCard } from "@/features/leases/components/LeaseCard";

type LeaseStatus = "active" | "expiring" | "expired" | "pending" | "terminated";

interface Tenant {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
}

interface Property {
  id: string;
  name: string;
  address: string;
}

interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  monthly_rent: number | null;
  status: string;
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
  terms: string | null;
  created_at: string;
  document_url: string | null;
  tenants?: Tenant | null;
}

const statusStyles: Record<LeaseStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  expiring: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  expired: "bg-red-500/10 text-red-400 border-red-500/20",
  pending: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  terminated: "bg-red-500/10 text-red-400 border-red-500/20",
};

const statusIcons: Record<LeaseStatus, React.ReactNode> = {
  active: <CheckCircle2 className="h-4 w-4" />,
  expiring: <AlertTriangle className="h-4 w-4" />,
  expired: <XCircle className="h-4 w-4" />,
  pending: <Clock className="h-4 w-4" />,
  terminated: <XCircle className="h-4 w-4" />,
};

// Document Preview Component
const DocumentPreview = ({ documentUrl }: { documentUrl: string }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSignedUrl = async () => {
      try {
        const { getSignedUrl } = await import('@/shared/lib/storageUtils');
        const url = await getSignedUrl(documentUrl);
        setSignedUrl(url);
      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    loadSignedUrl();
  }, [documentUrl]);

  if (isLoading) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPdf = documentUrl.toLowerCase().includes('.pdf');

  if (isPdf) {
    return (
      <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">PDF Document</p>
        {signedUrl && (
          <Button
            variant="link"
            size="sm"
            className="text-primary mt-1"
            onClick={() => openSafely(signedUrl)}
          >
            Click to view
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="h-[200px] flex items-center justify-center p-2">
      {signedUrl ? (
        <img
          src={signedUrl}
          alt="Lease document"
          className="max-h-full max-w-full object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => openSafely(signedUrl)}
        />
      ) : (
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Could not load preview</p>
        </div>
      )}
    </div>
  );
};

const Leases = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { logActivity: _logActivity } = useActivityLog();
  const { isViewOnly } = useViewOnly();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeaseStatus | "all">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState<string | null>(null);
  const [selectedLeases, setSelectedLeases] = useState<Set<string>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [newLease, setNewLease] = useState({
    tenant_id: "",
    property_id: "",
    unit_id: "",
    unit: "",
    start_date: "",
    end_date: "",
    monthly_rent: "",
    deposit: "",
    terms: "",
  });

  const fetchLeases = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    // Try with tenant join first, fall back to plain query if FK doesn't exist
    const { data, error } = await supabase.from("leases")
      .select(`
        *,
        tenants (
          id,
          name,
          email,
          photo_url
        )
      `)
      .eq("manager_id", user.id)
      .order("created_at", { ascending: false });

    // If the join fails (FK not applied), fetch leases without the join
    if (error) {
      logError('Leases.fetchLeases.joinFailed', error);
      const fallback = await supabase
        .from("leases")
        .select("*")
        .eq("manager_id", user.id)
        .order("created_at", { ascending: false });

      if (fallback.error) {
        toast({
          title: "Error",
          description: "Failed to fetch leases",
          variant: "destructive",
        });
      } else {
        setLeases(fallback.data || []);
      }
    } else {
      setLeases(data || []);
    }
    setIsLoading(false);
  }, [toast, user]);

  const fetchTenants = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, email, photo_url")
      .eq("manager_id", user.id)
      .eq("status", "active")
      .order("name");

    if (error) {
      logError('Leases.fetchTenants', error);
    } else {
      setTenants(data || []);
    }
  }, [user]);

  const fetchProperties = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("properties")
      .select("id, name, address")
      .eq("manager_id", user.id)
      .order("name", { ascending: true });

    if (!error && data) {
      setProperties(data);
    }
  }, [user]);

  const fetchUnits = useCallback(async () => {
    if (properties.length === 0) {
      setUnits([]);
      return;
    }
    const propertyIds = properties.map((property) => property.id);
    const { data, error } = await supabase
      .from("units")
      .select("id, property_id, unit_number, monthly_rent, status")
      .in("property_id", propertyIds)
      .order("unit_number");

    if (!error && data) {
      setUnits(data as Unit[]);
    }
  }, [properties]);

  useEffect(() => {
    fetchLeases();
    fetchTenants();
    fetchProperties();
  }, [fetchLeases, fetchTenants, fetchProperties]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Filter units when property changes
  useEffect(() => {
    if (newLease.property_id) {
      const propertyUnits = units.filter(u => u.property_id === newLease.property_id);
      setFilteredUnits(propertyUnits);
    } else {
      setFilteredUnits([]);
    }
  }, [newLease.property_id, units]);

  const handlePropertyChange = (propertyId: string) => {
    const _selectedProperty = properties.find(p => p.id === propertyId);
    setNewLease({ 
      ...newLease, 
      property_id: propertyId,
      unit_id: "",
      unit: "",
      monthly_rent: ""
    });
  };

  const handleUnitChange = (unitId: string) => {
    const selectedUnit = units.find(u => u.id === unitId);
    if (selectedUnit) {
      setNewLease({
        ...newLease,
        unit_id: unitId,
        unit: selectedUnit.unit_number,
        monthly_rent: selectedUnit.monthly_rent?.toString() || newLease.monthly_rent
      });
    }
  };

  const handleCreateLease = async () => {
    // Validate input
    const validationResult = leaseSchema.safeParse(newLease);
    if (!validationResult.success) {
      toast({
        title: "Validation Error",
        description: formatValidationErrors(validationResult.error),
        variant: "destructive",
      });
      return;
    }

    const monthlyRent = parseFloat(validationResult.data.monthly_rent);
    const deposit = validationResult.data.deposit ? parseFloat(validationResult.data.deposit) : monthlyRent * 2;
    const selectedProperty = properties.find(p => p.id === validationResult.data.property_id);

    const { data: createdLease, error } = await supabase.from("leases").insert({
      tenant_id: validationResult.data.tenant_id,
      property_id: validationResult.data.property_id,
      unit_id: validationResult.data.unit_id || null,
      manager_id: user?.id ?? null,
      property: selectedProperty?.name || "",
      unit: validationResult.data.unit,
      start_date: validationResult.data.start_date,
      end_date: validationResult.data.end_date,
      monthly_rent: monthlyRent,
      deposit: deposit,
      terms: validationResult.data.terms || null,
      status: "pending",
    }).select("id").single();

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create lease",
        variant: "destructive",
      });
      return;
    }

    const selectedTenant = tenants.find((t) => t.id === validationResult.data.tenant_id);
    const { error: tenantSyncError } = await supabase
      .from("tenants")
      .update({
        property_id: validationResult.data.property_id,
        property: selectedProperty?.name || "",
        unit_id: validationResult.data.unit_id || null,
        unit: validationResult.data.unit,
        monthly_rent: monthlyRent,
        deposit_amount: deposit,
        deposit_balance: deposit,
      } as {
        property_id: string;
        property: string;
        unit_id: string | null;
        unit: string;
        monthly_rent: number;
        deposit_amount: number;
        deposit_balance: number;
      })
      .eq("id", validationResult.data.tenant_id);
    if (tenantSyncError) {
      toast({
        title: "Lease Created",
        description: `Lease ${createdLease?.id ? "created" : "saved"}, but tenant sync failed: ${tenantSyncError.message}`,
        variant: "destructive",
      });
    }

    if (validationResult.data.unit_id) {
      const { error: unitSyncError } = await supabase
        .from("units")
        .update({ status: "occupied", monthly_rent: monthlyRent })
        .eq("id", validationResult.data.unit_id);
      if (unitSyncError) {
        toast({
          title: "Lease Created",
          description: `Lease saved, but unit status sync failed: ${unitSyncError.message}`,
          variant: "destructive",
        });
      }
    }

    await supabase.rpc("sync_tenant_payment_details", {
      p_tenant_id: validationResult.data.tenant_id,
      p_manager_id: user?.id ?? null,
      p_property_id: validationResult.data.property_id || null,
      p_unit_id: validationResult.data.unit_id || null,
      p_monthly_rent: monthlyRent,
      p_house_deposit: deposit,
      p_water_deposit: null,
      p_other_charges: null,
      p_other_charges_desc: null,
      p_payment_day: 1,
      p_paybill: null,
      p_account_ref: validationResult.data.unit || null,
      p_tenancy_type: "standard",
    }).catch(() => {});

    toast({
      title: "Lease Created",
      description: `Lease agreement for ${selectedTenant?.name || "tenant"} has been created.`,
    });

    setNewLease({
      tenant_id: "",
      property_id: "",
      unit_id: "",
      unit: "",
      start_date: "",
      end_date: "",
      monthly_rent: "",
      deposit: "",
      terms: "",
    });
    setIsDialogOpen(false);
    fetchLeases();
  };

  const updateLeaseStatus = async (id: string, status: LeaseStatus) => {
    const { error } = await supabase
      .from("leases")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update lease status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Lease status updated. History recorded for tenant.",
      });
      fetchLeases();
      setIsViewDialogOpen(false);
    }
  };

  const handleUploadLeaseDocument = async (leaseId: string, file: File, tenantName?: string, tenantId?: string) => {
    setIsUploadingDoc(leaseId);
    
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png'];
      
      if (!fileExt || !allowedTypes.includes(fileExt)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image file (JPG, PNG).",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB.",
          variant: "destructive",
        });
        return;
      }

      // Sanitize tenant name for file path (remove special characters)
      const sanitizedTenantName = tenantName
        ? tenantName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        : 'unknown_tenant';
      
      // Organize files by tenant ID for better structure
      const tenantFolder = tenantId || 'unassigned';
      const fileName = `lease-${sanitizedTenantName}-${leaseId.slice(0, 8)}-${Date.now()}.${fileExt}`;
      const filePath = `leases/${tenantFolder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('signed-contracts')
        .upload(filePath, file);

      if (uploadError) {
        logError('Leases.handleUpload', uploadError);
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        return;
      }

      // Store the file path - signed URLs will be generated when viewing
      const storagePath = `signed-contracts/${filePath}`;

      const { error: updateError } = await supabase
        .from('leases')
        .update({ document_url: storagePath })
        .eq('id', leaseId);

      if (updateError) {
        toast({
          title: "Error",
          description: "Failed to save document URL.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Document uploaded",
        description: `Lease document for ${tenantName || 'tenant'} has been uploaded successfully.`,
      });
      fetchLeases();
    } catch (error) {
      logError('Leases.handleUpload', error);
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading the document.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const handleDownloadLeaseDocument = async (url: string, property: string, unit: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const extension = url.split('.').pop()?.split('?')[0] || 'pdf';
      link.download = `Lease_${property}_${unit}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Download started",
        description: "The document is being downloaded.",
      });
    } catch (error) {
      logError('Leases.handleDownload', error);
      toast({
        title: "Download failed",
        description: "Unable to download the document.",
        variant: "destructive",
      });
    }
  };

  const _handleDeleteLease = async (leaseId: string) => {
    const { error } = await supabase.from("leases").update({ status: 'terminated' as unknown as string }).eq("id", leaseId);
    if (error) {
      toast({ title: "Error", description: "Failed to deactivate lease", variant: "destructive" });
    } else {
      toast({ title: "Deactivated", description: "Lease has been deactivated and moved to history." });
      fetchLeases();
    }
  };

  const handleBulkDeleteLeases = async () => {
    if (selectedLeases.size === 0) return;
    setIsDeleting(true);
    const leaseIds = Array.from(selectedLeases);
    const { error } = await supabase.from("leases").update({ status: 'terminated' as unknown as string }).in("id", leaseIds);
    if (error) {
      toast({ title: "Error", description: "Failed to deactivate leases", variant: "destructive" });
    } else {
      toast({ title: "Deactivated", description: `${leaseIds.length} lease(s) have been deactivated.` });
      setSelectedLeases(new Set());
      fetchLeases();
    }
    setIsDeleting(false);
    setIsBulkDeleteDialogOpen(false);
  };

  const toggleLeaseSelection = (leaseId: string) => {
    setSelectedLeases(prev => {
      const next = new Set(prev);
      if (next.has(leaseId)) next.delete(leaseId);
      else next.add(leaseId);
      return next;
    });
  };

  const toggleSelectAllLeases = () => {
    if (selectedLeases.size === filteredLeases.length) {
      setSelectedLeases(new Set());
    } else {
      setSelectedLeases(new Set(filteredLeases.map(l => l.id)));
    }
  };

  const filteredLeases = leases.filter((lease) => {
    const tenantName = lease.tenants?.name || "";
    const matchesSearch = 
      tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lease.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lease.unit.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || lease.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats calculation
  const leaseStats = {
    total: leases.length,
    active: leases.filter(l => l.status === "active").length,
    expiring: leases.filter(l => l.status === "expiring").length,
    expired: leases.filter(l => l.status === "expired").length,
    pending: leases.filter(l => l.status === "pending").length,
    totalRent: leases.filter(l => l.status === "active").reduce((sum, l) => sum + l.monthly_rent, 0),
    withDocs: leases.filter(l => l.document_url).length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Layout title="Leases" subtitle="Manage lease agreements and tenant statements">
      <Tabs defaultValue="agreements" className="w-full">
        <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto grid grid-cols-2 sm:flex">
          <TabsTrigger value="agreements" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Agreements</span>
            <span className="xs:hidden">Leases</span>
          </TabsTrigger>
          <TabsTrigger value="statements" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Statements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agreements" className="space-y-4 sm:space-y-6">
          {/* Summary Stats - Scrollable on mobile */}
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 scrollbar-hide">
            <Card 
              className={`flex-shrink-0 w-[140px] sm:w-auto bg-card border-border cursor-pointer transition-all active:scale-95 sm:active:scale-100 hover:border-primary/50 ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 sm:justify-between">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                    <p className="text-lg sm:text-2xl font-bold text-foreground">{leaseStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`flex-shrink-0 w-[140px] sm:w-auto bg-card border-border cursor-pointer transition-all active:scale-95 sm:active:scale-100 hover:border-emerald-500/50 ${statusFilter === "active" ? "ring-2 ring-emerald-500" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 sm:justify-between">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Active</p>
                    <p className="text-lg sm:text-2xl font-bold text-emerald-500">{leaseStats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`flex-shrink-0 w-[140px] sm:w-auto bg-card border-border cursor-pointer transition-all active:scale-95 sm:active:scale-100 hover:border-amber-500/50 ${statusFilter === "expiring" ? "ring-2 ring-amber-500" : ""}`}
              onClick={() => setStatusFilter("expiring")}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 sm:justify-between">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Expiring</p>
                    <p className="text-lg sm:text-2xl font-bold text-amber-500">{leaseStats.expiring}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`flex-shrink-0 w-[140px] sm:w-auto bg-card border-border cursor-pointer transition-all active:scale-95 sm:active:scale-100 hover:border-slate-500/50 ${statusFilter === "pending" ? "ring-2 ring-slate-500" : ""}`}
              onClick={() => setStatusFilter("pending")}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 sm:justify-between">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-500/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Pending</p>
                    <p className="text-lg sm:text-2xl font-bold text-slate-400">{leaseStats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Filter Indicator */}
          {statusFilter !== "all" && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                Showing: {statusFilter}
                <button 
                  onClick={() => setStatusFilter("all")} 
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by tenant, property or unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-80 bg-card border-border"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
          {selectedLeases.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              disabled={isViewOnly}
              className="sm:size-default border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Deactivate</span> {selectedLeases.size}
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 sm:size-default">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Create Lease Agreement</span>
                <span className="sm:hidden">New</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-foreground text-base sm:text-lg">
                Create New Lease Agreement
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Fill in the details to create a new rental agreement.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:gap-4 py-3 sm:py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="tenant">Tenant *</Label>
                  <Select
                    value={newLease.tenant_id}
                    onValueChange={(value) =>
                      setNewLease({ ...newLease, tenant_id: value })
                    }
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No tenants available
                        </SelectItem>
                      ) : (
                        tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={tenant.photo_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {tenant.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              {tenant.name}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="property">Property *</Label>
                  <Select
                    value={newLease.property_id}
                    onValueChange={handlePropertyChange}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {properties.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No properties available
                        </SelectItem>
                      ) : (
                        properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="unit" className="text-sm">Unit *</Label>
                  {!newLease.property_id ? (
                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                      <span>Select property first</span>
                    </div>
                  ) : filteredUnits.length === 0 ? (
                    // No units in database - allow manual entry
                    <Input
                      id="unit"
                      value={newLease.unit}
                      onChange={(e) => setNewLease({ ...newLease, unit: e.target.value })}
                      placeholder="e.g., A101, Unit 1"
                      className="bg-background border-border"
                    />
                  ) : (
                    <Select
                      value={newLease.unit_id}
                      onValueChange={handleUnitChange}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {filteredUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            <div className="flex items-center justify-between gap-4">
                              <span>{unit.unit_number}</span>
                              {unit.status === "occupied" && (
                                <span className="text-xs text-amber-500">(Occupied)</span>
                              )}
                              {unit.monthly_rent && (
                                <span className="text-xs text-muted-foreground">
                                  KSh {unit.monthly_rent.toLocaleString()}/mo
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rent">Monthly Rent (KSh) *</Label>
                  <Input
                    id="rent"
                    type="number"
                    value={newLease.monthly_rent}
                    onChange={(e) =>
                      setNewLease({ ...newLease, monthly_rent: e.target.value })
                    }
                    placeholder="1500"
                    className="bg-background border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate" className="text-sm">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newLease.start_date}
                    onChange={(e) =>
                      setNewLease({ ...newLease, start_date: e.target.value })
                    }
                    className="bg-background border-border"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newLease.end_date}
                    onChange={(e) =>
                      setNewLease({ ...newLease, end_date: e.target.value })
                    }
                    className="bg-background border-border"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deposit">Security Deposit (KSh)</Label>
                <Input
                  id="deposit"
                  type="number"
                  value={newLease.deposit}
                  onChange={(e) =>
                    setNewLease({ ...newLease, deposit: e.target.value })
                  }
                  placeholder="Defaults to 2x monthly rent"
                  className="bg-background border-border"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="terms">Additional Terms</Label>
                <Textarea
                  id="terms"
                  value={newLease.terms}
                  onChange={(e) =>
                    setNewLease({ ...newLease, terms: e.target.value })
                  }
                  placeholder="Enter any additional terms and conditions..."
                  rows={3}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateLease}
                className="bg-primary hover:bg-primary/90"
              >
                Create Lease
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Select All Bar */}
      {filteredLeases.length > 0 && selectedLeases.size > 0 && (
        <div className="flex items-center justify-between gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={filteredLeases.length > 0 && selectedLeases.size === filteredLeases.length}
              onCheckedChange={toggleSelectAllLeases}
              aria-label="Select all"
            />
            <span className="text-xs sm:text-sm text-foreground font-medium">
              {selectedLeases.size} of {filteredLeases.length} selected
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedLeases(new Set())}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Leases Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 sm:py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredLeases.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No leases found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "Create your first lease agreement to get started"}
            </p>
            {statusFilter !== "all" && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setStatusFilter("all")}
              >
                Clear filter
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filteredLeases.map((lease) => (
            <LeaseCard
              key={lease.id}
              lease={lease}
              isSelected={selectedLeases.has(lease.id)}
              formatCurrency={formatCurrency}
              onSelect={() => toggleLeaseSelection(lease.id)}
              onView={() => { setSelectedLease(lease); setIsViewDialogOpen(true); }}
            />
          ))}
        </div>
      )}

      {/* View Lease Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground">
              Lease Details
            </DialogTitle>
            <DialogDescription>
              View and manage lease agreement
            </DialogDescription>
          </DialogHeader>
          {selectedLease && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedLease.tenants?.photo_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {selectedLease.tenants?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">
                    {selectedLease.tenants?.name || "No Tenant"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLease.tenants?.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Property</p>
                  <p className="font-medium text-foreground">
                    {selectedLease.property}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unit</p>
                  <p className="font-medium text-foreground">
                    {selectedLease.unit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Rent</p>
                  <p className="font-medium text-foreground">
                    {formatCurrency(selectedLease.monthly_rent)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deposit</p>
                  <p className="font-medium text-foreground">
                    {selectedLease.deposit
                      ? formatCurrency(selectedLease.deposit)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium text-foreground">
                    {formatDate(selectedLease.start_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium text-foreground">
                    {formatDate(selectedLease.end_date)}
                  </p>
                </div>
              </div>

              {selectedLease.terms && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Additional Terms
                  </p>
                  <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">
                    {selectedLease.terms}
                  </p>
                </div>
              )}

              {/* Document Attachment Section */}
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">
                  Lease Document
                </p>
                {selectedLease.document_url ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm font-medium">Document attached</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const { getSignedUrl } = await import('@/shared/lib/storageUtils');
                            const signedUrl = await getSignedUrl(selectedLease.document_url!);
                            if (signedUrl) {
                              handleDownloadLeaseDocument(signedUrl, selectedLease.property, selectedLease.unit);
                            } else {
                              toast({
                                title: "Error",
                                description: "Could not download document.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const { getSignedUrl } = await import('@/shared/lib/storageUtils');
                            const signedUrl = await getSignedUrl(selectedLease.document_url!);
                            if (signedUrl) {
                              openSafely(signedUrl);
                            } else {
                              toast({
                                title: "Error",
                                description: "Could not open document.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {/* Re-upload option */}
                        <div className="relative">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isUploadingDoc === selectedLease.id || isViewOnly}
                          >
                            {isUploadingDoc === selectedLease.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                          </Button>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadLeaseDocument(selectedLease.id, file, selectedLease.tenants?.name, selectedLease.tenants?.id);
                              e.target.value = '';
                            }}
                            disabled={isUploadingDoc === selectedLease.id || isViewOnly}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Inline Document Preview */}
                    <div className="border border-border rounded-lg overflow-hidden bg-muted/20">
                      <div className="p-2 bg-muted/30 border-b border-border flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Document Preview</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={async () => {
                            const { getSignedUrl } = await import('@/shared/lib/storageUtils');
                            const signedUrl = await getSignedUrl(selectedLease.document_url!);
                            if (signedUrl) {
                              openSafely(signedUrl);
                            }
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open Full
                        </Button>
                      </div>
                      <DocumentPreview documentUrl={selectedLease.document_url} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-muted/30 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Paperclip className="h-4 w-4" />
                      <span className="text-sm">No document attached</span>
                    </div>
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploadingDoc === selectedLease.id || isViewOnly}
                      >
                        {isUploadingDoc === selectedLease.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload
                      </Button>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadLeaseDocument(selectedLease.id, file, selectedLease.tenants?.name, selectedLease.tenants?.id);
                          e.target.value = '';
                        }}
                        disabled={isUploadingDoc === selectedLease.id || isViewOnly}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">
                  Update Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedLease.status !== "active" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => updateLeaseStatus(selectedLease.id, "active")}
                    >
                      Activate
                    </Button>
                  )}
                  {selectedLease.status !== "expired" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                      onClick={() =>
                        updateLeaseStatus(selectedLease.id, "expiring")
                      }
                    >
                      Mark Expiring
                    </Button>
                  )}
                  {selectedLease.status !== "terminated" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      onClick={() =>
                        updateLeaseStatus(selectedLease.id, "terminated")
                      }
                    >
                      Terminate
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Deactivate Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Deactivate {selectedLeases.size} Lease{selectedLeases.size > 1 ? 's' : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{" "}
              <span className="font-semibold text-foreground">
                {selectedLeases.size} lease{selectedLeases.size > 1 ? 's' : ''}
              </span>
              ? They will be moved to history and can be reactivated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteLeases}
              disabled={isDeleting}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isDeleting ? "Deactivating..." : `Deactivate ${selectedLeases.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </TabsContent>

        <TabsContent value="statements">
          <LeaseStatements />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default Leases;
