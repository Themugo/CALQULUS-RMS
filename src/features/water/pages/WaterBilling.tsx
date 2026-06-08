import { Layout } from "@/shared/components/layout/Layout";
import { WaterBillingManager } from "@/features/water/components/WaterBillingManager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useState } from "react";
import { Droplets, Building2 } from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent } from "@/shared/components/ui/card";

const WaterBilling = () => {
  const { user } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["manager-properties-simple", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("manager_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <Layout
      title="Water Billing"
      subtitle="Manage meter readings and water charges per property"
      headerActions={
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          <select
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={selectedProperty ?? ""}
            onChange={(e) => setSelectedProperty(e.target.value || null)}
          >
            <option value="">Select a property...</option>
            {properties.map((p: { id: string; name: string }) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      }
    >
      {!selectedProperty && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Droplets className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-muted-foreground">Select a property</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Choose a property from the dropdown above to manage its water billing.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {selectedProperty && !isLoading && (
        <WaterBillingManager
          propertyId={selectedProperty}
          propertyName={properties.find((p: { id: string; name: string }) => p.id === selectedProperty)?.name ?? "Property"}
        />
      )}
    </Layout>
  );
};

export default WaterBilling;
