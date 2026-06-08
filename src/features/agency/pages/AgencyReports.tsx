import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import AgencyLayout from '@/features/agency/components/AgencyLayout';
import Reports from '@/features/reports/pages/Reports';

const AgencyReports = () => {
  const { user, userRole, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user || userRole?.role !== 'agency') return <Navigate to="/agency/login" replace />;
  return (
    <AgencyLayout title="Reports">
      <Reports />
    </AgencyLayout>
  );
};

export default AgencyReports;
