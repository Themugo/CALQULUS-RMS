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
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { formatDate, formatDateTime12h } from '@/shared/lib/dateFormat';
import { MAINTENANCE_CATEGORIES, getCategoryLabel, type MaintenanceCategory } from '@/features/maintenance/lib/maintenanceCategories';
import { 
  ArrowLeft, 
  Wrench, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  MessageSquare,
  Calendar,
  ChevronRight,
  Camera
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type RequestStatus = Database['public']['Enums']['request_status'];
type RequestPriority = Database['public']['Enums']['request_priority'];

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  category: string;
  property_name: string;
  unit_number: string | null;
  tenant_name: string;
  tenant_email: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  requested_date: string;
  expected_completion_date: string | null;
  completion_date: string | null;
  photos_urls: string[] | null;
  completion_photos: string[] | null;
  resolution_notes: string | null;
}

type MaintenanceInsert = Database['public']['Tables']['maintenance_requests']['Insert'] & {
  photos_urls: string[] | null;
};

const statusConfig: Record<RequestStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock; color: string; badgeClass: string }> = {
  open: { label: "Open", variant: "secondary", icon: Clock, color: "text-warning", badgeClass: "bg-amber-500 text-white" },
  in_progress: { label: "In Progress", variant: "default", icon: Wrench, color: "text-primary", badgeClass: "bg-blue-600 text-white" },
  completed: { label: "Completed", variant: "outline", icon: CheckCircle, color: "text-success", badgeClass: "bg-emerald-600 text-white" },
  cancelled: { label: "Cancelled", variant: "destructive", icon: AlertCircle, color: "text-destructive", badgeClass: "bg-slate-600 text-white" },
};

const priorityConfig: Record<RequestPriority, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-slate-500 text-white" },
  medium: { label: "Medium", color: "bg-blue-500 text-white" },
  high: { label: "High", color: "bg-orange-500 text-white" },
  urgent: { label: "Urgent", color: "bg-red-600 text-white" },
};

const TenantMaintenance = () => {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; email: string; property: string | null; unit: string | null; manager_id: string | null } | null>(null);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as RequestPriority,
    category: 'other' as MaintenanceCategory,
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const uploadPhotos = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const path = `maintenance/${Date.now()}-${file.name.replace(/\s/g, '-')}`;
      const { error } = await supabase.storage.from('maintenance-photos').upload(path, file, { upsert: true });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('maintenance-photos').getPublicUrl(path);
        urls.push(publicUrl);
      }
    }
    return urls;
  };

  const fetchTenantInfo = useCallback(async () => {
    if (!userRole?.tenant_id) {
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from("tenants")
      .select("name, email, property, unit, manager_id")
      .eq("id", userRole.tenant_id)
      .single();
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load tenant information",
        variant: "destructive",
      });
      setLoading(false);
    } else {
      setTenantInfo(data);
    }
  }, [userRole?.tenant_id, toast]);

  useEffect(() => {
    fetchTenantInfo();
  }, [userRole?.tenant_id, fetchTenantInfo]);

  const fetchRequests = useCallback(async () => {
    if (!tenantInfo?.email) return;

    const { data, error } = await supabase
      .from("maintenance_requests")
      .select("*")
      .eq("tenant_email", tenantInfo.email)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load maintenance requests",
        variant: "destructive",
      });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  }, [tenantInfo?.email, toast]);

  useEffect(() => {
    if (tenantInfo?.email) {
      fetchRequests();
    }
  }, [tenantInfo?.email, fetchRequests]);

  const handleCreateRequest = async () => {
    if (!tenantInfo) return;

    if (!formData.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your request",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Description required",
        description: "Please describe the issue you're experiencing",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedUrls: string[] = [];
      if (photoFiles.length > 0) {
        setUploadingPhotos(true);
        uploadedUrls = await uploadPhotos(photoFiles);
        setUploadingPhotos(false);
      }

      const payload: MaintenanceInsert = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        category: formData.category,
        property_name: tenantInfo.property || 'Unknown Property',
        unit_number: tenantInfo.unit,
        tenant_name: tenantInfo.name,
        tenant_email: tenantInfo.email,
        manager_id: tenantInfo.manager_id,
        photos_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
      };

      const { data: newRequest, error } = await supabase
        .from("maintenance_requests")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      supabase.functions.invoke('send-maintenance-notification', {
        body: {
          requestId: newRequest.id,
          type: 'created',
        },
      }).catch((err: unknown) => console.error('Failed to send maintenance notification:', err));

      toast({
        title: "Request submitted",
        description: "Your maintenance request has been submitted successfully",
      });

      setCreateDialogOpen(false);
      setFormData({ title: '', description: '', priority: 'medium', category: 'other' });
      setPhotoFiles([]);
      setPhotoUrls([]);
      fetchRequests();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit maintenance request. Please try again.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewRequest = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };

  const openRequests = requests.filter(r => r.status === 'open' || r.status === 'in_progress');
  const closedRequests = requests.filter(r => r.status === 'completed' || r.status === 'cancelled');

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
          <h1 className="font-semibold text-lg">Maintenance</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-warning/10 border-warning/20">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{openRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Open Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-success/10 border-success/20">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <div>
                  <p className="text-2xl font-bold">{closedRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New Request Button */}
        <Button 
          className="w-full" 
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Submit New Request
        </Button>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No maintenance requests</p>
                <p className="text-sm mt-1">Submit a request when you need repairs</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Open Requests */}
            {openRequests.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">Active Requests</h2>
                {openRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onClick={() => handleViewRequest(request)}
                  />
                ))}
              </div>
            )}

            {/* Closed Requests */}
            {closedRequests.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">Past Requests</h2>
                {closedRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onClick={() => handleViewRequest(request)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Request Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              New Maintenance Request
            </DialogTitle>
            <DialogDescription>
              Describe the issue you're experiencing and we'll get it fixed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Leaking faucet in bathroom"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Please describe the issue in detail..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: MaintenanceCategory) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: RequestPriority) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Can wait</SelectItem>
                  <SelectItem value="medium">Medium - Needs attention soon</SelectItem>
                  <SelectItem value="high">High - Urgent issue</SelectItem>
                  <SelectItem value="urgent">Urgent - Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tenantInfo?.property && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Location:</span> {tenantInfo.property}
                  {tenantInfo.unit && ` - Unit ${tenantInfo.unit}`}
                </p>
              </div>
            )}

            {/* Photo upload */}
            <div>
              <Label className="text-sm font-medium">Photos (optional but recommended)</Label>
              <p className="text-xs text-muted-foreground mb-2">Upload photos of the issue — helps manager understand and respond faster</p>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                <div className="flex flex-col items-center justify-center gap-1">
                  <Camera className="h-6 w-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Click to add photos (max 5)</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files || []).slice(0, 5);
                    setPhotoFiles(files);
                    setPhotoUrls(files.map(f => URL.createObjectURL(f)));
                  }}
                />
              </label>
              {photoUrls.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt={`photo ${i+1}`} className="h-16 w-16 object-cover rounded-lg border" />
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        onClick={() => {
                          setPhotoFiles(prev => prev.filter((_, idx) => idx !== i));
                          setPhotoUrls(prev => prev.filter((_, idx) => idx !== i));
                        }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleCreateRequest} disabled={isSubmitting || uploadingPhotos} className="w-full sm:w-auto">
              {(isSubmitting || uploadingPhotos) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {uploadingPhotos ? 'Uploading photos…' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Request Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.title}</DialogTitle>
            <DialogDescription>
              Submitted on {selectedRequest && formatDateTime12h(selectedRequest.created_at)}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={statusConfig[selectedRequest.status].variant}>
                  {statusConfig[selectedRequest.status].label}
                </Badge>
                <Badge className={priorityConfig[selectedRequest.priority].color}>
                  {priorityConfig[selectedRequest.priority].label} Priority
                </Badge>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                  {getCategoryLabel(selectedRequest.category)}
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{selectedRequest.description}</p>
                </div>

                {/* Photos submitted by tenant */}
                {selectedRequest.photos_urls?.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Your photos</Label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {selectedRequest.photos_urls.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Photo ${i+1}`} className="h-20 w-24 object-cover rounded-lg border hover:opacity-90 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manager completion photos */}
                {selectedRequest.completion_photos?.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Completion photos (from manager)</Label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {selectedRequest.completion_photos.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Completion ${i+1}`} className="h-20 w-24 object-cover rounded-lg border hover:opacity-90 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution notes from manager */}
                {selectedRequest.resolution_notes && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Label className="text-green-700 text-xs">Manager resolution notes</Label>
                    <p className="mt-1 text-sm text-green-900">{selectedRequest.resolution_notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Location</Label>
                    <p className="mt-1 text-sm">
                      {selectedRequest.property_name}
                      {selectedRequest.unit_number && ` - Unit ${selectedRequest.unit_number}`}
                    </p>
                  </div>
                  {selectedRequest.assigned_to && (
                    <div>
                      <Label className="text-muted-foreground">Assigned To</Label>
                      <p className="mt-1 text-sm">{selectedRequest.assigned_to}</p>
                    </div>
                  )}
                </div>

                {/* Date Information */}
                <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-3">
                  <div>
                    <Label className="text-muted-foreground text-xs">Requested Date</Label>
                    <p className="mt-0.5 text-sm font-medium">
                      {formatDate(selectedRequest.requested_date)}
                    </p>
                  </div>
                  {selectedRequest.expected_completion_date && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Expected Completion</Label>
                      <p className="mt-0.5 text-sm font-medium">
                        {formatDate(selectedRequest.expected_completion_date)}
                      </p>
                    </div>
                  )}
                  {selectedRequest.completion_date && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Completed On</Label>
                      <p className="mt-0.5 text-sm font-medium text-success">
                        {formatDate(selectedRequest.completion_date)}
                      </p>
                    </div>
                  )}
                </div>

                {selectedRequest.status === 'in_progress' && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                    <p className="text-sm text-primary font-medium">
                      Your request is being worked on. We'll update you when it's complete.
                    </p>
                  </div>
                )}

                {selectedRequest.status === 'completed' && (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                    <p className="text-sm text-success font-medium">
                      This request has been completed on {selectedRequest.completion_date 
                        ? formatDate(selectedRequest.completion_date)
                        : formatDate(selectedRequest.updated_at)}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
};

// Request Card Component
interface RequestCardProps {
  request: MaintenanceRequest;
  onClick: () => void;
}

function RequestCard({ request, onClick }: RequestCardProps) {
  const status = statusConfig[request.status];
  const priority = priorityConfig[request.priority];
  const StatusIcon = status.icon;

  return (
    <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onClick}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium truncate">{request.title}</h4>
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                {getCategoryLabel(request.category)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
              {request.description}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Calendar className="h-3 w-3" />
              <span>Requested: {formatDate(request.requested_date)}</span>
              {request.expected_completion_date && (
                <span>• Expected: {formatDate(request.expected_completion_date)}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={status.variant} className="text-xs">
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              <Badge className={`text-xs ${priority.color}`}>
                {priority.label}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(request.created_at)}
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export default TenantMaintenance;
