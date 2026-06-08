import React from 'react';
import { Layout } from '@/shared/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Megaphone, Receipt } from 'lucide-react';
import BroadcastCenter from '@/features/communications/BroadcastCenter';
import PhysicalDocumentEntry from '@/features/communications/PhysicalDocumentEntry';

const CommunicationsPage: React.FC = () => (
  <Layout title="Communications" subtitle="Message tenants and record physical invoices & receipts">
    <Tabs defaultValue="broadcast" className="space-y-6">
      <TabsList>
        <TabsTrigger value="broadcast" className="gap-2">
          <Megaphone className="h-4 w-4" />
          Broadcast & Messages
        </TabsTrigger>
        <TabsTrigger value="physical" className="gap-2">
          <Receipt className="h-4 w-4" />
          Physical Documents
        </TabsTrigger>
      </TabsList>

      <TabsContent value="broadcast">
        <BroadcastCenter />
      </TabsContent>

      <TabsContent value="physical">
        <PhysicalDocumentEntry />
      </TabsContent>
    </Tabs>
  </Layout>
);

export default CommunicationsPage;
