
"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, BookOpen, LayoutDashboard, Package, Archive, ClipboardList, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

export function BottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dash', icon: LayoutDashboard },
    { href: '/admin/assets', label: 'Assets', icon: Package },
    { href: '/admin/inventory', label: 'Units', icon: Archive },
    { href: '/admin/requests', label: 'Reqs', icon: ClipboardList },
    { href: '/admin/users', label: 'Users', icon: Users },
  ];

  const userLinks = [
    { href: '/user/catalogue', label: 'Search', icon: Search },
    { href: '/user/my-requests', label: 'My Reqs', icon: BookOpen },
  ];

  const links = user.role === 'admin' ? adminLinks : userLinks;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 px-1 py-1 h-16 flex items-center justify-around shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link key={link.href} href={link.href} className="flex-1 min-w-0">
            <div className={cn(
              "flex flex-col items-center justify-center gap-0.5 h-full transition-colors rounded-lg py-1",
              isActive ? "text-primary bg-primary/5" : "text-muted-foreground"
            )}>
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-medium leading-none truncate w-full text-center px-0.5">{link.label}</span>
            </div>
          </Link>
        );
      })}
      <button 
        onClick={logout}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-destructive min-w-0"
      >
        <LogOut className="h-5 w-5" />
        <span className="text-[9px] font-medium leading-none">Exit</span>
      </button>
    </nav>
  );
}
