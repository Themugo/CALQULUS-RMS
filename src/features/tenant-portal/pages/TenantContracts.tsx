import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import MobileBottomNav from '@/features/tenant-portal/components/MobileBottomNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { formatDate, formatDateTime12h } from '@/shared/lib/dateFormat';
import DOMPurify from 'dompurify';
import { 
  ArrowLeft, 
  FileText, 
  PenTool, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Download, 
  ScrollText,
  Loader2,
  Upload
} from 'lucide-react';
import { SignatureCanvas } from '@/features/contracts/components/SignatureCanvas';
import { exportContractToPdf } from '@/features/contracts/lib/contractPdfExport';

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  valid_from: string | null;
  valid_until: string | null;
  tenant_signature: string | null;
  tenant_signed_at: string | null;
  manager_signature: string | null;
  manager_signed_at: string | null;
  created_at: string;
  uploaded_contract_url: string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock; color: string; badgeClass: string }> = {
  draft: { label: "Draft", variant: "outline", icon: Clock, color: "text-muted-foreground", badgeClass: "bg-slate-600 text-white border-slate-700" },
  pending_signature: { label: "Awaiting Signature", variant: "secondary", icon: PenTool, color: "text-amber-500", badgeClass: "bg-amber-500 text-white border-amber-600" },
  signed: { label: "Signed", variant: "default", icon: CheckCircle, color: "text-emerald-500", badgeClass: "bg-emerald-600 text-white border-emerald-700" },
  active: { label: "Active", variant: "default", icon: CheckCircle, color: "text-blue-500", badgeClass: "bg-blue-600 text-white border-blue-700" },
  expired: { label: "Expired", variant: "destructive", icon: AlertCircle, color: "text-red-500", badgeClass: "bg-red-600 text-white border-red-700" },
};

const TenantContracts = () => {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; property: string | null; unit: string | null } | null>(null);

  const fetchContracts = useCallback(async () => {
    if (!userRole?.tenant_id) return;

    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("tenant_id", userRole.tenant_id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load contracts",
        variant: "destructive",
      });
    } else {
      setContracts(data || []);
    }
    setLoading(false);
  }, [userRole?.tenant_id, toast]);

  const fetchTenantInfo = useCallback(async () => {
    if (!userRole?.tenant_id) return;
    const { data } = await supabase
      .from("tenants")
      .select("name, property, unit")
      .eq("id", userRole.tenant_id)
      .single();
    if (data) setTenantInfo(data);
  }, [userRole?.tenant_id]);

  useEffect(() => {
    fetchContracts();
    fetchTenantInfo();
  }, [userRole?.tenant_id, fetchContracts, fetchTenantInfo]);

  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setViewDialogOpen(true);
  };

  const handleSignContract = (contract: Contract) => {
    setSelectedContract(contract);
    setSignDialogOpen(true);
  };

  const handleSaveSignature = async (signature: string) => {
    if (!selectedContract) return;

    setIsSigning(true);
    try {
      const newStatus = selectedContract.manager_signature ? "signed" : "pending_signature";
      const signedAt = new Date().toISOString();

      const { error } = await supabase
        .from("contracts")
        .update({
          tenant_signature: signature,
          tenant_signed_at: signedAt,
          status: newStatus,
        })
        .eq("id", selectedContract.id);

      if (error) throw error;

      // Send email notification to manager
      try {
        const { data: companyData } = await supabase
          .from("company_settings")
          .select("company_name, email")
          .limit(1)
          .single();

        const companyName = companyData?.company_name || "RentFlow Properties";
        const managerEmail = companyData?.email;

        if (managerEmail && tenantInfo) {
          await supabase.functions.invoke("send-signature-notification", {
            body: {
              managerEmail,
              tenantName: tenantInfo.name,
              contractTitle: selectedContract.title,
              propertyInfo: tenantInfo.property && tenantInfo.unit
                ? `${tenantInfo.property} - ${tenantInfo.unit}`
                : "N/A",
              signedAt: new Date(signedAt).toLocaleString(),
              companyName,
            },
          });
        }
      } catch (emailError) {
      }

      toast({
        title: "Contract signed!",
        description: "Your signature has been saved successfully.",
      });

      setSignDialogOpen(false);
      fetchContracts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigning(false);
    }
  };

  const handleExportPdf = async (contract: Contract) => {
    setIsExporting(true);
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
        tenantName: tenantInfo?.name,
        propertyInfo: tenantInfo?.property && tenantInfo?.unit ? `${tenantInfo.property} - ${tenantInfo.unit}` : undefined,
      });
      toast({
        title: "PDF exported",
        description: "Your contract has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export the contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleUploadContract = async (e: React.ChangeEvent<HTMLInputElement>, contract: Contract) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only allow one upload per contract
    if (contract.uploaded_contract_url) {
      toast({
        title: "Already uploaded",
        description: "You can only upload one signed contract document.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${contract.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('signed-contracts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store the file path - signed URLs will be generated when viewing
      const storagePath = `signed-contracts/${filePath}`;

      const { error: updateError } = await supabase
        .from("contracts")
        .update({ uploaded_contract_url: storagePath })
        .eq("id", contract.id);

      if (updateError) throw updateError;

      toast({
        title: "Contract uploaded",
        description: "Your signed contract has been uploaded successfully.",
      });

      fetchContracts();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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
        description: "Your contract is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to download the contract.",
        variant: "destructive",
      });
    }
  };

  // Include uploaded contracts that need signature (uploaded_contract_url exists but no tenant signature)
  const pendingSignatureContracts = contracts.filter(c => 
    (c.status === "pending_signature" || (c.uploaded_contract_url && !c.tenant_signature)) && !c.tenant_signature
  );
  const activeContracts = contracts.filter(c => c.status === "active" || (c.tenant_signature && c.manager_signature));
  const otherContracts = contracts.filter(c => !pendingSignatureContracts.includes(c) && !activeContracts.includes(c));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${isMobile ? 'pb-20' : ''}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border safe-area-top">
        <div className="flex items-center justify-between px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/portal')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">Contracts</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <PenTool className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{pendingSignatureContracts.length}</p>
                  <p className="text-xs text-muted-foreground">Needs Signature</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{activeContracts.length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {contracts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No tenant agreements found</p>
                <p className="text-sm mt-1">Your tenant agreements will appear here</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Pending Signatures */}
            {pendingSignatureContracts.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-warning flex items-center gap-2">
                  <PenTool className="h-4 w-4" />
                  Requires Your Signature
                </h2>
                {pendingSignatureContracts.map((contract) => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onView={handleViewContract}
                    onSign={handleSignContract}
                    onExport={handleExportPdf}
                    onUpload={handleUploadContract}
                    onDownloadUploaded={handleDownloadUploadedContract}
                    isExporting={isExporting}
                    isUploading={isUploading}
                    highlight
                  />
                ))}
              </div>
            )}

            {/* Active Contracts */}
            {activeContracts.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">Active Contracts</h2>
                {activeContracts.map((contract) => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onView={handleViewContract}
                    onExport={handleExportPdf}
                    onUpload={handleUploadContract}
                    onDownloadUploaded={handleDownloadUploadedContract}
                    isExporting={isExporting}
                    isUploading={isUploading}
                  />
                ))}
              </div>
            )}

            {/* Other Contracts */}
            {otherContracts.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">Other Contracts</h2>
                {otherContracts.map((contract) => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onView={handleViewContract}
                    onExport={handleExportPdf}
                    onUpload={handleUploadContract}
                    onDownloadUploaded={handleDownloadUploadedContract}
                    isExporting={isExporting}
                    isUploading={isUploading}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* View Contract Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{selectedContract?.title}</DialogTitle>
            <DialogDescription>
              {selectedContract?.valid_from && selectedContract?.valid_until && (
                <span>
                  Valid from {formatDate(selectedContract.valid_from)} to{" "}
                  {formatDate(selectedContract.valid_until)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[45vh] border rounded-lg p-4 bg-muted/30">
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedContract?.content || "") }}
            />
          </ScrollArea>
          {/* Signature Display Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            {/* Manager Signature */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm font-medium text-foreground mb-2">Manager Signature:</p>
              {selectedContract?.manager_signature ? (
                <>
                  <img
                    src={selectedContract.manager_signature}
                    alt="Manager signature"
                    className="h-16 border rounded bg-white p-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Signed on {selectedContract.manager_signed_at && formatDateTime12h(selectedContract.manager_signed_at)}
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Pending</span>
                </div>
              )}
            </div>

            {/* Tenant Signature */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm font-medium text-foreground mb-2">Your Signature:</p>
              {selectedContract?.tenant_signature ? (
                <>
                  <img
                    src={selectedContract.tenant_signature}
                    alt="Your signature"
                    className="h-16 border rounded bg-white p-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Signed on {selectedContract.tenant_signed_at && formatDateTime12h(selectedContract.tenant_signed_at)}
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-amber-500">
                  <PenTool className="h-4 w-4" />
                  <span className="text-sm">Awaiting your signature</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
            {selectedContract && (
              <Button
                variant="outline"
                onClick={() => handleExportPdf(selectedContract)}
                disabled={isExporting}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Exporting..." : "Download PDF"}
              </Button>
            )}
            {selectedContract && !selectedContract?.tenant_signature && (selectedContract?.status === "pending_signature" || selectedContract?.uploaded_contract_url) && (
              <Button 
                onClick={() => {
                  setViewDialogOpen(false);
                  handleSignContract(selectedContract);
                }}
                className="w-full sm:w-auto"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Sign Contract
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Contract Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Sign Contract
            </DialogTitle>
            <DialogDescription>
              Please review and sign: {selectedContract?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 border rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">By signing this document, you agree to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>All terms and conditions outlined in the contract</li>
                <li>The validity period specified in the agreement</li>
                <li>Your signature is legally binding</li>
              </ul>
            </div>
            <SignatureCanvas onSave={handleSaveSignature} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
};

// Contract Card Component
interface ContractCardProps {
  contract: Contract;
  onView: (contract: Contract) => void;
  onSign?: (contract: Contract) => void;
  onExport?: (contract: Contract) => void;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>, contract: Contract) => void;
  onDownloadUploaded?: (url: string, title: string) => void;
  isExporting?: boolean;
  isUploading?: boolean;
  highlight?: boolean;
}

function ContractCard({ 
  contract, 
  onView, 
  onSign, 
  onExport, 
  onUpload, 
  onDownloadUploaded,
  isExporting, 
  isUploading, 
  highlight 
}: ContractCardProps) {
  const status = statusConfig[contract.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <Card className={highlight ? "border-amber-500/50 bg-amber-500/5" : "border-border"}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium text-foreground truncate">{contract.title}</h4>
              <Badge className={`flex items-center gap-1 text-xs ${status.badgeClass}`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
              {contract.uploaded_contract_url && (
                <Badge className="text-xs bg-emerald-600 text-white border-emerald-700">
                  <Upload className="h-3 w-3 mr-1" />
                  Uploaded
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {contract.valid_from && contract.valid_until
                ? `${formatDate(contract.valid_from)} - ${formatDate(contract.valid_until)}`
                : `Created ${formatDate(contract.created_at)}`}
            </p>
            {/* Signature Status */}
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className={`text-xs ${contract.manager_signature ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'text-muted-foreground'}`}>
                Manager {contract.manager_signature ? "✓" : "○"}
              </Badge>
              <Badge variant="outline" className={`text-xs ${contract.tenant_signature ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'text-muted-foreground'}`}>
                Tenant {contract.tenant_signature ? "✓" : "○"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => onView(contract)} className="flex-1">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          {onExport && (contract.tenant_signature || contract.manager_signature) && (
            <Button variant="outline" size="sm" onClick={() => onExport(contract)} disabled={isExporting} title="Export as PDF">
              <Download className="h-4 w-4" />
            </Button>
          )}
          {/* Upload button - only show if not already uploaded */}
          {onUpload && !contract.uploaded_contract_url && (
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => onUpload(e, contract)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Button variant="outline" size="sm" disabled={isUploading} title="Upload signed document">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
            </div>
          )}
          {/* View & Download uploaded document */}
          {contract.uploaded_contract_url && (
            <>
              {onDownloadUploaded && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onDownloadUploaded(contract.uploaded_contract_url!, contract.title)}
                  title="Download uploaded document"
                  className="text-emerald-500"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <a href={contract.uploaded_contract_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" title="Open in new tab">
                  <Eye className="h-4 w-4" />
                </Button>
              </a>
            </>
          )}
          {onSign && !contract.tenant_signature && (contract.status === "pending_signature" || contract.uploaded_contract_url) && (
            <Button size="sm" onClick={() => onSign(contract)} className="flex-1">
              <PenTool className="h-4 w-4 mr-1" />
              Sign
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TenantContracts;
