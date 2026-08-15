'use client';

import { useState } from 'react';
import { FileText, CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ACTIVE_STATUSES } from '@/lib/utils';
import Button from '@/components/ui/Button';
import {
  downloadVcEmailDoc,
  downloadMeetingAgendaDoc,
  type UnresolvedDocIssue,
} from '@/lib/docx/unresolvedDocs';

export default function UnresolvedDocsButtons() {
  const supabase = createClient();
  const [loading, setLoading] = useState<'vc' | 'agenda' | null>(null);
  const [error, setError] = useState('');

  async function loadUnresolved(): Promise<UnresolvedDocIssue[]> {
    const { data, error: fetchError } = await supabase
      .from('issues')
      .select('id, title, category, priority, status, created_at, is_anonymous, user:profiles!issues_user_id_fkey(campus, department, full_name)')
      .is('deleted_at', null)
      .in('status', ACTIVE_STATUSES)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    if (fetchError) throw new Error(fetchError.message);

    return ((data ?? []) as unknown as UnresolvedDocIssue[]).map((issue) => ({
      ...issue,
      user: issue.is_anonymous ? null : issue.user,
    }));
  }

  async function handleVc() {
    setLoading('vc');
    setError('');
    try {
      const issues = await loadUnresolved();
      await downloadVcEmailDoc(issues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate VC email document');
    }
    setLoading(null);
  }

  async function handleAgenda() {
    setLoading('agenda');
    setError('');
    try {
      const issues = await loadUnresolved();
      await downloadMeetingAgendaDoc(issues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate meeting agenda');
    }
    setLoading(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={handleVc}
          loading={loading === 'vc'}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5"
        >
          <FileText className="h-4 w-4" />
          Generate VC Email (Word)
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAgenda}
          loading={loading === 'agenda'}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5"
        >
          <CalendarDays className="h-4 w-4" />
          Generate Meeting Agenda (Word)
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
