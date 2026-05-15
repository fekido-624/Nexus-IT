
"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  Settings, 
  Users, 
  LogOut,
  Archive,
  Search,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

export function SidebarNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/assets', label: 'Asset Management', icon: Package },
    { href: '/admin/inventory', label: 'Unit Inventory', icon: Archive },
    { href: '/admin/requests', label: 'Borrow Requests', icon: ClipboardList },
    { href: '/admin/users', label: 'User Management', icon: Users },
  ];

  const userLinks = [
    { href: '/user/catalogue', label: 'Asset Catalogue', icon: Search },
    { href: '/user/my-requests', label: 'My Requests', icon: BookOpen },
  ];

  const links = user.role === 'admin' ? adminLinks : userLinks;

  return (
    <div className="hidden lg:flex flex-col w-64 bg-card border-r h-screen sticky top-0">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <Package className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-primary">IT Asset Nexus</h1>
        </div>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <span className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <Icon className="h-5 w-5" />
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t">
        <div className="bg-muted/50 rounded-xl p-4 mb-4">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Logged in as</p>
          <p className="font-bold text-sm truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.department}</p>
        </div>
        <Button 
          variant="outline" 
          className="w-full flex items-center gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
