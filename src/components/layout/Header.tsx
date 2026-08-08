'use client';

import { Bell } from 'lucide-react';
import { UserProfile } from '@/types';

interface HeaderProps {
  user: UserProfile;
  title: string;
  subtitle?: string;
}

export default function Header({ user, title, subtitle }: HeaderProps) {
  return (
    <header className="sticky top-14 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:top-0">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{title}</h1>
        {subtitle && <p className="line-clamp-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="relative inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-slate-100" aria-label="Notifications">
          <Bell className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-semibold text-sm uppercase">
            {user.full_name.charAt(0)}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-900 leading-tight">{user.full_name}</p>
            <p className="text-xs text-slate-500">{user.department}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
