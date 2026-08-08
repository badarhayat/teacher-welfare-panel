'use client';

import { useCallback, useState } from 'react';
import { Menu } from 'lucide-react';
import { UserProfile } from '@/types';
import Sidebar from './Sidebar';

interface AppShellProps {
  user: UserProfile;
  children: React.ReactNode;
}

export default function AppShell({ user, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} open={menuOpen} onClose={closeMenu} />
      <div className="flex min-h-screen min-w-0 flex-col lg:ml-64">
        <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="truncate text-sm font-semibold text-slate-900">Teacher Welfare Panel</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}