import { useState } from "react";
import { useContractsData } from "@/features/contracts/hooks/useContractsData";
import { Layout } from "@/shared/components/layout/Layout";
import { openSafely } from "@/shared/lib/safeWindow";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
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
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Plus,
  Search,
  FileText,
  CheckCircle,
  Clock,
  Send,
  Eye,
  Pencil,
  Trash2,
  FileSignature,
  Download,
  Upload,
  XCircle,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Users,
  Building,
  Mail,
  MessageCircle,
} from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { formatDate } from "@/shared/lib/dateFormat";
import { ContractEditor } from "@/features/contracts/components/ContractEditor";
import { ContractPreview } from "@/features/contracts/components/ContractPreview";
import { SignatureCanvas } from "@/features/contracts/components/SignatureCanvas";
import { QuickCreateContract } from "@/features/contracts/components/QuickCreateContract";
import { exportContractToPdf } from "@/features/contracts/lib/contractPdfExport";
import { ContractsTable } from "@/features/contracts/components/ContractsTable";
import { TenantContractsView } from "@/features/contracts/components/TenantContractsView";

type ContractStatus = "draft" | "pending_signature" | "signed" | "expired" | "cancelled";

interface Contract {
  id: string;
  template_id: string | null;
  lease_id: string | null;
  tenant_id: string;
  property_id: string | null;
  unit_id: string | null;
  title: string;
  content: string;
  status: ContractStatus;
  manager_signed_at: string | null;
  manager_signature: string | null;
  tenant_signed_at: string | null;
  tenant_signature: string | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  pending_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  uploaded_contract_url: string | null;
  tenants: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  leases: {
    property: string;
    unit: string;
  } | null;
  properties: {
    name: string;
  } | null;
  units: {
    unit_number: string;
  } | null;
}

const statusConfig: Record<ContractStatus, { label: string; styles: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: "Draft", styles: "bg-slate-600 text-white border-slate-700", icon: FileText },
  pending_signature: { label: "Pending Signature", styles: "bg-amber-500 text-white border-amber-600", icon: Clock },
  signed: { label: "Signed", styles: "bg-emerald-600 text-white border-emerald-700", icon: CheckCircle },
  expired: { label: "Expired", styles: "bg-red-600 text-white border-red-700", icon: XCircle },
  cancelled: { label: "Cancelled", styles: "bg-gray-600 text-white border-gray-700", icon: XCircle },
};

const Contracts = () => {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  
  const {
    contracts,
    templates,
    leases,
    uploadedDocuments,
    tenants,
    isLoading,
    invalidateContracts,
  } =   useContractsData();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("contracts");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Soft delete states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<string | null>(null);
  // New contract form
  const [newContract, setNewContract] = useState({
    lease_id: "",
    template_id: "",
    title: "",
    content: "",
    valid_from: "",
    valid_until: "",
  });

  const fetchData = async () => { invalidateContracts(); };

  const getFilteredContracts = () => {
    let filtered = contracts;
    
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.tenants?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.leases?.property.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const populateTemplate = async (templateContent: string, leaseId: string): Promise<string> => {
    const lease = leases.find((l) => l.id === leaseId);
    if (!lease) return templateContent;

    // Fetch company settings
    const { data: company } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    // Fetch property details
    const { data: property } = await supabase
      .from("properties")
      .select("address")
      .eq("name", lease.property)
      .maybeSingle();

    const replacements: Record<string, string> = {
      "{{company_name}}": company?.company_name || "Property Management LLC",
      "{{company_address}}": [company?.address, company?.city, company?.state, company?.zip_code].filter(Boolean).join(", ") || "N/A",
      "{{company_email}}": company?.email || "N/A",
      "{{company_phone}}": company?.phone || "N/A",
      "{{tenant_name}}": lease.tenants?.name || "N/A",
      "{{tenant_email}}": lease.tenants?.email || "N/A",
      "{{tenant_phone}}": lease.tenants?.phone || "N/A",
      "{{property_name}}": lease.property,
      "{{unit_number}}": lease.unit,
      "{{property_address}}": property?.address || "N/A",
      "{{start_date}}": format(new Date(lease.start_date), "dd/MM/yy"),
      "{{end_date}}": format(new Date(lease.end_date), "dd/MM/yy"),
      "{{monthly_rent}}": formatCurrency(lease.monthly_rent),
      "{{deposit}}": formatCurrency(lease.deposit || 0),
    };

    let content = templateContent;
    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), value);
    }
    
    return content;
  };

  const handleLeaseSelect = async (leaseId: string) => {
    const lease = leases.find((l) => l.id === leaseId);
    if (!lease) return;

    setNewContract((prev) => ({
      ...prev,
      lease_id: leaseId,
      valid_from: lease.start_date,
      valid_until: lease.end_date,
      title: `Lease Agreement - ${lease.property} Unit ${lease.unit}`,
    }));

    // If a template is selected, populate it
    if (newContract.template_id) {
      const template = templates.find((t) => t.id === newContract.template_id);
      if (template) {
        const populatedContent = await populateTemplate(template.content, leaseId);
        setNewContract((prev) => ({ ...prev, content: populatedContent }));
      }
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setNewContract((prev) => ({
      ...prev,
      template_id: templateId,
    }));

    // If a lease is selected, populate the template
    if (newContract.lease_id) {
      const populatedContent = await populateTemplate(template.content, newContract.lease_id);
      setNewContract((prev) => ({ ...prev, content: populatedContent }));
    } else {
      setNewContract((prev) => ({ ...prev, content: template.content }));
    }
  };

  const handleCreateContract = async () => {
    if (!newContract.lease_id || !newContract.title || !newContract.content) {
      toast({
        title: "Missing Information",
        description: "Please select a lease and provide contract content.",
        variant: "destructive",
      });
      return;
    }

    const lease = leases.find((l) => l.id === newContract.lease_id);
    
    const { error } = await supabase.from("contracts").insert({
      lease_id: newContract.lease_id,
      template_id: newContract.template_id || null,
      tenant_id: lease?.tenant_id,
      property_id: lease?.property_id || null,
      unit_id: lease?.unit_id || null,
      title: newContract.title,
      content: newContract.content,
      valid_from: newContract.valid_from || null,
      valid_until: newContract.valid_until || null,
      status: "draft",
    });

    if (error) {
      toast({ title: "Error", description: "Failed to create contract", variant: "destructive" });
      return;
    }

    toast({ title: "Contract Created", description: "The contract has been saved as a draft." });
    setCreateDialogOpen(false);
    setNewContract({ lease_id: "", template_id: "", title: "", content: "", valid_from: "", valid_until: "" });
    fetchData();
  };

  const handleSubmitForApproval = async (contract: Contract) => {
    const { error } = await supabase
      .from("contracts")
      .update({ pending_approval: true, rejection_reason: null })
      .eq("id", contract.id);

    if (error) {
      toast({ title: "Error", description: "Failed to submit for approval", variant: "destructive" });
      return;
    }

    toast({ 
      title: "Submitted for Approval", 
      description: "The contract has been submitted for webhost approval." 
    });
    fetchData();
  };

  const getApprovalBadge = (contract: Contract) => {
    if (contract.rejection_reason) {
      return (
        <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
          <ShieldX className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    }
    if (contract.approved_at) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    }
    if (contract.pending_approval) {
      return (
        <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Pending Approval
        </Badge>
      );
    }
    return null;
  };

  const handleSendForSignature = async (contract: Contract) => {
    // First update the contract status
    const { error } = await supabase
      .from("contracts")
      .update({ status: "pending_signature" })
      .eq("id", contract.id);

    if (error) {
      toast({ title: "Error", description: "Failed to send contract", variant: "destructive" });
      return;
    }

    // Fetch company settings for the email
    const { data: company } = await supabase
      .from("company_settings")
      .select("company_name")
      .limit(1)
      .maybeSingle();

    // Send email notification to tenant
    if (contract.tenants?.email) {
      try {
        const portalUrl = `${window.location.origin}/tenant-portal`;
        
        const { error: emailError } = await supabase.functions.invoke("send-contract-notification", {
          body: {
            tenantEmail: contract.tenants.email,
            tenantName: contract.tenants.name,
            companyName: company?.company_name || "RentFlow Properties",
            contractTitle: contract.title,
            propertyInfo: contract.leases ? `${contract.leases.property} - ${contract.leases.unit}` : "N/A",
            validFrom: contract.valid_from ? format(new Date(contract.valid_from), "dd/MM/yy") : "Not set",
            validUntil: contract.valid_until ? format(new Date(contract.valid_until), "dd/MM/yy") : "Not set",
            portalUrl,
          },
        });

        if (emailError) {
          toast({
            title: "Contract Sent",
            description: `Contract sent to ${contract.tenants.name}, but email notification failed.`,
          });
        } else {
          toast({
            title: "Contract Sent",
            description: `Contract sent to ${contract.tenants.name}. Email notification sent successfully.`,
          });
        }
      } catch {
        toast({
          title: "Contract Sent",
          description: `Contract sent to ${contract.tenants.name}, but email notification failed.`,
        });
      }
    } else {
      toast({
        title: "Contract Sent",
        description: `Contract status updated. No email sent (tenant email not available).`,
      });
    }

    fetchData();
  };

  const handleManagerSign = async (signature: string) => {
    if (!selectedContract) return;

    const { error } = await supabase
      .from("contracts")
      .update({
        manager_signature: signature,
        manager_signed_at: new Date().toISOString(),
      })
      .eq("id", selectedContract.id);

    if (error) {
      toast({ title: "Error", description: "Failed to save signature", variant: "destructive" });
      return;
    }

    toast({ title: "Signed", description: "Your signature has been added to the contract." });
    setSignDialogOpen(false);
    fetchData();
  };

  // Soft delete - request deletion (first layer authorization)
  const handleRequestDelete = (contract: Contract) => {
    setContractToDelete(contract);
    setDeleteReason("");
    setDeleteDialogOpen(true);
  };

  // Submit soft delete request
  const handleSubmitDeleteRequest = async () => {
    if (!contractToDelete) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("contracts")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        deletion_reason: deleteReason || "No reason provided",
      })
      .eq("id", contractToDelete.id);

    if (error) {
      toast({ title: "Error", description: "Failed to request deletion", variant: "destructive" });
      return;
    }

    toast({ 
      title: "Deletion Requested", 
      description: "Agreement marked for deletion. Requires confirmation from another authorized user." 
    });
    setDeleteDialogOpen(false);
    setContractToDelete(null);
    fetchData();
  };

  const handleBulkDeleteContracts = async () => {
    if (selectedContracts.size === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsDeleting(true);
    const contractIds = Array.from(selectedContracts);

    const { error } = await supabase
      .from("contracts")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        deletion_reason: "Bulk deletion request",
      })
      .in("id", contractIds);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to request deletion",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deletion Requested",
        description: `${contractIds.length} agreement(s) marked for deletion. Requires confirmation.`,
      });
      setSelectedContracts(new Set());
      fetchData();
    }

    setIsDeleting(false);
    setIsBulkDeleteDialogOpen(false);
  };

  const toggleContractSelection = (contractId: string) => {
    setSelectedContracts(prev => {
      const next = new Set(prev);
      if (next.has(contractId)) {
        next.delete(contractId);
      } else {
        next.add(contractId);
      }
      return next;
    });
  };

  const toggleSelectAllContracts = () => {
    const filtered = getFilteredContracts();
    if (selectedContracts.size === filtered.length) {
      setSelectedContracts(new Set());
    } else {
      setSelectedContracts(new Set(filtered.map(c => c.id)));
    }
  };

  const handleExportPdf = async (contract: Contract) => {
    try {
      await exportContractToPdf({
        title: contract.title,
        content: contract.content,
        valid_from: contract.valid_from,
        valid_until: contract.valid_until,
        manager_signature: contract.manager_signature,
        manager_signed_at: contract.manager_signed_at,
        tenant_signature: contract.tenant_signature,
        tenant_signed_at: contract.tenant_signed_at,
        tenantName: contract.tenants?.name,
        propertyInfo: contract.leases ? `${contract.leases.property} - ${contract.leases.unit}` : undefined,
      });
      toast({
        title: "PDF exported",
        description: "Contract has been downloaded.",
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Unable to export the contract.",
        variant: "destructive",
      });
    }
  };

  const handleUploadContract = async (contractId: string, file: File) => {
    setIsUploading(contractId);
    
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

      const fileName = `${contractId}-${Date.now()}.${fileExt}`;
      const filePath = `contracts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('signed-contracts')
        .upload(filePath, file);

      if (uploadError) {
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        return;
      }

      // Store the file path - signed URLs will be generated when viewing
      const storagePath = `signed-contracts/${filePath}`;

      // Update contract with URL and set status to pending_signature for e-signature
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ 
          uploaded_contract_url: storagePath,
          status: 'pending_signature' // Enable tenant e-signature
        })
        .eq('id', contractId);

      if (updateError) {
        toast({
          title: "Error",
          description: "Failed to save contract URL.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Contract uploaded",
        description: "The signed contract has been uploaded successfully.",
      });
      fetchData();
    } catch {
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading the contract.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(null);
    }
  };

  const handleDownloadUploadedContract = async (url: string, title: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const extension = url.split('.').pop()?.split('?')[0] || 'pdf';
      link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Download started",
        description: "The contract is being downloaded.",
      });
    } catch {
      toast({
        title: "Download failed",
        description: "Unable to download the contract.",
        variant: "destructive",
      });
    }
  };

  const handleBulkUpload = async (files: FileList) => {
    if (!files.length) return;
    
    setIsBulkUploading(true);
    let successCount = 0;
    let failCount = 0;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upload documents.",
        variant: "destructive",
      });
      setIsBulkUploading(false);
      return;
    }
    
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png'];
      
      if (!fileExt || !allowedTypes.includes(fileExt)) {
        failCount++;
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        failCount++;
        continue;
      }

      try {
        const fileName = `bulk-${Date.now()}-${file.name}`;
        const filePath = `bulk-uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('signed-contracts')
          .upload(filePath, file);

        if (uploadError) {
          failCount++;
          continue;
        }

        // Store the file path - signed URLs will be generated when viewing
        const storagePath = `signed-contracts/${filePath}`;

        // Save to database
        const { error: dbError } = await supabase
          .from('uploaded_documents')
          .insert({
            manager_id: user.id,
            file_name: file.name,
            file_url: storagePath,
            file_type: fileExt,
            file_size: file.size,
          });

        if (dbError) {
          failCount++;
          continue;
        }

        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsBulkUploading(false);

    if (successCount > 0) {
      toast({
        title: "Bulk Upload Complete",
        description: `${successCount} file(s) uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
      });
    } else {
      toast({
        title: "Upload Failed",
        description: "No files were uploaded. Check file types and sizes (max 10MB each).",
        variant: "destructive",
      });
    }
    
    fetchData();
  };

  // Direct upload for a tenant (creates a contract with uploaded document)
  const handleTenantDirectUpload = async (tenantId: string, tenantName: string, file: File) => {
    setIsBulkUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png'];
      
      if (!fileExt || !allowedTypes.includes(fileExt)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image file (JPG, PNG).",
          variant: "destructive",
        });
        setIsBulkUploading(false);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB.",
          variant: "destructive",
        });
        setIsBulkUploading(false);
        return;
      }

      const fileName = `tenant-${tenantId}-${Date.now()}.${fileExt}`;
      const filePath = `contracts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('signed-contracts')
        .upload(filePath, file);

      if (uploadError) {
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        setIsBulkUploading(false);
        return;
      }

      // Store the file path
      const storagePath = `signed-contracts/${filePath}`;

      // Find tenant's lease if exists
      const tenantLease = leases.find(l => l.tenant_id === tenantId);

      // Create a contract record with the uploaded document
      const { error: insertError } = await supabase.from("contracts").insert({
        tenant_id: tenantId,
        lease_id: tenantLease?.id || null,
        title: `Uploaded Contract - ${tenantName}`,
        content: `<p>Uploaded contract document for ${tenantName}.</p><p>File: ${file.name}</p>`,
        status: "pending_signature",
        uploaded_contract_url: storagePath,
        valid_from: tenantLease?.start_date || null,
        valid_until: tenantLease?.end_date || null,
      });

      if (insertError) {
        toast({
          title: "Error",
          description: "Failed to save contract record.",
          variant: "destructive",
        });
        setIsBulkUploading(false);
        return;
      }

      toast({
        title: "Contract Uploaded",
        description: `Contract uploaded for ${tenantName} successfully.`,
      });
      fetchData();
    } catch {
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading the contract.",
        variant: "destructive",
      });
    } finally {
      setIsBulkUploading(false);
    }
  };

  // Send Email notification for contract
  const handleSendContractEmail = async (contract: Contract) => {
    if (!contract.tenants?.email) {
      toast({
        title: "No Email",
        description: "Tenant email address is not available.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(contract.id);
    try {
      const { data: company } = await supabase
        .from("company_settings")
        .select("company_name")
        .limit(1)
        .maybeSingle();

      const portalUrl = `${window.location.origin}/tenant-portal`;

      const { error } = await supabase.functions.invoke("send-contract-notification", {
        body: {
          tenantEmail: contract.tenants.email,
          tenantName: contract.tenants.name,
          companyName: company?.company_name || "RentFlow Properties",
          contractTitle: contract.title,
          propertyInfo: contract.leases ? `${contract.leases.property} - ${contract.leases.unit}` : "N/A",
          validFrom: contract.valid_from ? format(new Date(contract.valid_from), "dd/MM/yy") : "Not set",
          validUntil: contract.valid_until ? format(new Date(contract.valid_until), "dd/MM/yy") : "Not set",
          portalUrl,
        },
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Contract notification sent to ${contract.tenants.email}`,
      });
    } catch {
      toast({
        title: "Failed to Send Email",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(null);
    }
  };

  // Send WhatsApp/SMS notification for contract
  const handleSendContractWhatsApp = async (contract: Contract) => {
    const tenantPhone = contract.tenants?.phone || tenants.find(t => t.id === contract.tenant_id)?.phone;
    
    if (!tenantPhone) {
      toast({
        title: "No Phone Number",
        description: "Tenant phone number is not available.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingWhatsApp(contract.id);
    try {
      const { data: company } = await supabase
        .from("company_settings")
        .select("company_name")
        .limit(1)
        .maybeSingle();

      const portalUrl = `${window.location.origin}/tenant-portal`;
      const message = `📋 Contract Alert from ${company?.company_name || "RentFlow"}!\n\nDear ${contract.tenants?.name || "Tenant"},\n\nYou have a contract "${contract.title}" pending your review and signature.\n\nProperty: ${contract.leases ? `${contract.leases.property} - ${contract.leases.unit}` : "N/A"}\n\nPlease login to your tenant portal to review and sign:\n${portalUrl}`;

      const { error } = await supabase.functions.invoke("send-whatsapp-notification", {
        body: {
          phoneNumber: tenantPhone,
          message,
          recipientName: contract.tenants?.name || "Tenant",
        },
      });

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: `WhatsApp/SMS notification sent to ${tenantPhone}`,
      });
    } catch {
      toast({
        title: "Failed to Send Message",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingWhatsApp(null);
    }
  };

  // Bulk SMS function

  const stats = {
    total: contracts.length,
    draft: contracts.filter((c) => c.status === "draft").length,
    pending: contracts.filter((c) => c.status === "pending_signature").length,
    signed: contracts.filter((c) => c.status === "signed").length,
  };

  return (
    <Layout title="Tenant Agreements" subtitle="Manage tenant agreements and digital signatures">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
          <TabsTrigger value="contracts" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
            <FileSignature className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            All Agreements
          </TabsTrigger>
          <TabsTrigger value="by-tenant" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            By Tenant
          </TabsTrigger>
          <TabsTrigger value="e-signatures" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
            <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            E-Signatures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-4 sm:space-y-6">
          {/* Stats */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 sm:pt-6">
                <div className="text-xs sm:text-sm text-muted-foreground">Total</div>
                <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:pt-6">
                <div className="text-xs sm:text-sm text-muted-foreground">Drafts</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-400">{stats.draft}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:pt-6">
                <div className="text-xs sm:text-sm text-muted-foreground">Pending</div>
                <div className="text-xl sm:text-2xl font-bold text-amber-400">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:pt-6">
                <div className="text-xs sm:text-sm text-muted-foreground">Signed</div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-400">{stats.signed}</div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 justify-between">
            <div className="flex flex-col xs:flex-row gap-2 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search agreements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-80 bg-card border-border"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full xs:w-[140px] sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_signature">Pending</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Upload Button */}
              <div className="relative">
                <Button variant="outline" size="sm" className="relative sm:size-default" disabled={isBulkUploading}>
                  {isBulkUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                      <span className="hidden sm:inline">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    disabled={isBulkUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    onChange={(e) => e.target.files && handleBulkUpload(e.target.files)}
                  />
                </Button>
              </div>
              <QuickCreateContract 
                leases={leases} 
                templates={templates} 
                onContractCreated={fetchData} 
              />
              <Button size="sm" className="sm:size-default" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Create Agreement</span>
                <span className="sm:hidden">New</span>
              </Button>
              {selectedContracts.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="sm:size-default"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Delete</span> {selectedContracts.size}
                </Button>
              )}
            </div>
          </div>

          {/* Rental Agreements Table */}
          <ContractsTable
            contracts={getFilteredContracts()}
            selectedContracts={selectedContracts}
            onToggleSelect={toggleContractSelection}
            onToggleSelectAll={toggleSelectAllContracts}
            onPreview={(contract) => {
              setSelectedContract(contract);
              setPreviewDialogOpen(true);
            }}
            onSign={(contract) => {
              setSelectedContract(contract);
              setSignDialogOpen(true);
            }}
            onEdit={(contract) => {
              setSelectedContract(contract);
              setCreateDialogOpen(true);
              setNewContract({
                lease_id: contract.lease_id || "",
                template_id: contract.template_id || "",
                title: contract.title,
                content: contract.content,
                valid_from: contract.valid_from || "",
                valid_until: contract.valid_until || "",
              });
            }}
            onDelete={handleRequestDelete}
            onSendEmail={handleSendContractEmail}
            onSendWhatsApp={handleSendContractWhatsApp}
            onUpload={handleUploadContract}
            onDownloadUploaded={handleDownloadUploadedContract}
            onSubmitForApproval={handleSubmitForApproval}
            isSendingEmail={isSendingEmail}
            isSendingWhatsApp={isSendingWhatsApp}
            isUploading={isUploading}
            tenants={tenants}
          />

          {/* Uploaded Documents List */}
          {uploadedDocuments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="h-5 w-5" />
                  Uploaded Documents ({uploadedDocuments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadedDocuments.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <p className="font-medium">{doc.file_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.file_type?.toUpperCase() || 'Unknown'}</Badge>
                          </TableCell>
                          <TableCell>
                            {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'Unknown'}
                          </TableCell>
                          <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openSafely(doc.file_url)}
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadUploadedContract(doc.file_url, doc.file_name)}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* By Tenant Tab - Independent contracts per tenant */}
        <TabsContent value="by-tenant" className="space-y-6">
          <TenantContractsView
            tenants={tenants}
            contracts={contracts}
            leases={leases}
            isBulkUploading={isBulkUploading}
            onTenantDirectUpload={handleTenantDirectUpload}
            onCreateContractFromLease={(lease) => {
              setNewContract(prev => ({
                ...prev,
                lease_id: lease.id,
                valid_from: lease.start_date,
                valid_until: lease.end_date,
                title: `Lease Agreement - ${lease.property} Unit ${lease.unit}`,
              }));
              setCreateDialogOpen(true);
            }}
            onPreviewContract={(contract) => {
              setSelectedContract(contract);
              setPreviewDialogOpen(true);
            }}
            onExportPdf={handleExportPdf}
          />
        </TabsContent>

        {/* E-Signatures Tab */}
        <TabsContent value="e-signatures" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                E-Signature Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                View and manage digital signatures for all agreements. Track which contracts need signatures from managers or tenants.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Stats */}
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {contracts.filter(c => c.manager_signature && c.tenant_signature).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Fully Signed</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-500">
                    {contracts.filter(c => !c.manager_signature && c.status !== 'cancelled').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Awaiting Manager</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-500">
                    {contracts.filter(c => c.manager_signature && !c.tenant_signature && c.status === 'pending_signature').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Awaiting Tenant</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-500">
                    {contracts.filter(c => c.status === 'signed').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
              </div>

              {/* Contracts needing signatures */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Pending Signatures
                </h4>
                
                {contracts.filter(c => 
                  (c.status === 'draft' || c.status === 'pending_signature') && 
                  (!c.manager_signature || !c.tenant_signature)
                ).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                    <p>All agreements are fully signed!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contracts
                      .filter(c => 
                        (c.status === 'draft' || c.status === 'pending_signature') && 
                        (!c.manager_signature || !c.tenant_signature)
                      )
                      .map((contract) => (
                        <Card key={contract.id} className="bg-background">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <FileSignature className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{contract.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {contract.tenants?.name} • {contract.leases?.property || "N/A"} {contract.leases?.unit ? `- ${contract.leases.unit}` : ""}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 flex-wrap">
                                {/* Signature Status */}
                                <div className="flex gap-2">
                                  <Badge 
                                    variant={contract.manager_signature ? "default" : "outline"}
                                    className={contract.manager_signature ? "bg-emerald-500" : ""}
                                  >
                                    Manager {contract.manager_signature ? "✓" : "○"}
                                  </Badge>
                                  <Badge 
                                    variant={contract.tenant_signature ? "default" : "outline"}
                                    className={contract.tenant_signature ? "bg-emerald-500" : ""}
                                  >
                                    Tenant {contract.tenant_signature ? "✓" : "○"}
                                  </Badge>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                  {!contract.manager_signature && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedContract(contract);
                                        setSignDialogOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Sign as Manager
                                    </Button>
                                  )}
                                  {contract.manager_signature && !contract.tenant_signature && contract.status === 'draft' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSendForSignature(contract)}
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      Send to Tenant
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedContract(contract);
                                      setPreviewDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Signature previews if available */}
                            {(contract.manager_signature || contract.tenant_signature) && (
                              <div className="mt-4 pt-4 border-t flex gap-6 flex-wrap">
                                {contract.manager_signature && (
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-2">Manager Signature</p>
                                    <img 
                                      src={contract.manager_signature} 
                                      alt="Manager Signature" 
                                      className="h-12 max-w-[150px] object-contain border rounded bg-white p-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {contract.manager_signed_at && formatDate(contract.manager_signed_at)}
                                    </p>
                                  </div>
                                )}
                                {contract.tenant_signature && (
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-2">Tenant Signature</p>
                                    <img 
                                      src={contract.tenant_signature} 
                                      alt="Tenant Signature" 
                                      className="h-12 max-w-[150px] object-contain border rounded bg-white p-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {contract.tenant_signed_at && formatDate(contract.tenant_signed_at)}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </div>

              {/* Recently Signed */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Recently Completed
                </h4>
                
                {contracts.filter(c => c.status === 'signed').slice(0, 5).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No completed signatures yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {contracts
                      .filter(c => c.status === 'signed')
                      .slice(0, 5)
                      .map((contract) => (
                        <div key={contract.id} className="flex items-center justify-between p-3 border rounded-lg bg-emerald-500/5">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                            <div>
                              <p className="font-medium text-sm">{contract.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {contract.tenants?.name} • Signed {contract.tenant_signed_at && formatDate(contract.tenant_signed_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedContract(contract);
                                setPreviewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleExportPdf(contract)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Create Rental Agreement Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Rental Agreement</DialogTitle>
            <DialogDescription>
              Select a lease and template to generate a rental agreement, or write a custom agreement.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Lease</Label>
                <Select value={newContract.lease_id} onValueChange={handleLeaseSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a lease..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leases.map((lease) => (
                      <SelectItem key={lease.id} value={lease.id}>
                        {lease.tenants?.name} - {lease.property} Unit {lease.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template (Optional)</Label>
                <Select value={newContract.template_id} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} {template.is_default && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Agreement Title</Label>
              <Input
                value={newContract.title}
                onChange={(e) => setNewContract({ ...newContract, title: e.target.value })}
                placeholder="e.g., Rental Agreement - Property Unit A1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valid From</Label>
                <Input
                  type="date"
                  value={newContract.valid_from}
                  onChange={(e) => setNewContract({ ...newContract, valid_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={newContract.valid_until}
                  onChange={(e) => setNewContract({ ...newContract, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Contract Content</Label>
              <ContractEditor
                content={newContract.content}
                onChange={(content) => setNewContract({ ...newContract, content })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateContract}>Create Contract</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedContract?.title}</DialogTitle>
          </DialogHeader>
          {selectedContract && <ContractPreview contract={selectedContract} />}
        </DialogContent>
      </Dialog>

      {/* Sign Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign Contract</DialogTitle>
            <DialogDescription>
              Draw your signature below to sign this contract.
            </DialogDescription>
          </DialogHeader>
          <SignatureCanvas onSave={handleManagerSign} />
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Request Deletion for {selectedContracts.size} Agreement{selectedContracts.size > 1 ? 's' : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will mark{" "}
              <span className="font-semibold text-foreground">
                {selectedContracts.size} agreement{selectedContracts.size > 1 ? 's' : ''}
              </span>
              {" "}for deletion. Another authorized user must confirm before permanent deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteContracts}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Processing..." : `Request Deletion`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Soft Delete Request Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Request Agreement Deletion
            </DialogTitle>
            <DialogDescription>
              This will mark the agreement for deletion. Another authorized user must confirm before the agreement is permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {contractToDelete && (
              <div className="rounded-lg bg-muted p-3">
                <p className="font-medium">{contractToDelete.title}</p>
                <p className="text-sm text-muted-foreground">
                  {contractToDelete.tenants?.name} • {contractToDelete.leases?.property}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="deleteReason">Reason for Deletion (optional)</Label>
              <Textarea
                id="deleteReason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter the reason for deleting this agreement..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitDeleteRequest}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Request Deletion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Layout>
  );
};

export default Contracts;
