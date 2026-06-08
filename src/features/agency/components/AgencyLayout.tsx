import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Building2, Users, LogOut, LayoutDashboard, FileText,
  Wrench, CreditCard, Settings, BarChart3, Menu, X,
  Calendar, Handshake, Droplets, Mail, FileSpreadsheet,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/agency', icon: LayoutDashboard },
  { label: 'Properties', href: '/agency/properties', icon: Building2 },
  { label: 'Tenants', href: '/agency/tenants', icon: Users },
  { label: 'Leases', href: '/agency/leases', icon: FileText },
  { label: 'Landlords', href: '/agency/landlords', icon: Handshake },
  { label: 'Billing', href: '/agency/billing', icon: CreditCard },
  { label: 'Water Billing', href: '/agency/water-billing', icon: Droplets },
  { label: 'Invites', href: '/agency/invites', icon: Mail },
  { label: 'Statements', href: '/agency/statements', icon: FileSpreadsheet },
  { label: 'Maintenance', href: '/agency/maintenance', icon: Wrench },
  { label: 'Vacation Notices', href: '/agency/vacation-notices', icon: Calendar },
  { label: 'Reports', href: '/agency/reports', icon: BarChart3 },
  { label: 'Settings', href: '/agency/settings', icon: Settings },
];

interface AgencyLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AgencyLayout = ({ children, title }: AgencyLayoutProps) => {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed left-0 top-0 z-50 h-full w-64 bg-slate-900/95 border-r border-emerald-800/30 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-emerald-800/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Handshake className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Agency Portal</p>
              <p className="text-xs text-emerald-300">Property Agent</p>
            </div>
          </div>
          <button className="lg:hidden text-emerald-300" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
          {navItems.map(item => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-300 hover:bg-emerald-900/30 hover:text-white transition-colors"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 border-b border-emerald-800/30 bg-slate-900/60 backdrop-blur-sm">
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="lg:hidden text-emerald-300" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <Handshake className="h-5 w-5 text-emerald-400 hidden sm:block" />
              <div>
                <h1 className="text-sm font-bold text-white">{title || 'Agency Portal'}</h1>
                <p className="text-xs text-emerald-400">{user?.email}</p>
              </div>
              <Badge variant="outline" className="border-emerald-600 text-emerald-300 bg-emerald-900/30 text-xs">
                Agency
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-emerald-300 hover:text-white">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AgencyLayout;
