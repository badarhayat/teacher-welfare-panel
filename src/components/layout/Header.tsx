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
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
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
