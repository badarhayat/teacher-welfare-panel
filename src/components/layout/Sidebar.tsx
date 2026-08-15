'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  User,
  LogOut,
  Shield,
  Users,
  BarChart3,
  GraduationCap,
  Megaphone,
  UserCheck,
  CalendarClock,
  Ban,
  TrendingUp,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  user: UserProfile;
  open?: boolean;
  onClose?: () => void;
}

const teacherNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/issues', label: 'My Issues', icon: FileText },
  { href: '/dashboard/issues/new', label: 'New Issue', icon: PlusCircle },
  { href: '/dashboard/promotion', label: 'Promotion Data', icon: TrendingUp },
  { href: '/dashboard/profile', label: 'My Profile', icon: User },
];

const adminNav = [
  { href: '/admin', label: 'Admin Overview', icon: BarChart3 },
  { href: '/admin/issues', label: 'All Issues', icon: FileText },
  { href: '/admin/registrations', label: 'Registrations', icon: UserCheck },
  { href: '/admin/reports', label: 'Reports', icon: CalendarClock },
  { href: '/admin/transparency', label: 'Transparency', icon: Megaphone },
  { href: '/admin/users', label: 'Faculty List', icon: Users },
  { href: '/admin/promotion', label: 'Promotion Data', icon: TrendingUp },
  { href: '/admin/blocked-emails', label: 'Blocked Emails', icon: Ban },
];

export default function Sidebar({ user, open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems = user.role === 'admin' ? adminNav : teacherNav;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    onClose?.();
  }, [pathname, onClose]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={onClose}
          aria-label="Close navigation menu"
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-dvh w-64 flex-col overflow-y-auto bg-[#0f2744] shadow-xl transition-transform duration-200 lg:z-30 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
      >
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Teacher Welfare</p>
            <p className="text-blue-300 text-xs">Panel</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-blue-200 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm uppercase flex-shrink-0">
            {user.full_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.full_name}</p>
            <p className="text-blue-300 text-xs truncate">{user.designation}</p>
          </div>
        </div>
        {user.role === 'admin' && (
          <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 rounded-md">
            <Shield className="w-3 h-3 text-amber-400" />
            <span className="text-amber-400 text-xs font-medium">Administrator</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-blue-200 hover:bg-white/8 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* Admin can also access user dashboard */}
        {user.role === 'admin' && (
          <div className="pt-3 mt-3 border-t border-white/10">
            <Link
              href="/dashboard"
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                pathname === '/dashboard'
                  ? 'bg-white/15 text-white'
                  : 'text-blue-200 hover:bg-white/8 hover:text-white'
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              User Dashboard
            </Link>
          </div>
        )}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-200 transition-all duration-150 hover:bg-white/8 hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
      </aside>
    </>
  );
}
