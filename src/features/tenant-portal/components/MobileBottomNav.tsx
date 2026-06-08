import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Wrench, MessageSquare, FolderOpen, User, Store } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  activeMatch?: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Invoices',
    icon: FileText,
    href: '/portal',
    activeMatch: ['/portal'],
  },
  {
    label: 'Maintenance',
    icon: Wrench,
    href: '/portal/maintenance',
    activeMatch: ['/portal/maintenance'],
  },
  {
    label: 'Services',
    icon: Store,
    href: '/portal/services',
    activeMatch: ['/portal/services'],
  },
  {
    label: 'Inbox',
    icon: MessageSquare,
    href: '/portal/inbox',
    activeMatch: ['/portal/inbox', '/portal/vacation-notices'],
  },
  {
    label: 'Documents',
    icon: FolderOpen,
    href: '/portal/documents',
    activeMatch: ['/portal/documents', '/portal/contracts'],
  },
  {
    label: 'Profile',
    icon: User,
    href: '/portal/profile',
    activeMatch: ['/portal/profile'],
  },
];

const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  const isActive = (item: NavItem) => {
    if (item.activeMatch && item.activeMatch.length > 0) {
      return item.activeMatch.some(match => location.pathname === match);
    }
    return location.pathname === item.href;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-primary')} />
              <span className={cn('text-xs', active && 'font-medium')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
