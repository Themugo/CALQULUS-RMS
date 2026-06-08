import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Loader2, Building2, Upload, X, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/shared/hooks/use-toast";
import { useAuth } from "@/features/auth/AuthContext";
import { imageExtension, publicStoragePath } from "@/features/settings/lib/storagePaths";

// Helper to get current user ID for manager_user_id

export const CompanySettings = () => {
  const { toast } = useToast();
  const { isManager, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyWhatsapp, setCompanyWhatsapp] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [kraPin, setKraPin] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanySettings = async () => {
      if (!isManager) {
        setLoading(false);
        return;
      }

      try {
        // Load core company settings
        const { data, error } = await supabase
          .from("company_settings")
          .select("*")
          .eq("manager_user_id", user!.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setCompanyId(data.id);
          setCompanyName(data.company_name || "");
          setAddress(data.address || "");
          setCity(data.city || "");
          setState(data.state || "");
          setZipCode(data.zip_code || "");
          setCompanyEmail(data.email || "");
          setCompanyPhone(data.phone || "");
          setCompanyWebsite(data.website || "");
          setLogoUrl(data.logo_url || null);
        }

        // Load extended fields from agencies table (migration 014)
        if (user?.id) {
          const { data: agency } = await (supabase.from('agencies')
            .select('phone, email, address, county, kra_pin, registration_number, whatsapp, website')
            .eq('manager_id', user.id)
            .maybeSingle());
          if (agency) {
            const a = agency as { whatsapp?: string; county?: string; kra_pin?: string; registration_number?: string; phone?: string; email?: string; address?: string };
            setCompanyWhatsapp(a.whatsapp || "");
            setCounty(a.county || "");
            setKraPin(a.kra_pin || "");
            setRegistrationNumber(a.registration_number || "");
            const d = data as { phone?: string; email?: string; address?: string } | null;
            if (!d?.phone)   setCompanyPhone(a.phone || "");
            if (!d?.email)   setCompanyEmail(a.email || "");
            if (!d?.address) setAddress(a.address || "");
          }
        }
      } catch (error) {
        toast({
          title: "Company Settings Load Failed",
          description: error instanceof Error ? error.message : "Could not load company settings.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCompanySettings();
  }, [isManager, toast, user]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Logo must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      if (!user?.id) throw new Error("You must be signed in to upload a logo.");

      const fileExt = imageExtension(file);
      const fileName = `${user.id}/logo.${fileExt}`;

      // Delete old logo if exists
      if (logoUrl) {
        const oldPath = publicStoragePath(logoUrl, "company-logos");
        if (oldPath && oldPath !== fileName) {
          const { error: removeError } = await supabase.storage.from("company-logos").remove([oldPath]);
          if (removeError) console.warn("Company logo cleanup failed", removeError);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file, { cacheControl: "3600", contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      const newLogoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update database
      const { data: company, error: updateError } = await supabase
        .from("company_settings")
        .upsert({
          id: companyId ?? undefined,
          manager_user_id: user.id,
          company_name: companyName || "My Company",
          address,
          city,
          state,
          zip_code: zipCode,
          email: companyEmail,
          phone: companyPhone,
          website: companyWebsite,
          logo_url: newLogoUrl,
        })
        .select("id")
        .single();
      if (updateError) throw updateError;
      setCompanyId(company.id);
      setLogoUrl(newLogoUrl);

      toast({
        title: "Logo Uploaded",
        description: "Company logo has been updated.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl || !companyId) return;

    setUploading(true);
    try {
      // Delete from storage
      const fileName = publicStoragePath(logoUrl, "company-logos");
      if (fileName) {
        const { error: removeError } = await supabase.storage.from("company-logos").remove([fileName]);
        if (removeError) throw removeError;
      }

      // Update database
      const { error } = await supabase
        .from("company_settings")
        .update({ logo_url: null })
        .eq("id", companyId);

      if (error) throw error;

      setLogoUrl(null);
      toast({
        title: "Logo Removed",
        description: "Company logo has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!user?.id) throw new Error("You must be signed in to save company details.");

      // Fields company_settings actually has
      const companyPayload = {
        company_name: companyName,
        address,
        city,
        state,
        zip_code: zipCode,
        email: companyEmail,
        phone: companyPhone,
        website: companyWebsite,
        logo_url: logoUrl,
      };

      if (companyId) {
        const { error } = await supabase
          .from("company_settings")
          .update(companyPayload)
          .eq("id", companyId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("company_settings")
          .insert({ ...companyPayload, manager_user_id: user?.id })
          .select()
          .single();
        if (error) throw error;
        setCompanyId(data.id);
      }

      // Sync extended fields (county, kra_pin, whatsapp, registration_number)
      // to agencies table — these columns were added in migration 014
      if (user?.id) {
        const { error: agencyError } = await (supabase.from('agencies').upsert({
          manager_id: user.id,
          name: companyName || 'My Agency',
          email: companyEmail || null,
          phone: companyPhone || null,
          address: address || null,
          county: county || null,
          kra_pin: kraPin || null,
          registration_number: registrationNumber || null,
          whatsapp: companyWhatsapp || null,
          website: companyWebsite || null,
        }, { onConflict: 'manager_id' }));
        if (agencyError) throw agencyError;
      }

      toast({
        title: "Company Details Saved",
        description: "Your company information has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save company details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isManager) {
    return null;
  }

  return (
    <Card className="card-shadow animate-fade-in" style={{ animationDelay: "100ms" }}>
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Details
        </CardTitle>
        <CardDescription>Information displayed on contracts and invoices</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Logo Upload Section */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 rounded-lg border-2 border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <>
                      <img
                        src={logoUrl}
                        alt="Company logo"
                        className="h-full w-full object-contain"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={handleRemoveLogo}
                        disabled={uploading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {logoUrl ? "Change Logo" : "Upload Logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 2MB
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter business address"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="ZIP"
                />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium mb-3">Contact Information</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="company@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Phone</Label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="companyWebsite">Website</Label>
                <Input
                  id="companyWebsite"
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://www.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyWhatsapp">WhatsApp number</Label>
                <Input
                  id="companyWhatsapp"
                  value={companyWhatsapp}
                  onChange={(e) => setCompanyWhatsapp(e.target.value)}
                  placeholder="2547XXXXXXXX (international format)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="county">County</Label>
                <Input
                  id="county"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  placeholder="e.g. Nairobi, Mombasa, Kisumu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kraPin">KRA PIN</Label>
                <Input
                  id="kraPin"
                  value={kraPin}
                  onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                  placeholder="A012345678Z"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Business registration no.</Label>
                <Input
                  id="registrationNumber"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. CPR/2024/1234567"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 col-span-2">
                This contact information will appear on invoices and contracts
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Company Details
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
