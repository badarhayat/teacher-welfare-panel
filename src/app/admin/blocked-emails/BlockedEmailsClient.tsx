'use client';

import { useState } from 'react';
import { Ban, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import type { BlockedEmail } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Props {
  initialBlocked: BlockedEmail[];
}

export default function BlockedEmailsClient({ initialBlocked }: Props) {
  const supabase = createClient();
  const [blocked, setBlocked] = useState<BlockedEmail[]>(initialBlocked);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const normalized = email.trim().toLowerCase();
    if (!normalized.endsWith('@uet.edu.pk')) {
      setMessage({ type: 'error', text: 'Only @uet.edu.pk addresses can be blocked here.' });
      return;
    }

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('blocked_emails')
      .insert({
        email: normalized,
        reason: reason.trim() || null,
        blocked_by: user?.id ?? null,
      })
      .select('id, email, reason, blocked_by, created_at')
      .single();

    if (error) {
      setMessage({
        type: 'error',
        text: error.code === '23505' ? 'That email is already blocked.' : error.message,
      });
    } else if (data) {
      setBlocked((prev) => [data as BlockedEmail, ...prev]);
      setEmail('');
      setReason('');
      setMessage({ type: 'success', text: `${normalized} blocked from registering.` });
    }
    setLoading(false);
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    setMessage(null);
    const { error } = await supabase.from('blocked_emails').delete().eq('id', id);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setBlocked((prev) => prev.filter((b) => b.id !== id));
      setMessage({ type: 'success', text: 'Email unblocked.' });
    }
    setRemovingId(null);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-1 font-semibold text-slate-900">Block an email</h2>
        <p className="mb-4 text-sm text-slate-500">
          Blocked addresses cannot register, even with a valid @uet.edu.pk domain.
        </p>
        <form onSubmit={handleAdd} className="space-y-3">
          <Input
            id="block_email"
            label="Email"
            type="email"
            placeholder="former.teacher@uet.edu.pk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="block_reason"
            label="Reason (optional)"
            type="text"
            placeholder="Left the university"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button type="submit" loading={loading} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Block email
          </Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="font-semibold text-slate-900">Blocked list ({blocked.length})</h2>
        </div>

        {blocked.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-500">
            <Ban className="mx-auto mb-3 h-10 w-10 text-slate-200" />
            <p className="text-sm">No emails blocked yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {blocked.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <p className="break-all font-medium text-slate-900">{row.email}</p>
                  {row.reason && <p className="mt-0.5 text-sm text-slate-600">{row.reason}</p>}
                  <p className="mt-1 text-xs text-slate-400">Blocked {formatDate(row.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(row.id)}
                  disabled={removingId === row.id}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {removingId === row.id ? 'Removing…' : 'Unblock'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
