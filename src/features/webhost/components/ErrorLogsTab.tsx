import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { AlertTriangle, Bug, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface ErrorLog {
  id: string;
  action: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  entity_label: string | null;
}

export default function ErrorLogsTab() {
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['error-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .or('action.like.error:%,action.like.warning:%')
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  const errors   = logs.filter((l: ErrorLog) => l.action?.startsWith('error:'));
  const warnings = logs.filter((l: ErrorLog) => l.action?.startsWith('warning:'));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Bug className="h-8 w-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold text-red-700">{errors.length}</div>
              <div className="text-sm text-red-600">Errors (last 100)</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-2xl font-bold text-amber-700">{warnings.length}</div>
              <div className="text-sm text-amber-600">Warnings</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Info className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{logs.length}</div>
              <div className="text-sm text-muted-foreground">Total events</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Log Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Error Logs</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bug className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No errors logged — all systems healthy ✓
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log: ErrorLog) => {
                const isError = log.action?.startsWith('error:');
                const context = log.action?.replace('error:', '').replace('warning:', '') || '';
                const meta = log.metadata as Record<string, unknown> | null;
                return (
                  <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <Badge
                        variant={isError ? 'destructive' : 'secondary'}
                        className="mt-0.5 shrink-0"
                      >
                        {isError ? 'error' : 'warning'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm font-mono">{context}</span>
                          {meta?.url && (
                            <span className="text-xs text-muted-foreground">{meta.url}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 break-words">
                          {log.entity_label || meta?.message || 'No message'}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(log.created_at).toLocaleString('en-KE', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Errors are logged automatically from the app. Auto-refreshes every 30 seconds.
        To view in Supabase SQL:{' '}
        <code className="bg-muted px-1 rounded">
          SELECT * FROM activity_logs WHERE action LIKE 'error:%' ORDER BY created_at DESC;
        </code>
      </p>
    </div>
  );
}
