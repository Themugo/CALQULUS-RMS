import { Layout } from "@/shared/components/layout/Layout";
import { InvitationTracker } from "@/features/tenants/components/InvitationTracker";
import { InviteTenantDialog } from "@/features/tenants/components/InviteTenantDialog";
import { UserPlus, Mail } from "lucide-react";

const Invites = () => {
  return (
    <Layout
      title="Invites"
      subtitle="Send and track tenant invitations"
      headerActions={
        <InviteTenantDialog trigger={
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <UserPlus className="h-4 w-4" />
            Invite Tenant
          </button>
        } />
      }
    >
      <div className="space-y-6">
        <InvitationTracker />
      </div>
    </Layout>
  );
};

export default Invites;
