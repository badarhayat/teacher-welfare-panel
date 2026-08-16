'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Building,
  GraduationCap,
  AlertTriangle,
  Trash2,
  MailCheck,
  CheckCircle2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';

export interface PendingEmailRow {
  id: string;
  email: string;
  full_name: string;
  campus: string;
  department: string;
  designation: string;
  created_at: string;
}

interface Props {
  initialPending: PendingEmailRow[];
  loadError: string | null;
}

export default function AdminRegistrationsClient({ initialPending, loadError }: Props) {
  const router = useRouter();
  const [teachers, setTeachers] = useState<PendingEmailRow[]>(initialPending);
  const [loading, setLoading] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    loadError ? { type: 'error', text: loadError } : null
  );

  async function handleConfirm(id: string) {
    setLoading(id);
    setMessage(null);
    const target = teachers.find((t) => t.id === id);
    try {
      const res = await fetch('/api/admin/users/confirm-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to confirm email' });
      } else {
        setTeachers((prev) => prev.filter((t) => t.id !== id));
        setMessage({
          type: 'success',
          text: target
            ? `Confirmed ${target.email}. They can sign in now.`
            : 'Email confirmed. They can sign in now.',
        });
        router.refresh();
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to confirm email' });
    }
    setLoading(null);
  }

  async function handleRemove(id: string) {
    setLoading(id);
    setMessage(null);
    const target = teachers.find((t) => t.id === id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: id,
          blockEmail: true,
          reason: 'Removed while pending email confirmation',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to remove member' });
      } else {
        setTeachers((prev) => prev.filter((t) => t.id !== id));
        setMessage({
          type: 'success',
          text: target
            ? `Removed ${target.email} and blocked re-registration.`
            : 'Member removed and email blocked.',
        });
        setRemovingId(null);
        router.refresh();
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove member' });
    }
    setLoading(null);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pending email confirmation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Teachers whose verification email is stuck in junk or delayed. Confirm them here so they
          can sign in without the link. Confirmed faculty appear on{' '}
          <Link href="/admin/users" className="font-medium text-[#1e3a5f] hover:underline">
            Faculty List
          </Link>
          .
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'error' ? (
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {teachers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <MailCheck className="mx-auto mb-3 h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-500">
            No one is waiting for email confirmation right now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {teachers.map((t) => (
            <div
              key={t.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold text-slate-900">{t.full_name}</span>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Email not confirmed
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {t.designation}
                      </span>
                    </div>
                    <p className="break-all text-sm text-slate-600">{t.email}</p>
                    <div className="flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-4">
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {t.campus}
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {t.department}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Registered {formatDate(t.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    {removingId === t.id ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                        <p className="mb-2 text-red-800">Remove and block this email?</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            loading={loading === t.id}
                            onClick={() => handleRemove(t.id)}
                          >
                            Confirm remove
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setRemovingId(null)}
                            disabled={loading === t.id}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          loading={loading === t.id}
                          onClick={() => handleConfirm(t.id)}
                          disabled={loading !== null && loading !== t.id}
                          className="flex items-center gap-1.5"
                        >
                          <MailCheck className="h-4 w-4" />
                          Confirm email
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => setRemovingId(t.id)}
                          disabled={loading !== null}
                          className="flex items-center gap-1.5"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
