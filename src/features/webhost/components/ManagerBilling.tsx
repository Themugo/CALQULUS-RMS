import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useToast } from '@/shared/hooks/use-toast';
import { FileText, Receipt, LayoutDashboard, TrendingUp, Settings, Users, Building2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import BillingOverview from './BillingOverview';
import ManagerInvoices, { ManagerInvoice, BILLING_CONFIG } from './ManagerInvoices';
import ManagerReceipts from './ManagerReceipts';
import BillingAnalytics from './BillingAnalytics';
import WebhostPaymentSettings from './WebhostPaymentSettings';
import LandlordBilling from './LandlordBilling';
import ManagerBillingDrilldown from './ManagerBillingDrilldown';

interface Manager {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  property_count: number;
  has_registration_invoice: boolean;
  net_collection: number;
}

const ManagerBilling = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check for payment success/failure in URL
  useEffect(() => {
    const payment = searchParams.get('payment');
    
    if (payment === 'success') {
      toast({ 
        title: 'Payment processing', 
        description: 'Please wait while we confirm your payment. This may take a few moments.' 
      });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['manager-invoices'] }), 3000);
      setSearchParams({});
    } else if (payment === 'cancelled') {
      toast({ title: 'Payment cancelled', variant: 'destructive' });
      setSearchParams({});
    }
  }, [searchParams, toast, queryClient, setSearchParams]);

  // Fetch payment settings
  const { data: paymentSettings } = useQuery({
    queryKey: ['webhost-payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhost_payment_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch managers with property count and net collection
  const { data: managers } = useQuery({
    queryKey: ['webhost-managers-for-billing'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('id, user_id, created_at')
        .eq('role', 'manager');

      if (error) throw error;

      const managersWithDetails = await Promise.all(
        (roles || []).map(async (role) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', role.user_id)
            .single();

          // Count properties for this manager
          const { count: propertyCount } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('manager_id', role.user_id);

          // Check if manager has a registration invoice
          const { data: regInvoice } = await supabase
            .from('manager_invoices')
            .select('id')
            .eq('manager_user_id', role.user_id)
            .eq('invoice_type', 'registration')
            .maybeSingle();

          // net_collection: platform billing only — how much the manager has paid to the platform
          // We do NOT query tenant rent payments (that data belongs to the manager only)
          const { data: paidManagerInvoices } = await supabase
            .from('manager_invoices')
            .select('amount')
            .eq('manager_user_id', role.user_id)
            .eq('status', 'paid');

          const netCollection = (paidManagerInvoices || []).reduce(
            (sum, inv) => sum + Number(inv.amount), 0
          );

          return {
            id: role.id,
            user_id: role.user_id,
            email: profile?.email || 'Unknown',
            full_name: profile?.full_name || null,
            property_count: propertyCount || 0,
            has_registration_invoice: !!regInvoice,
            net_collection: netCollection,
          };
        })
      );

      return managersWithDetails as Manager[];
    },
  });

  // Fetch manager invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['manager-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manager_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ManagerInvoice[];
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['manager-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['webhost-managers-for-billing'] });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-slate-800/50 border border-purple-800/30">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300"
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="invoices" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300"
          >
            <FileText className="h-4 w-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger 
            value="receipts" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Receipts
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger 
            value="landlords"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Landlords
          </TabsTrigger>
          <TabsTrigger 
            value="per-manager"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300"
          >
            <Users className="h-4 w-4 mr-2" />
            Per Manager
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <BillingOverview managers={managers} invoices={invoices} paymentSettings={paymentSettings} />
        </TabsContent>

        <TabsContent value="invoices">
          <ManagerInvoices 
            managers={managers} 
            invoices={invoices} 
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="receipts">
          <ManagerReceipts 
            managers={managers} 
            invoices={invoices} 
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <BillingAnalytics />
        </TabsContent>

        <TabsContent value="settings">
          <WebhostPaymentSettings />
        </TabsContent>

        <TabsContent value="landlords">
          <LandlordBilling />
        </TabsContent>

        <TabsContent value="per-manager">
          <ManagerBillingDrilldown />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManagerBilling;
