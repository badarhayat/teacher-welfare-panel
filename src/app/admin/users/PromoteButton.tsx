'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  userId: string;
  initialRole: string;
  currentAdminId: string;
}

export default function PromoteButton({ userId, initialRole, currentAdminId }: Props) {
  const supabase = createClient();
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);

  // Prevent an admin from demoting themselves
  const isSelf = userId === currentAdminId;

  async function toggleRole() {
    setLoading(true);
    const newRole = role === 'admin' ? 'teacher' : 'admin';
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    if (!error) setRole(newRole);
    setLoading(false);
  }

  if (isSelf) {
    return (
      <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700 font-medium">
        Admin (you)
      </span>
    );
  }

  return (
    <button
      onClick={toggleRole}
      disabled={loading}
      title={role === 'admin' ? 'Remove admin role' : 'Grant admin role'}
      className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
        role === 'admin'
          ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-red-100 hover:text-red-700 hover:border-red-200'
          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-purple-100 hover:text-purple-700 hover:border-purple-200'
      }`}
    >
      {loading ? '…' : role === 'admin' ? 'Admin ✓' : 'Make Admin'}
    </button>
  );
}
