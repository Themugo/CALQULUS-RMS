import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { Layout } from '@/shared/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Store, Briefcase, ClipboardList, CheckCircle, Clock,
  Wrench, Star, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import ServiceMarketplace from '../components/ServiceMarketplace';
import ServiceProviderProfile from '../components/ServiceProviderProfile';

const STATUS_COLORS: Record<string, string> = {
  open:        'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  completed:   'bg-green-100 text-green-800 border-green-200',
  cancelled:   'bg-slate-100 text-slate-600 border-slate-200',
};

const ServicesPage: React.FC = () => {
  const { user } = useAuth();

  // Check if this user has a provider profile
  const { data: myProvider, isLoading: providerLoading } = useQuery({
    queryKey: ['my-provider-profile-check', user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from('service_providers')
        .select('id, business_name, is_available, rating_avg, rating_count, jobs_completed, status')
        .eq('user_id', user!.id).maybeSingle());
      return data as { id: string; business_name: string | null; is_available: boolean | null; rating_avg: number | null; rating_count: number | null; jobs_completed: number | null; status: string | null; } | null;
    },
    enabled: !!user?.id,
  });

  // Jobs assigned to this provider
  const { data: assignedJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['provider-assigned-jobs', myProvider?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('maintenance_requests')
        .select('id, title, description, property_name, unit_number, priority, status, requested_date, quoted_amount, agreed_amount')
        .eq('assigned_provider_id', myProvider!.id)
        .order('requested_date', { ascending: false });
      return (data || []) as { id: string; title: string | null; description: string | null; property_name: string | null; unit_number: string | null; priority: string | null; status: string | null; requested_date: string | null; quoted_amount: number | null; agreed_amount: number | null; }[];
    },
    enabled: !!myProvider?.id,
  });

  const activeJobs = assignedJobs.filter(j => j.status === 'in_progress' || j.status === 'open');
  const completedJobs = assignedJobs.filter(j => j.status === 'completed');

  return (
    <Layout
      title="Services"
      subtitle="Find verified repair professionals with RentFlow work history"
    >
      <Tabs defaultValue="marketplace">
        <TabsList className="flex-wrap h-auto gap-1 p-1 mb-6">
          <TabsTrigger value="marketplace" className="gap-1.5">
            <Store className="h-4 w-4" />
            Marketplace
          </TabsTrigger>
          {myProvider && (
            <TabsTrigger value="my-profile" className="gap-1.5">
              <Briefcase className="h-4 w-4" />
              Provider profile
              <Badge variant="outline" className="ml-1 text-xs bg-green-100 text-green-800 border-green-300">Active</Badge>
            </TabsTrigger>
          )}
          {myProvider && (
            <TabsTrigger value="my-jobs" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              My jobs
              {activeJobs.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">{activeJobs.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Marketplace ── */}
        <TabsContent value="marketplace">
          <ServiceMarketplace />
        </TabsContent>

        {/* ── My provider profile ── */}
        {myProvider && (
          <TabsContent value="my-profile">
            <ServiceProviderProfile />
          </TabsContent>
        )}

        {/* ── My jobs (provider view) ── */}
        {myProvider && (
          <TabsContent value="my-jobs">
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Active jobs',    value: activeJobs.length,     color: 'text-amber-600' },
                  { label: 'Completed',      value: completedJobs.length,  color: 'text-green-700' },
                  { label: 'Rating',         value: myProvider.rating_count > 0 ? `${Number(myProvider.rating_avg).toFixed(1)}★` : '—', color: 'text-amber-500' },
                ].map(k => (
                  <div key={k.label} className="rounded-xl border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                    <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {jobsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : assignedJobs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No jobs assigned yet</p>
                  <p className="text-xs mt-1">Make sure your profile is complete and visible in the marketplace</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignedJobs.map(job => (
                    <Card key={job.id} className="border border-border hover:border-primary/40 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-semibold text-sm">{job.title}</p>
                              <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[job.status] ?? ''}`}>
                                {job.status?.replace('_', ' ')}
                              </Badge>
                              {job.priority === 'urgent' && (
                                <Badge className="text-xs bg-red-100 text-red-800 border-red-200">Urgent</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              {job.property_name}{job.unit_number ? ` · Unit ${job.unit_number}` : ''}
                            </p>
                            {job.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{job.description}</p>
                            )}
                            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(job.requested_date), 'dd/MM/yy')}
                              </span>
                              {job.agreed_amount && (
                                <span className="text-green-700 font-medium">
                                  Agreed: KES {Number(job.agreed_amount).toLocaleString()}
                                </span>
                              )}
                              {job.quoted_amount && !job.agreed_amount && (
                                <span className="text-amber-700">
                                  Quoted: KES {Number(job.quoted_amount).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">
                            {job.status === 'open' && (
                              <Button size="sm" className="h-8 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase.from('maintenance_requests')
                                      .update({ status: 'in_progress', provider_started_at: new Date().toISOString() } as { status: string; provider_started_at: string; })
                                      .eq('id', job.id);
                                    if (error) throw error;
                                    toast({ title: 'Job started' });
                                  } catch (e) {
                                    toast({ title: 'Error', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
                                  }
                                }}>
                                Start job
                              </Button>
                            )}
                            {job.status === 'in_progress' && (
                              <Button size="sm" className="h-8 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase.from('maintenance_requests')
                                      .update({ status: 'completed', provider_completed_at: new Date().toISOString(), completion_date: new Date().toISOString().slice(0,10) } as { status: string; provider_completed_at: string; completion_date: string; })
                                      .eq('id', job.id);
                                    if (error) throw error;
                                    toast({ title: 'Job completed' });
                                  } catch (e) {
                                    toast({ title: 'Error', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
                                  }
                                }}>
                                <CheckCircle className="h-3.5 w-3.5" />Mark done
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </Layout>
  );
};

export default ServicesPage;
