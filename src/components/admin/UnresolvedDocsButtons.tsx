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

type RewrittenItem = {
  id: string;
  title: string;
  paragraphs: string[];
};

export default function UnresolvedDocsButtons() {
  const supabase = createClient();
  const [loading, setLoading] = useState<'vc' | 'agenda' | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function loadUnresolved(): Promise<UnresolvedDocIssue[]> {
    const { data, error: fetchError } = await supabase
      .from('issues')
      .select('id, title, description, category, priority, status, created_at')
      .is('deleted_at', null)
      .in('status', ACTIVE_STATUSES)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    if (fetchError) throw new Error(fetchError.message);

    return (data ?? []) as UnresolvedDocIssue[];
  }

  async function applyGeminiRewrite(
    issues: UnresolvedDocIssue[],
    docType: 'agenda' | 'vc'
  ): Promise<UnresolvedDocIssue[]> {
    if (issues.length === 0) return issues;

    const res = await fetch('/api/admin/unresolved-docs/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docType,
        issues: issues.map((i) => ({
          id: i.id,
          title: i.title,
          description: i.description,
          category: i.category,
          priority: i.priority,
        })),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Gemini rewrite failed');
    }

    const items = (data.items ?? []) as RewrittenItem[];
    const byId = new Map(items.map((i) => [i.id, i]));

    return issues.map((issue) => {
      const rewritten = byId.get(issue.id);
      if (!rewritten) return issue;
      return {
        ...issue,
        formalTitle: rewritten.title,
        formalParagraphs: rewritten.paragraphs,
      };
    });
  }

  async function handleVc() {
    setLoading('vc');
    setError('');
    setInfo('Rewriting with Gemini as General Secretary / TSA…');
    try {
      const issues = await loadUnresolved();
      const formal = await applyGeminiRewrite(issues, 'vc');
      setInfo('Building Word document…');
      await downloadVcEmailDoc(formal);
      setInfo('VC brief downloaded (Gemini formal rewrite).');
    } catch (err) {
      setInfo('');
      setError(err instanceof Error ? err.message : 'Failed to generate VC email document');
    }
    setLoading(null);
  }

  async function handleAgenda() {
    setLoading('agenda');
    setError('');
    setInfo('Rewriting with Gemini as General Secretary / TSA…');
    try {
      const issues = await loadUnresolved();
      const formal = await applyGeminiRewrite(issues, 'agenda');
      setInfo('Building Word document…');
      await downloadMeetingAgendaDoc(formal);
      setInfo('Meeting agenda downloaded (Gemini formal rewrite).');
    } catch (err) {
      setInfo('');
      setError(err instanceof Error ? err.message : 'Failed to generate meeting agenda');
    }
    setLoading(null);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Word exports are rewritten with Gemini into formal General Secretary / TSA language (no
        submitter identity). Requires <code className="text-[11px]">GEMINI_API_KEY</code> on the
        server.
      </p>
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
      {info && !error && <p className="text-xs text-slate-600">{info}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
