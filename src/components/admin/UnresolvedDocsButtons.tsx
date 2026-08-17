'use client';

import { useState } from 'react';
import { FileText, CalendarDays, ClipboardList } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ACTIVE_STATUSES } from '@/lib/utils';
import Button from '@/components/ui/Button';
import {
  downloadVcEmailDoc,
  downloadMeetingAgendaDoc,
  downloadOfficialAgendaDoc,
  type UnresolvedDocIssue,
} from '@/lib/docx/unresolvedDocs';
import type { RewriteDocType } from '@/lib/ai/rewriteTsaDocs';

type RewrittenItem = {
  id: string;
  title: string;
  paragraphs: string[];
};

export default function UnresolvedDocsButtons() {
  const supabase = createClient();
  const [loading, setLoading] = useState<'vc' | 'agenda' | 'official' | null>(null);
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
    docType: RewriteDocType
  ): Promise<{ issues: UnresolvedDocIssue[]; usedAi: boolean; warning?: string }> {
    if (issues.length === 0) return { issues, usedAi: false };

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
      return {
        issues,
        usedAi: false,
        warning: data.error
          ? `Gemini rewrite failed (${data.error}). Downloaded using original issue wording.`
          : 'Gemini rewrite failed. Downloaded using original issue wording.',
      };
    }

    const items = (data.items ?? []) as RewrittenItem[];
    const byId = new Map(items.map((i) => [i.id, i]));

    return {
      issues: issues.map((issue) => {
        const rewritten = byId.get(issue.id);
        if (!rewritten) return issue;
        return {
          ...issue,
          formalTitle: rewritten.title,
          formalParagraphs: rewritten.paragraphs,
        };
      }),
      usedAi: Boolean(data.usedAi),
    };
  }

  async function handleVc() {
    setLoading('vc');
    setError('');
    setInfo('Rewriting with Gemini as General Secretary / TSA…');
    try {
      const issues = await loadUnresolved();
      const { issues: formal, usedAi, warning } = await applyGeminiRewrite(issues, 'vc');
      setInfo('Building Word document…');
      await downloadVcEmailDoc(formal);
      setInfo(
        warning ||
          (usedAi
            ? 'VC brief downloaded (Gemini formal rewrite).'
            : 'VC brief downloaded (original wording).')
      );
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
      const { issues: formal, usedAi, warning } = await applyGeminiRewrite(issues, 'agenda');
      setInfo('Building Word document…');
      await downloadMeetingAgendaDoc(formal);
      setInfo(
        warning ||
          (usedAi
            ? 'Meeting agenda downloaded (Gemini formal rewrite).'
            : 'Meeting agenda downloaded (original wording).')
      );
    } catch (err) {
      setInfo('');
      setError(err instanceof Error ? err.message : 'Failed to generate meeting agenda');
    }
    setLoading(null);
  }

  async function handleOfficialAgenda() {
    setLoading('official');
    setError('');
    setInfo('Rewriting official agenda with Gemini…');
    try {
      const issues = await loadUnresolved();
      const { issues: formal, usedAi, warning } = await applyGeminiRewrite(issues, 'official');
      setInfo('Building Word document…');
      await downloadOfficialAgendaDoc(formal);
      setInfo(
        warning ||
          (usedAi
            ? 'Official agenda downloaded (Gemini, max three lines per item).'
            : 'Official agenda downloaded (original wording).')
      );
    } catch (err) {
      setInfo('');
      setError(err instanceof Error ? err.message : 'Failed to generate official agenda');
    }
    setLoading(null);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Word exports are rewritten with Gemini into formal General Secretary / TSA language (no
        submitter identity). Meeting Agenda keeps the facts; Official Agenda is at most three lines
        per item. Requires <code className="text-[11px]">GEMINI_API_KEY</code> on the server.
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
        <Button
          size="sm"
          variant="outline"
          onClick={handleOfficialAgenda}
          loading={loading === 'official'}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5"
        >
          <ClipboardList className="h-4 w-4" />
          Generate Official Agenda (Word)
        </Button>
      </div>
      {info && !error && <p className="text-xs text-slate-600">{info}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
