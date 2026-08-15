'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import type { Issue } from '@/types';

interface Props {
  initialNotices: Pick<Issue, 'id' | 'title' | 'deleted_at' | 'category'>[];
}

export default function AdminDeletionNotices({ initialNotices }: Props) {
  const supabase = createClient();
  const [notices, setNotices] = useState(initialNotices);
  const [dismissing, setDismissing] = useState<string | null>(null);

  if (notices.length === 0) return null;

  async function dismiss(id: string) {
    setDismissing(id);
    const { error } = await supabase.rpc('acknowledge_issue_deletion', { p_issue_id: id });
    if (!error) {
      setNotices((prev) => prev.filter((n) => n.id !== id));
    }
    setDismissing(null);
  }

  return (
    <div className="space-y-2">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Issue removed by administrator</p>
            <p className="mt-0.5 text-amber-800">
              &ldquo;{notice.title}&rdquo;
              {notice.category ? ` (${notice.category})` : ''} was removed from your account and the
              transparency board
              {notice.deleted_at ? ` on ${formatDate(notice.deleted_at)}` : ''}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dismiss(notice.id)}
            disabled={dismissing === notice.id}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
