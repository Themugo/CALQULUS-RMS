import { useState, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/hooks/use-toast";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { FileText, PenTool, Eye, CheckCircle, Clock, AlertCircle, Download, Upload, Loader2 } from "lucide-react";
import { SignatureCanvas } from "@/features/contracts/components/SignatureCanvas";
import { exportContractToPdf } from "@/features/contracts/lib/contractPdfExport";

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

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  draft: { label: "Draft", variant: "outline", icon: Clock },
  pending_signature: { label: "Awaiting Your Signature", variant: "secondary", icon: PenTool },
  signed: { label: "Signed", variant: "default", icon: CheckCircle },
  active: { label: "Active", variant: "default", icon: CheckCircle },
  expired: { label: "Expired", variant: "destructive", icon: AlertCircle },
};

export function TenantContractsSection() {
  const { userRole } = useAuth();
  const { toast } = useToast();
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
        title: "Unable to load contracts",
        description: error.message,
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
      // Determine new status - if manager already signed, mark as signed/active
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
        // Fetch company settings for company name
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
        // Don't fail the signing if email fails
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

      const { error: uploadError } = await supabase.storage
        .from('signed-contracts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the file path - signed URLs will be generated when viewing
      const storagePath = `signed-contracts/${fileName}`;

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

  // Include uploaded contracts that need signature (uploaded_contract_url exists but no tenant signature)
  const pendingSignatureContracts = contracts.filter(c => 
    (c.status === "pending_signature" || (c.uploaded_contract_url && !c.tenant_signature)) && !c.tenant_signature
  );
  const activeContracts = contracts.filter(c => c.status === "active" || (c.tenant_signature && c.manager_signature));
  const otherContracts = contracts.filter(c => !pendingSignatureContracts.includes(c) && !activeContracts.includes(c));

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Tenant Agreements
          </CardTitle>
          <CardDescription>View and sign your tenant agreements</CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No contracts found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Signatures - Highlighted */}
              {pendingSignatureContracts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-warning flex items-center gap-2">
                    <PenTool className="h-4 w-4" />
                    Requires Your Signature
                  </h3>
                  {pendingSignatureContracts.map((contract) => (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      onExport={handleExportPdf}
                      onUpload={handleUploadContract}
                      isExporting={isExporting}
                      isUploading={isUploading}
                      onView={handleViewContract}
                      onSign={handleSignContract}
                      highlight
                    />
                  ))}
                </div>
              )}

              {/* Active Contracts */}
              {activeContracts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Active Contracts</h3>
                  {activeContracts.map((contract) => (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      onView={handleViewContract}
                      onExport={handleExportPdf}
                      onUpload={handleUploadContract}
                      isExporting={isExporting}
                      isUploading={isUploading}
                    />
                  ))}
                </div>
              )}

              {/* Other Contracts */}
              {otherContracts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Other Contracts</h3>
                  {otherContracts.map((contract) => (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      onView={handleViewContract}
                      onExport={handleExportPdf}
                      onUpload={handleUploadContract}
                      isExporting={isExporting}
                      isUploading={isUploading}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Contract Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedContract?.title}</DialogTitle>
            <DialogDescription>
              {selectedContract?.valid_from && selectedContract?.valid_until && (
                <span>
                  Valid from {format(new Date(selectedContract.valid_from), "dd/MM/yy")} to{" "}
                  {format(new Date(selectedContract.valid_until), "dd/MM/yy")}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[50vh] border rounded-lg p-4 bg-muted/30">
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedContract?.content || "") }}
            />
          </ScrollArea>
          {selectedContract?.tenant_signature && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">Your Signature:</p>
              <img
                src={selectedContract.tenant_signature}
                alt="Your signature"
                className="h-16 border rounded bg-white"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Signed on {selectedContract.tenant_signed_at && format(new Date(selectedContract.tenant_signed_at), "dd/MM/yy 'at' h:mm a")}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {selectedContract && (
              <Button
                variant="outline"
                onClick={() => handleExportPdf(selectedContract)}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Exporting..." : "Download PDF"}
              </Button>
            )}
            {selectedContract?.status === "pending_signature" && !selectedContract?.tenant_signature && (
              <Button onClick={() => {
                setViewDialogOpen(false);
                handleSignContract(selectedContract);
              }}>
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
    </>
  );
}

interface ContractCardProps {
  contract: Contract;
  onView: (contract: Contract) => void;
  onSign?: (contract: Contract) => void;
  onExport?: (contract: Contract) => void;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>, contract: Contract) => void;
  isExporting?: boolean;
  isUploading?: boolean;
  highlight?: boolean;
}

function ContractCard({ contract, onView, onSign, onExport, onUpload, isExporting, isUploading, highlight }: ContractCardProps) {
  const status = statusConfig[contract.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <div className={`border rounded-lg p-4 ${highlight ? "border-warning bg-warning/5" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-medium truncate">{contract.title}</h4>
            <Badge variant={status.variant} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            {contract.uploaded_contract_url && (
              <Badge variant="outline" className="text-xs">
                <Upload className="h-3 w-3 mr-1" />
                Uploaded
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {contract.valid_from && contract.valid_until
              ? `${format(new Date(contract.valid_from), "dd/MM/yy")} - ${format(new Date(contract.valid_until), "dd/MM/yy")}`
              : `Created ${format(new Date(contract.created_at), "dd/MM/yy")}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => onView(contract)}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          {onExport && (contract.tenant_signature || contract.manager_signature) && (
            <Button variant="outline" size="sm" onClick={() => onExport(contract)} disabled={isExporting}>
              <Download className="h-4 w-4" />
            </Button>
          )}
          {onUpload && !contract.uploaded_contract_url && (
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => onUpload(e, contract)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Button variant="outline" size="sm" disabled={isUploading}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
            </div>
          )}
          {contract.uploaded_contract_url && (
            <a href={contract.uploaded_contract_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </a>
          )}
          {onSign && !contract.tenant_signature && (contract.status === "pending_signature" || contract.uploaded_contract_url) && (
            <Button size="sm" onClick={() => onSign(contract)}>
              <PenTool className="h-4 w-4 mr-1" />
              Sign
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
