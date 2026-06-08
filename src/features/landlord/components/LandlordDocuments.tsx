import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  FileText, Download, BarChart3, ClipboardCheck,
  Home, FileSpreadsheet, Clock
} from 'lucide-react';
import { format } from 'date-fns';

const DOC_TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  financial_statement:  { label: 'Financial statement', icon: BarChart3,       color: 'text-green-600' },
  inspection_report:    { label: 'Inspection report',   icon: ClipboardCheck,  color: 'text-blue-600' },
  occupancy_report:     { label: 'Occupancy report',    icon: Home,            color: 'text-purple-600' },
  lease_summary:        { label: 'Lease summary',       icon: FileText,        color: 'text-amber-600' },
  maintenance_summary:  { label: 'Maintenance summary', icon: FileSpreadsheet, color: 'text-red-600' },
  property_photo:       { label: 'Property photo',      icon: Home,            color: 'text-slate-600' },
  custom:               { label: 'Document',            icon: FileText,        color: 'text-slate-600' },
};

const LandlordDocuments: React.FC = () => {
  const { user } = useAuth();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['landlord-documents', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('landlord_documents')
        .select('*, properties(name)')
        .eq('landlord_user_id', user!.id)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });
      return (data || []) as Array<{ id: string; document_type: string; title: string; properties?: { name: string }; period_start?: string; period_end?: string; file_url?: string; created_at: string }>;
    },
    enabled: !!user?.id,
  });

  const byType = (type: string) => documents.filter(d => d.document_type === type);
  const allTypes = Array.from(new Set(documents.map(d => d.document_type)));

  if (isLoading) return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
    </div>
  );

  if (documents.length === 0) return (
    <div className="py-16 text-center text-muted-foreground">
      <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="font-medium">No documents yet</p>
      <p className="text-sm mt-1 opacity-70">
        Your property manager will upload financial statements, inspection reports, and other documents here.
      </p>
    </div>
  );

  const DocRow = ({ doc }: { doc: { id: string; document_type: string; title: string; properties?: { name: string }; period_start?: string; period_end?: string; file_url?: string; created_at: string } }) => {
    const cfg = DOC_TYPE_CONFIG[doc.document_type] ?? DOC_TYPE_CONFIG.custom;
    const Icon = cfg.icon;
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
            <Icon className={`h-4 w-4 ${cfg.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{doc.title}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
              {doc.properties?.name && <span className="text-xs text-muted-foreground">{doc.properties.name}</span>}
              {doc.period_start && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(doc.period_start), 'MMM yyyy')}
                  {doc.period_end && doc.period_end !== doc.period_start && ` – ${format(new Date(doc.period_end), 'MMM yyyy')}`}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{format(new Date(doc.created_at), 'dd/MM/yy')}</span>
            </div>
            {doc.description && <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>}
          </div>
        </div>
        {doc.document_url && (
          <a href={doc.document_url} target="_blank" rel="noopener noreferrer" className="shrink-0 ml-3">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="text-xs">All ({documents.length})</TabsTrigger>
          {allTypes.map(t => {
            const cfg = DOC_TYPE_CONFIG[t] ?? DOC_TYPE_CONFIG.custom;
            const count = byType(t).length;
            return (
              <TabsTrigger key={t} value={t} className="text-xs">
                {cfg.label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="pt-4 space-y-2">
              {documents.map(doc => <DocRow key={doc.id} doc={doc} />)}
            </CardContent>
          </Card>
        </TabsContent>

        {allTypes.map(t => (
          <TabsContent key={t} value={t} className="mt-4">
            <Card>
              <CardContent className="pt-4 space-y-2">
                {byType(t).map(doc => <DocRow key={doc.id} doc={doc} />)}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default LandlordDocuments;
