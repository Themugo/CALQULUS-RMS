import { useState, useEffect, useRef } from "react";
import { Button } from "@/shared/components/ui/button";
import { openSafely } from "@/shared/lib/safeWindow";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import {
  Search,
  FileText,
  CheckCircle,
  Clock,
  Eye,
  Download,
  XCircle,
  Upload,
  RefreshCw,
  Plus,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Users,
  FileUp,
  RotateCcw,
  ExternalLink,
  Building,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

type ContractStatus = "pending" | "approved" | "rejected" | "signed" | "expired" | "cancelled";

interface ManagerContract {
  id: string;
  manager_user_id: string;
  manager_email: string;
  manager_name: string | null;
  title: string;
  description: string | null;
  contract_type: string | null;
  status: ContractStatus;
  uploaded_contract_url: string | null;
  parsed_content: Record<string, unknown> | null;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  signed_at: string | null;
  signature_url: string | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

interface Manager {
  id: string;
  email: string;
  full_name: string | null;
}

const statusConfig: Record<ContractStatus, { label: string; styles: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pending Review", styles: "bg-amber-500 text-white border-amber-600", icon: Clock },
  approved: { label: "Approved", styles: "bg-emerald-600 text-white border-emerald-700", icon: CheckCircle },
  rejected: { label: "Rejected", styles: "bg-red-600 text-white border-red-700", icon: XCircle },
  signed: { label: "Signed", styles: "bg-blue-600 text-white border-blue-700", icon: ShieldCheck },
  expired: { label: "Expired", styles: "bg-gray-600 text-white border-gray-700", icon: XCircle },
  cancelled: { label: "Cancelled", styles: "bg-slate-600 text-white border-slate-700", icon: XCircle },
};

const WebhostContracts = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [contracts, setContracts] = useState<ManagerContract[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ManagerContract | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedContent, setParsedContent] = useState<Record<string, unknown> | null>(null);
  
  // Upload form
  const [uploadForm, setUploadForm] = useState({
    manager_user_id: "",
    title: "",
    description: "",
    contract_type: "service_agreement",
    valid_from: "",
    valid_until: "",
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [contractsRes, managersRes] = await Promise.all([
      supabase
        .from("manager_contracts")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "manager")
        .eq("approval_status", "approved"),
    ]);

    if (contractsRes.data) {
      setContracts(contractsRes.data as ManagerContract[]);
    }

    // Fetch manager profiles
    if (managersRes.data && managersRes.data.length > 0) {
      const userIds = managersRes.data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      
      if (profiles) {
        setManagers(profiles);
      }
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getFilteredContracts = () => {
    let filtered = contracts;
    
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    
    if (managerFilter !== "all") {
      filtered = filtered.filter((c) => c.manager_user_id === managerFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.manager_email.toLowerCase().includes(query) ||
          c.manager_name?.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image file.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUploadContract = async () => {
    if (!uploadForm.manager_user_id || !uploadForm.title || !selectedFile) {
      toast({
        title: "Missing Information",
        description: "Please select a manager, enter a title, and upload a contract file.",
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(true);

    try {
      // Get manager info
      const selectedManager = managers.find(m => m.id === uploadForm.manager_user_id);
      
      // Upload file to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `manager-contracts/${uploadForm.manager_user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("contracts")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Store the file path - signed URLs will be generated when viewing
      const storagePath = `contracts/${filePath}`;

      // Create contract record
      const { error: insertError } = await supabase.from("manager_contracts").insert({
        manager_user_id: uploadForm.manager_user_id,
        manager_email: selectedManager?.email || "",
        manager_name: selectedManager?.full_name,
        title: uploadForm.title,
        description: uploadForm.description || null,
        contract_type: uploadForm.contract_type,
        uploaded_contract_url: storagePath,
        valid_from: uploadForm.valid_from || null,
        valid_until: uploadForm.valid_until || null,
        status: "pending",
      });

      if (insertError) throw insertError;

      // Send email notification to manager
      try {
        await supabase.functions.invoke("send-manager-contract-notification", {
          body: {
            managerEmail: selectedManager?.email,
            managerName: selectedManager?.full_name || selectedManager?.email,
            contractTitle: uploadForm.title,
            notificationType: "uploaded",
            portalUrl: `${window.location.origin}/platform-billing`,
          },
        });
      } catch {
        // Don't fail the whole operation if email fails
      }

      toast({ title: "Contract Uploaded", description: "The contract has been uploaded and the manager has been notified." });
      setUploadDialogOpen(false);
      setUploadForm({
        manager_user_id: "",
        title: "",
        description: "",
        contract_type: "service_agreement",
        valid_from: "",
        valid_until: "",
      });
      setSelectedFile(null);
      fetchData();
    } catch (error: unknown) {
      toast({ 
        title: "Upload Failed", 
        description: error instanceof Error ? error.message : "Failed to upload contract", 
        variant: "destructive" 
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleApproveContract = async () => {
    if (!selectedContract) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("manager_contracts")
      .update({
        status: "approved",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq("id", selectedContract.id);

    if (error) {
      toast({ title: "Error", description: "Failed to approve contract", variant: "destructive" });
      return;
    }

    // Send approval email notification
    try {
      await supabase.functions.invoke("send-manager-contract-notification", {
        body: {
          managerEmail: selectedContract.manager_email,
          managerName: selectedContract.manager_name || selectedContract.manager_email,
          contractTitle: selectedContract.title,
          notificationType: "approved",
          reviewNotes: reviewNotes,
          portalUrl: `${window.location.origin}/platform-billing`,
        },
      });
    } catch (error) {
      logError('WebhostContracts', `Failed to send contract approval notification: ${error}`);
      toast({ 
        title: "Contract Approved", 
        description: "The contract has been approved, but the notification email may not have been sent. Please notify the manager manually.",
        variant: "warning" 
      });
      return;
    }

    toast({ title: "Contract Approved", description: "The contract has been approved and the manager has been notified." });
    setApproveDialogOpen(false);
    setReviewNotes("");
    setSelectedContract(null);
    fetchData();
  };

  const handleRejectContract = async () => {
    if (!selectedContract || !rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide a rejection reason.", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("manager_contracts")
      .update({
        status: "rejected",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        review_notes: rejectionReason,
      })
      .eq("id", selectedContract.id);

    if (error) {
      toast({ title: "Error", description: "Failed to reject contract", variant: "destructive" });
      return;
    }

    // Send rejection email notification
    try {
      await supabase.functions.invoke("send-manager-contract-notification", {
        body: {
          managerEmail: selectedContract.manager_email,
          managerName: selectedContract.manager_name || selectedContract.manager_email,
          contractTitle: selectedContract.title,
          notificationType: "rejected",
          reviewNotes: rejectionReason,
          portalUrl: `${window.location.origin}/platform-billing`,
        },
      });
    } catch (error) {
      logError('WebhostContracts', `Failed to send contract rejection notification: ${error}`);
      toast({ 
        title: "Contract Rejected", 
        description: "The contract has been rejected, but the notification email may not have been sent. Please notify the manager manually.",
        variant: "warning" 
      });
    }

    if (error) {
      toast({ title: "Error", description: "Failed to reject contract", variant: "destructive" });
      return;
    }

    toast({ title: "Contract Rejected", description: "The contract has been rejected." });
    setRejectDialogOpen(false);
    setRejectionReason("");
    setSelectedContract(null);
    fetchData();
  };

  const handleRetakeContract = async (contract: ManagerContract) => {
    // Reset the contract to pending with new upload
    const { error } = await supabase
      .from("manager_contracts")
      .update({
        status: "pending",
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
      })
      .eq("id", contract.id);

    if (error) {
      toast({ title: "Error", description: "Failed to reset contract", variant: "destructive" });
      return;
    }

    toast({ title: "Contract Reset", description: "The contract has been reset for re-upload." });
    fetchData();
  };

  const handleDownloadContract = async (contract: ManagerContract) => {
    if (!contract.uploaded_contract_url) {
      toast({ title: "No file", description: "No contract file available.", variant: "destructive" });
      return;
    }

    openSafely(contract.uploaded_contract_url);
  };

  const handleParseContract = async () => {
    if (!selectedContract?.uploaded_contract_url) {
      toast({ title: "No file", description: "No contract file to parse.", variant: "destructive" });
      return;
    }

    setIsParsing(true);
    setParsedContent(null);

    try {
      const { data, error } = await supabase.functions.invoke("parse-contract-document", {
        body: {
          documentUrl: selectedContract.uploaded_contract_url,
          contractId: selectedContract.id,
        },
      });

      if (error) throw error;

      if (data?.parsedContent) {
        setParsedContent(data.parsedContent);
        
        // Update the contract in the database with parsed content
        await supabase
          .from("manager_contracts")
          .update({ parsed_content: data.parsedContent })
          .eq("id", selectedContract.id);

        toast({ title: "Document Parsed", description: "Contract terms have been extracted successfully." });
        fetchData();
      } else {
        throw new Error("No parsed content returned");
      }
    } catch (error: unknown) {
      toast({
        title: "Parse Failed",
        description: error instanceof Error ? error.message : "Failed to parse document",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const stats = {
    total: contracts.length,
    pending: contracts.filter((c) => c.status === "pending").length,
    approved: contracts.filter((c) => c.status === "approved").length,
    signed: contracts.filter((c) => c.status === "signed").length,
    rejected: contracts.filter((c) => c.status === "rejected").length,
  };

  const filteredContracts = getFilteredContracts();

  const getStatusBadge = (status: ContractStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={config.styles}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Manager Contracts</h2>
          <p className="text-purple-300">Manage service agreements with landlords/property managers</p>
        </div>
        <Button
          onClick={() => setUploadDialogOpen(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Contract
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-300">Total</CardTitle>
            <FileText className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-300">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-300">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-300">Signed</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.signed}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-300">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-slate-800/50 border border-purple-800/30">
          <TabsTrigger value="all" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            All Contracts
          </TabsTrigger>
          <TabsTrigger value="by-manager" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Users className="h-4 w-4 mr-2" />
            By Manager
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <Card className="bg-slate-800/50 border-purple-800/30">
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                  <Input
                    placeholder="Search contracts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-purple-700/50"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-700/50 border-purple-700/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={managerFilter} onValueChange={setManagerFilter}>
                  <SelectTrigger className="bg-slate-700/50 border-purple-700/50">
                    <SelectValue placeholder="Manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.full_name || manager.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchData} className="border-purple-700/50">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contracts Table */}
          <Card className="bg-slate-800/50 border-purple-800/30">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-purple-800/30 hover:bg-transparent">
                    <TableHead className="text-purple-300">Title</TableHead>
                    <TableHead className="text-purple-300">Manager</TableHead>
                    <TableHead className="text-purple-300">Type</TableHead>
                    <TableHead className="text-purple-300">Status</TableHead>
                    <TableHead className="text-purple-300">Valid Period</TableHead>
                    <TableHead className="text-purple-300">Created</TableHead>
                    <TableHead className="text-purple-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-purple-400" />
                      </TableCell>
                    </TableRow>
                  ) : filteredContracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-purple-300">
                        No contracts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContracts.map((contract) => (
                      <TableRow key={contract.id} className="border-purple-800/30">
                        <TableCell className="font-medium text-white">{contract.title}</TableCell>
                        <TableCell className="text-purple-300">
                          <div className="flex flex-col">
                            <span className="text-white">{contract.manager_name || "Unknown"}</span>
                            <span className="text-xs text-purple-400">{contract.manager_email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-purple-300 capitalize">
                          {contract.contract_type?.replace(/_/g, " ") || "Service Agreement"}
                        </TableCell>
                        <TableCell>{getStatusBadge(contract.status)}</TableCell>
                        <TableCell className="text-purple-300">
                          {contract.valid_from && contract.valid_until ? (
                            <span className="text-xs">
                              {format(new Date(contract.valid_from), "dd/MM/yy")} -{" "}
                              {format(new Date(contract.valid_until), "dd/MM/yy")}
                            </span>
                          ) : (
                            <span className="text-purple-500">Not set</span>
                          )}
                        </TableCell>
                        <TableCell className="text-purple-300">
                          {format(new Date(contract.created_at), "dd/MM/yy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedContract(contract);
                                setPreviewDialogOpen(true);
                              }}
                              className="h-8 w-8 text-purple-400 hover:text-white hover:bg-purple-600/20"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {contract.uploaded_contract_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadContract(contract)}
                                className="h-8 w-8 text-purple-400 hover:text-white hover:bg-purple-600/20"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {contract.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedContract(contract);
                                    setApproveDialogOpen(true);
                                  }}
                                  className="h-8 w-8 text-emerald-400 hover:text-white hover:bg-emerald-600/20"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedContract(contract);
                                    setRejectDialogOpen(true);
                                  }}
                                  className="h-8 w-8 text-red-400 hover:text-white hover:bg-red-600/20"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {(contract.status === "rejected" || contract.status === "expired") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRetakeContract(contract)}
                                className="h-8 w-8 text-amber-400 hover:text-white hover:bg-amber-600/20"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Manager Tab - Independent contracts per manager */}
        <TabsContent value="by-manager" className="space-y-4">
          <Card className="bg-slate-800/50 border-purple-800/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                Manager Contract Sections
              </CardTitle>
              <CardDescription className="text-purple-300">
                View and upload contracts organized by each manager. Each manager has their own independent contract section.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {managers.length === 0 ? (
                <div className="text-center py-8 text-purple-400">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No managers found</p>
                </div>
              ) : (
                managers.map((manager) => {
                  const managerContracts = contracts.filter(c => c.manager_user_id === manager.id);
                  return (
                    <div key={manager.id} className="border border-purple-700/30 rounded-lg overflow-hidden">
                      <div className="bg-slate-700/50 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                            <Building className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{manager.full_name || "Unnamed Manager"}</p>
                            <p className="text-sm text-purple-400">{manager.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-purple-600/20 text-purple-300 border-purple-600/30">
                            {managerContracts.length} contract(s)
                          </Badge>
                          <div className="relative">
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700"
                              onClick={() => {
                                setUploadForm(prev => ({ ...prev, manager_user_id: manager.id }));
                                setUploadDialogOpen(true);
                              }}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Contract
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        {managerContracts.length === 0 ? (
                          <p className="text-center text-purple-400 py-4">No contracts for this manager yet</p>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {managerContracts.map((contract) => (
                              <Card key={contract.id} className="bg-slate-700/30 border-purple-700/20">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="text-white font-medium text-sm truncate flex-1">{contract.title}</h4>
                                    {getStatusBadge(contract.status)}
                                  </div>
                                  <p className="text-xs text-purple-400 mb-3 capitalize">
                                    {contract.contract_type?.replace(/_/g, " ") || "Service Agreement"}
                                  </p>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedContract(contract);
                                        setPreviewDialogOpen(true);
                                      }}
                                      className="h-8 text-purple-400 hover:text-white hover:bg-purple-600/20"
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                    {contract.uploaded_contract_url && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDownloadContract(contract)}
                                        className="h-8 text-purple-400 hover:text-white hover:bg-purple-600/20"
                                      >
                                        <Download className="h-3 w-3 mr-1" />
                                        Download
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={(open) => {
        setPreviewDialogOpen(open);
        if (!open) {
          setParsedContent(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden bg-slate-900 border-purple-800/50">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedContract?.title}</DialogTitle>
            <DialogDescription className="text-purple-300">
              Contract for {selectedContract?.manager_name || selectedContract?.manager_email}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">Status</p>
                  {selectedContract && getStatusBadge(selectedContract.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">Contract Type</p>
                  <p className="text-white capitalize font-normal">
                    {selectedContract?.contract_type?.replace(/_/g, " ") || "Service Agreement"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">Valid From</p>
                  <p className="text-white font-normal">
                    {selectedContract?.valid_from 
                      ? format(new Date(selectedContract.valid_from), "dd/MM/yy")
                      : "Not set"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">Valid Until</p>
                  <p className="text-white font-normal">
                    {selectedContract?.valid_until 
                      ? format(new Date(selectedContract.valid_until), "dd/MM/yy")
                      : "Not set"}
                  </p>
                </div>
              </div>

              {selectedContract?.description && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">Description</p>
                  <p className="text-white font-normal">{selectedContract.description}</p>
                </div>
              )}

              {selectedContract?.review_notes && (
                <div className="space-y-1 p-3 rounded-lg bg-slate-800/50 border border-purple-700/30">
                  <p className="text-sm font-medium text-white">Review Notes</p>
                  <p className="text-white font-normal">{selectedContract.review_notes}</p>
                  {selectedContract.reviewed_at && (
                    <p className="text-xs text-white/70 mt-1">
                      Reviewed on {format(new Date(selectedContract.reviewed_at), "dd/MM/yy")}
                    </p>
                  )}
                </div>
              )}

              {/* AI Parsed Content Section */}
              {(parsedContent || selectedContract?.parsed_content) && (
                <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-purple-900/30 to-slate-800/50 border border-purple-600/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-white" />
                    <p className="text-sm font-medium text-white">AI Extracted Terms</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {Object.entries(parsedContent || selectedContract?.parsed_content || {}).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-xs font-medium text-white/80 capitalize">{key.replace(/_/g, " ")}</p>
                        <p className="text-sm text-white font-normal">
                          {typeof value === "object" && value !== null
                            ? JSON.stringify(value, null, 2)
                            : String(value) || "Not found"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedContract?.uploaded_contract_url && (
                <div className="border border-purple-700/30 rounded-lg overflow-hidden">
                  {selectedContract.uploaded_contract_url.endsWith(".pdf") ? (
                    <div className="p-6 text-center bg-slate-800/50">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-purple-400" />
                      <p className="text-white mb-3">PDF Document</p>
                      <Button
                        onClick={() => handleDownloadContract(selectedContract)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Open PDF
                      </Button>
                    </div>
                  ) : (
                    <img
                      src={selectedContract.uploaded_contract_url}
                      alt="Contract preview"
                      className="w-full max-h-[400px] object-contain"
                    />
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="flex gap-2">
            {selectedContract?.status === "pending" && (
              <>
                <Button
                  onClick={() => {
                    setPreviewDialogOpen(false);
                    setApproveDialogOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    setPreviewDialogOpen(false);
                    setRejectDialogOpen(true);
                  }}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {selectedContract?.uploaded_contract_url && (
              <>
                <Button
                  variant="outline"
                  onClick={handleParseContract}
                  disabled={isParsing}
                  className="border-purple-600/50 text-purple-400 hover:text-white hover:bg-purple-600/20"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Parse
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadContract(selectedContract)}
                  className="border-purple-700/50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-purple-800/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Approve Contract</AlertDialogTitle>
            <AlertDialogDescription className="text-purple-300">
              Are you sure you want to approve this contract? You can optionally add review notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label className="text-purple-300">Review Notes (Optional)</Label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any notes about this approval..."
              className="mt-2 bg-slate-700/50 border-purple-700/50"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-purple-700/50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveContract}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-slate-900 border-purple-800/50">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Contract</DialogTitle>
            <DialogDescription className="text-purple-300">
              Please provide a reason for rejecting this contract.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-purple-300">Rejection Reason *</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this contract is being rejected..."
              className="mt-2 bg-slate-700/50 border-purple-700/50 min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="border-purple-700/50">
              Cancel
            </Button>
            <Button
              onClick={handleRejectContract}
              disabled={!rejectionReason.trim()}
              variant="destructive"
            >
              Reject Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Contract Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        setUploadDialogOpen(open);
        if (!open) {
          setUploadForm({
            manager_user_id: "",
            title: "",
            description: "",
            contract_type: "service_agreement",
            valid_from: "",
            valid_until: "",
          });
          setSelectedFile(null);
        }
      }}>
        <DialogContent className="max-w-2xl bg-slate-900 border-purple-800/50">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileUp className="h-5 w-5 text-purple-400" />
              Upload Contract for Manager
            </DialogTitle>
            <DialogDescription className="text-purple-300">
              Upload a contract document for the selected manager. Supported formats: PDF, JPEG, PNG, WebP (max 10MB)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-purple-300">Select Manager *</Label>
                <Select 
                  value={uploadForm.manager_user_id} 
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, manager_user_id: value }))}
                >
                  <SelectTrigger className="bg-slate-700/50 border-purple-700/50">
                    <SelectValue placeholder="Choose a manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {manager.full_name || manager.email}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-purple-300">Contract Type</Label>
                <Select 
                  value={uploadForm.contract_type} 
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, contract_type: value }))}
                >
                  <SelectTrigger className="bg-slate-700/50 border-purple-700/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service_agreement">Service Agreement</SelectItem>
                    <SelectItem value="management_contract">Management Contract</SelectItem>
                    <SelectItem value="partnership_agreement">Partnership Agreement</SelectItem>
                    <SelectItem value="nda">Non-Disclosure Agreement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-purple-300">Contract Title *</Label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Property Management Service Agreement 2024"
                className="bg-slate-700/50 border-purple-700/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-purple-300">Description</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the contract terms..."
                className="bg-slate-700/50 border-purple-700/50 min-h-[60px]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-purple-300">Valid From</Label>
                <Input
                  type="date"
                  value={uploadForm.valid_from}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, valid_from: e.target.value }))}
                  className="bg-slate-700/50 border-purple-700/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-purple-300">Valid Until</Label>
                <Input
                  type="date"
                  value={uploadForm.valid_until}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, valid_until: e.target.value }))}
                  className="bg-slate-700/50 border-purple-700/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-purple-300">Contract Document *</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
                  ${selectedFile 
                    ? "border-purple-500 bg-purple-500/10" 
                    : "border-purple-700/50 hover:border-purple-500/50 hover:bg-slate-700/30"
                  }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-6 w-6 text-purple-400" />
                    <div className="text-left">
                      <p className="text-white font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-purple-400 text-xs">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="text-purple-400">
                    <Upload className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium text-sm">Click to upload</p>
                    <p className="text-xs text-purple-500">PDF, JPEG, PNG, WebP (max 10MB)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              className="border-purple-700/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadContract}
              disabled={uploadingFile || !uploadForm.manager_user_id || !uploadForm.title || !selectedFile}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {uploadingFile ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Contract
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebhostContracts;
