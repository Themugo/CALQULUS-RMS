import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Separator } from "@/shared/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Loader2, Upload, X, User, Lock, Bell, Wallet, Globe, Building2, Receipt, Clock, Users, Shield } from "lucide-react";
import { UserRoleManagement } from "@/features/settings/components/UserRoleManagement";
import { PasswordChange } from "@/features/settings/components/PasswordChange";
import { CompanySettings } from "@/features/settings/components/CompanySettings";
import { ReceiptSettings } from "@/features/settings/components/ReceiptSettings";
import { PaymentReminderSettings } from "@/features/settings/components/PaymentReminderSettings";
import { CurrencySettings } from "@/features/settings/components/CurrencySettings";
import { PaymentSettings } from "@/features/settings/components/PaymentSettings";
import { PaymentSetupStatus } from "@/features/settings/components/PaymentSetupStatus";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import SubmanagerManagement from "@/features/settings/components/SubmanagerManagement";
import BankIntegrationSettings from "@/features/payments/components/BankIntegrationSettings";
import UnmatchedBankTransactions from "@/features/payments/components/UnmatchedBankTransactions";
import { DateSettings } from "@/features/settings/components/DateSettings";
import { cn } from "@/shared/lib/utils";
import { imageExtension, publicStoragePath } from "@/features/settings/lib/storagePaths";

const settingsTabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "password", label: "Password", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "payments", label: "Payment Settings", icon: Wallet },
  { id: "bank-integration", label: "Bank Integration", icon: Building2 },
  { id: "currency", label: "Currency", icon: Globe },
  { id: "company", label: "Company", icon: Building2 },
  { id: "receipts", label: "Receipts", icon: Receipt },
  { id: "reminders", label: "Payment Reminders", icon: Clock },
  { id: "date-time", label: "Date & Time", icon: Clock },
  { id: "submanagers", label: "Submanagers", icon: Users },
  { id: "roles", label: "User Roles", icon: Shield },
];

const Settings = () => {
  const { toast } = useToast();
  const { user, isManager } = useAuth();
  const [searchParams] = useSearchParams();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && settingsTabs.some((settingsTab) => settingsTab.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    notifyEmail: true,
    notifySms: true,
    notifyWhatsapp: false,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, email, phone, photo_url")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        setFullName(data?.full_name || "");
        setEmail(data?.email || user.email || "");
        setPhone(data?.phone || "");
        setPhotoUrl(data?.photo_url || null);
      } catch (error) {
        toast({
          title: "Profile Load Failed",
          description: error instanceof Error ? error.message : "Could not load your profile settings.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [toast, user]);

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      if (!user) return;
      setNotificationLoading(true);
      try {
        const result = await (supabase
          .from("manager_notification_settings" as never)
          .select("notify_email, notify_sms, notify_whatsapp")
          .eq("manager_user_id", user.id)
          .maybeSingle()) as unknown as { data: { notify_email: boolean; notify_sms: boolean; notify_whatsapp: boolean } | null; error: unknown };
        const { data, error } = result;
        if (error) throw error;
        if (data) {
          setNotificationSettings({
            notifyEmail: data.notify_email ?? true,
            notifySms: data.notify_sms ?? true,
            notifyWhatsapp: data.notify_whatsapp ?? false,
          });
        }
      } catch (error) {
        toast({
          title: "Notification Settings Load Failed",
          description: error instanceof Error ? error.message : "Could not load notification preferences.",
          variant: "destructive",
        });
      } finally {
        setNotificationLoading(false);
      }
    };
    fetchNotificationSettings();
  }, [toast, user]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid File", description: "Please upload an image file (PNG, JPG, etc.)", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Photo must be less than 2MB", variant: "destructive" });
      return;
    }
    setUploadingPhoto(true);
    try {
      const fileExt = imageExtension(file);
      const fileName = `${user.id}/profile.${fileExt}`;
      if (photoUrl) {
        const oldPath = publicStoragePath(photoUrl, "profile-photos");
        if (oldPath && oldPath !== fileName) {
          const { error: removeError } = await supabase.storage.from("profile-photos").remove([oldPath]);
          if (removeError) console.warn("Profile photo cleanup failed", removeError);
        }
      }
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, file, { cacheControl: "3600", contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
      const newPhotoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: fullName || user.user_metadata?.full_name || "",
        phone: phone || null,
        photo_url: newPhotoUrl,
      });
      if (profileError) throw profileError;
      setPhotoUrl(newPhotoUrl);
      toast({ title: "Photo Uploaded", description: "Your profile photo has been updated." });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoUrl || !user) return;
    setUploadingPhoto(true);
    try {
      const filePath = publicStoragePath(photoUrl, "profile-photos");
      if (filePath) {
        const { error: removeError } = await supabase.storage.from("profile-photos").remove([filePath]);
        if (removeError) throw removeError;
      }
      const { error: profileError } = await supabase.from("profiles").update({ photo_url: null }).eq("id", user.id);
      if (profileError) throw profileError;
      setPhotoUrl(null);
      toast({ title: "Photo Removed", description: "Your profile photo has been removed." });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        phone,
        photo_url: photoUrl,
      });
      if (error) throw error;
      toast({ title: "Profile Updated", description: "Your profile information has been saved." });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setNotificationSaving(true);
    try {
      const { error } = await (supabase
        .from("manager_notification_settings" as never)
        .upsert({
          manager_user_id: user.id,
          notify_email: notificationSettings.notifyEmail,
          notify_sms: notificationSettings.notifySms,
          notify_whatsapp: notificationSettings.notifyWhatsapp,
        }, { onConflict: "manager_user_id" }) as unknown as { error: unknown });
      if (error) throw error;
      toast({ title: "Notifications Saved", description: "Your notification preferences have been updated." });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save notification preferences.",
        variant: "destructive",
      });
    } finally {
      setNotificationSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <Card className="card-shadow animate-fade-in">
            <CardHeader>
              <CardTitle className="font-heading">Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Profile Photo</Label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                          <AvatarImage src={photoUrl || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg sm:text-xl">
                            {getInitials(fullName)}
                          </AvatarFallback>
                        </Avatar>
                        {photoUrl && (
                          <Button variant="destructive" size="icon" className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-5 w-5 sm:h-6 sm:w-6 rounded-full" onClick={handleRemovePhoto} disabled={uploadingPhoto}>
                            <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
                          {uploadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          {photoUrl ? "Change Photo" : "Upload Photo"}
                        </Button>
                        <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm">Full Name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" className="h-9 sm:h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input id="email" type="email" value={email} disabled className="bg-muted h-9 sm:h-10 text-sm" />
                    <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm">Phone</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" className="h-9 sm:h-10" />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={saving} size="sm">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Profile
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      case "password":
        return <PasswordChange />;
      case "notifications":
        return (
          <Card className="card-shadow animate-fade-in">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="font-heading text-base sm:text-lg">Notifications</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Configure how you receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-2 sm:pt-2">
              {notificationLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                      <Label className="text-sm font-medium">Email Notifications</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">Receive email updates about payments, leases, and account events</p>
                    </div>
                    <Switch
                      checked={notificationSettings.notifyEmail}
                      onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, notifyEmail: checked }))}
                      className="flex-shrink-0"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                      <Label className="text-sm font-medium">SMS Notifications</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">Send tenant-facing reminders and payment notices by SMS when configured</p>
                    </div>
                    <Switch
                      checked={notificationSettings.notifySms}
                      onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, notifySms: checked }))}
                      className="flex-shrink-0"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                      <Label className="text-sm font-medium">WhatsApp Notifications</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">Enable WhatsApp delivery where provider credentials are configured</p>
                    </div>
                    <Switch
                      checked={notificationSettings.notifyWhatsapp}
                      onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, notifyWhatsapp: checked }))}
                      className="flex-shrink-0"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveNotifications} disabled={notificationSaving} size="sm">
                      {notificationSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Notifications
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      case "payments":
        return (
          <div className="space-y-6">
            <PaymentSetupStatus />
            <PaymentSettings />
          </div>
        );
      case "bank-integration":
        return (
          <div className="space-y-6">
            <BankIntegrationSettings />
            <UnmatchedBankTransactions />
          </div>
        );
      case "currency":
        return <CurrencySettings />;
      case "company":
        return <CompanySettings />;
      case "receipts":
        return <ReceiptSettings />;
      case "reminders":
        return <PaymentReminderSettings />;
      case "date-time":
        return <DateSettings />;
      case "submanagers":
        return <SubmanagerManagement />;
      case "roles":
        return <UserRoleManagement />;
      default:
        return null;
    }
  };

  const currentTab = settingsTabs.find((t) => t.id === activeTab);

  return (
    <Layout title="Settings" subtitle="Manage your account and preferences">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Mobile: Dropdown selector */}
        <div className="lg:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {currentTab && (
                  <span className="flex items-center gap-2">
                    <currentTab.icon className="h-4 w-4" />
                    {currentTab.label}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {settingsTabs.map((tab) => (
                <SelectItem key={tab.id} value={tab.id}>
                  <span className="flex items-center gap-2">
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Left sidebar nav */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <nav className="sticky top-20 space-y-1">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content area */}
        <div className="flex-1 max-w-2xl">
          {renderContent()}
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
