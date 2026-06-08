import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { UserPlus, FileText, Wrench, Building2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ManagerQuickActionsProps {
  hasProperties: boolean;
}

export function ManagerQuickActions({ hasProperties: _hasProperties }: ManagerQuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    { 
      label: "Add Property", 
      icon: Building2, 
      onClick: () => navigate("/properties"), 
      color: "from-blue-500 to-blue-600",
      description: "Register a new property"
    },
    { 
      label: "Add Tenant", 
      icon: UserPlus, 
      onClick: () => navigate("/tenants"), 
      color: "from-emerald-500 to-emerald-600",
      description: "Onboard a new tenant"
    },
    { 
      label: "Create Invoice", 
      icon: FileText, 
      onClick: () => navigate("/billing"), 
      color: "from-amber-500 to-amber-600",
      description: "Bill a tenant"
    },
    { 
      label: "Maintenance", 
      icon: Wrench, 
      onClick: () => navigate("/maintenance"), 
      color: "from-purple-500 to-purple-600",
      description: "Track repairs"
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2 group hover:shadow-md transition-all duration-200 border-border/50"
              onClick={action.onClick}
            >
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium">{action.label}</span>
              <span className="text-[10px] text-muted-foreground">{action.description}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
