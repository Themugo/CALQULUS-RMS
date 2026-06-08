import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Building2, Users, FileText, CreditCard, Wrench } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/shared/lib/utils";
import { useManagerScope } from "@/shared/hooks/useManagerScope";

interface SearchResult {
  id: string;
  type: "property" | "tenant" | "invoice" | "lease" | "maintenance";
  title: string;
  subtitle: string;
  route: string;
}

const typeConfig = {
  property: { icon: Building2, color: "text-blue-500", label: "Property" },
  tenant: { icon: Users, color: "text-emerald-500", label: "Tenant" },
  invoice: { icon: CreditCard, color: "text-amber-500", label: "Invoice" },
  lease: { icon: FileText, color: "text-purple-500", label: "Lease" },
  maintenance: { icon: Wrench, color: "text-red-500", label: "Maintenance" },
};

export function GlobalSearch() {
  const { managerId, restrictToAssignedProperties, assignedPropertyIds } = useManagerScope();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (!managerId) {
          setResults([]);
          setIsOpen(false);
          return;
        }
        if (restrictToAssignedProperties && assignedPropertyIds.length === 0) {
          setResults([]);
          setIsOpen(false);
          return;
        }

        const searchTerm = `%${query}%`;
        let propertyQuery = supabase
          .from("properties")
          .select("id, name, address")
          .eq("manager_id", managerId)
          .ilike("name", searchTerm)
          .limit(5);
        let tenantQuery = supabase
          .from("tenants")
          .select("id, name, email, property, unit")
          .eq("manager_id", managerId)
          .ilike("name", searchTerm)
          .limit(5);
        let invoiceQuery = supabase
          .from("invoices")
          .select("id, invoice_number, description, amount, status, tenant_id")
          .eq("manager_id", managerId)
          .ilike("invoice_number", searchTerm)
          .limit(5);

        if (restrictToAssignedProperties) {
          propertyQuery = propertyQuery.in("id", assignedPropertyIds);
          tenantQuery = tenantQuery.in("property_id", assignedPropertyIds);

          const { data: scopedTenants } = await supabase
            .from("tenants")
            .select("id")
            .eq("manager_id", managerId)
            .in("property_id", assignedPropertyIds);
          const scopedTenantIds = (scopedTenants || []).map((tenant) => tenant.id);
          if (scopedTenantIds.length === 0) {
            const [properties, tenants] = await Promise.all([propertyQuery, tenantQuery]);
            const searchResults: SearchResult[] = [
              ...(properties.data || []).map(p => ({
                id: p.id, type: "property" as const,
                title: p.name, subtitle: p.address,
                route: `/properties/${p.id}`,
              })),
              ...(tenants.data || []).map(t => ({
                id: t.id, type: "tenant" as const,
                title: t.name, subtitle: `${t.property || ''} · ${t.unit || ''}`,
                route: `/tenants?highlight=${t.id}`,
              })),
            ];
            setResults(searchResults);
            setIsOpen(searchResults.length > 0);
            return;
          }
          invoiceQuery = invoiceQuery.in("tenant_id", scopedTenantIds);
        }

        const [properties, tenants, invoices] = await Promise.all([
          propertyQuery,
          tenantQuery,
          invoiceQuery,
        ]);

        const searchResults: SearchResult[] = [
          ...(properties.data || []).map(p => ({
            id: p.id, type: "property" as const,
            title: p.name, subtitle: p.address,
            route: `/properties/${p.id}`,
          })),
          ...(tenants.data || []).map(t => ({
            id: t.id, type: "tenant" as const,
            title: t.name, subtitle: `${t.property || ''} · ${t.unit || ''}`,
            route: `/tenants?highlight=${t.id}`,
          })),
          ...(invoices.data || []).map(i => ({
            id: i.id, type: "invoice" as const,
            title: i.invoice_number,
            subtitle: `${i.status} · KES ${Number(i.amount).toLocaleString()}${i.description ? ` · ${i.description}` : ''}`,
            route: `/billing?invoice=${i.id}`,
          })),
        ];

        setResults(searchResults);
        setIsOpen(searchResults.length > 0);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [assignedPropertyIds, managerId, query, restrictToAssignedProperties]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.route);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative hidden lg:block" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder="Search tenants, properties, invoices..."
        className="w-72 pl-9 pr-8 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-accent"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
      />
      {query && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No results found</div>
          ) : (
            results.map((result) => {
              const config = typeConfig[result.type];
              const Icon = config.icon;
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/80 transition-colors"
                  onClick={() => handleSelect(result)}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", config.color)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex-shrink-0">
                    {config.label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
