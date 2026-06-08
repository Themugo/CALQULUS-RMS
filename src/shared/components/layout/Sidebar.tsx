import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Settings, LogOut, ChevronRight, ChevronLeft, X,
  Globe, Shield, Users, FileText, Wrench,
  Calendar, CreditCard, BarChart3, Droplets, Mail,
  Handshake, FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { useViewOnly } from "@/shared/contexts/ViewOnlyContext";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import rentflowLogo from "@/assets/rentflow-logo.png";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

const managerNav: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Leases", href: "/leases", icon: FileText },
  { name: "Tenants", href: "/tenants", icon: Users },
  { name: "Invites", href: "/invites", icon: Mail },
  { name: "Vacation Notices", href: "/vacation-notices", icon: Calendar },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Water Billing", href: "/water-billing", icon: Droplets },
  { name: "Statements", href: "/statements", icon: FileSpreadsheet },
  { name: "Maintenance", href: "/maintenance", icon: Wrench },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

const webhostNav: NavItem[] = [
  { name: "Webhost Portal", href: "/webhost", icon: Shield },
];

const agencyNav: NavItem[] = [
  { name: "Agency Portal", href: "/agency", icon: Handshake },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isWebhost, isAgency } = useAuth();
  const { isViewOnly } = useViewOnly();
  const [collapsed, setCollapsed] = useState(false);

  const navigation = isWebhost
    ? webhostNav
    : isAgency
    ? agencyNav
    : managerNav;

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => onClose?.()}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen flex flex-col sidebar-gradient transition-all duration-300 ease-in-out",
          "lg:translate-x-0",
          collapsed ? "w-16" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border flex-shrink-0",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}>
          {collapsed ? (
            <img src={rentflowLogo} alt="RF" className="h-8 w-auto" />
          ) : (
            <div className="flex items-center gap-3">
              <img src={rentflowLogo} alt="RentFlow" className="h-9 w-auto" />
            </div>
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon"
              className="hidden lg:flex text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-8 w-8"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost" size="icon"
              className="lg:hidden text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-1 scrollbar-hide">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleNavClick}
                className={cn(
                  "group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation",
                  collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                    : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={cn(
                  "h-4 w-4 flex-shrink-0",
                  active ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-primary"
                )} />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge && (
                      <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-sidebar-primary text-sidebar-primary-foreground">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn(
          "border-t border-sidebar-border flex-shrink-0",
          collapsed ? "p-2" : "p-3"
        )}>
          {!collapsed && user && (
            <p className="text-xs text-sidebar-muted truncate px-3 mb-2">{user.email}</p>
          )}
          {isViewOnly ? (
            <button
              onClick={() => navigate('/webhost')}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-colors touch-manipulation",
                collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                "text-purple-400 hover:bg-sidebar-accent/50 hover:text-purple-300"
              )}
              title={collapsed ? "Back to Webhost Portal" : undefined}
            >
              <Globe className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>Back to Webhost Portal</span>}
            </button>
          ) : (
            <button
              onClick={handleSignOut}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-colors touch-manipulation",
                collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
              title={collapsed ? "Sign Out" : undefined}
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
