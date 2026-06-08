import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Badge } from "@/shared/components/ui/badge";
import { 
  Building2, Users, FileText, CreditCard, Settings, 
  CheckCircle, Circle, ArrowRight, Rocket, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useManagerScope } from "@/shared/hooks/useManagerScope";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  completed: boolean;
}

interface OnboardingWizardProps {
  onDismiss: () => void;
}

export function OnboardingWizard({ onDismiss }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const { managerId } = useManagerScope();
  const [steps, setSteps] = useState<OnboardingStep[]>([
    { id: "property", title: "Add your first property", description: "Register a property to start managing units", icon: Building2, route: "/properties", completed: false },
    { id: "tenant", title: "Add a tenant", description: "Onboard tenants to your properties", icon: Users, route: "/tenants", completed: false },
    { id: "lease", title: "Create a lease", description: "Set up lease agreements for your tenants", icon: FileText, route: "/leases", completed: false },
    { id: "billing", title: "Set up billing", description: "Configure payment methods and create invoices", icon: CreditCard, route: "/billing", completed: false },
    { id: "settings", title: "Configure settings", description: "Set up company details and preferences", icon: Settings, route: "/settings", completed: false },
  ]);

  const checkProgress = useCallback(async () => {
    if (!managerId) return;

    const [properties, tenants, leases, invoices, company] = await Promise.all([
      supabase.from("properties").select("id", { count: "exact", head: true }).eq("manager_id", managerId),
      supabase.from("tenants").select("id", { count: "exact", head: true }).eq("manager_id", managerId),
      supabase.from("leases").select("id", { count: "exact", head: true }).eq("manager_id", managerId),
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("manager_id", managerId),
      supabase.from("company_settings").select("id", { count: "exact", head: true }).eq("manager_user_id", managerId),
    ]);

    setSteps(prev => prev.map(step => {
      switch (step.id) {
        case "property": return { ...step, completed: (properties.count || 0) > 0 };
        case "tenant": return { ...step, completed: (tenants.count || 0) > 0 };
        case "lease": return { ...step, completed: (leases.count || 0) > 0 };
        case "billing": return { ...step, completed: (invoices.count || 0) > 0 };
        case "settings": return { ...step, completed: (company.count || 0) > 0 };
        default: return step;
      }
    }));
  }, [managerId]);

  useEffect(() => {
    checkProgress();
  }, [checkProgress]);

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  if (completedCount === steps.length) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Getting Started</CardTitle>
            <Badge variant="secondary" className="text-xs">{completedCount}/{steps.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => !step.completed && navigate(step.route)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                step.completed 
                  ? 'bg-muted/50 opacity-60' 
                  : 'hover:bg-muted/80 cursor-pointer'
              }`}
            >
              {step.completed ? (
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.completed ? 'line-through' : ''}`}>{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {!step.completed && <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
