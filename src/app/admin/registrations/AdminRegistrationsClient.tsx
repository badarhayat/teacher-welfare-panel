'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Building, GraduationCap, AlertTriangle, Trash2, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface TeacherRow {
  id: string;
  email: string;
  full_name: string;
  campus: string;
  department: string;
  designation: string;
  created_at: string;
  is_approved: boolean;
}

interface Props {
  initialRegistrations: TeacherRow[];
}

export default function AdminRegistrationsClient({ initialRegistrations }: Props) {
  const router = useRouter();
  const [teachers, setTeachers] = useState<TeacherRow[]>(initialRegistrations);
  const [loading, setLoading] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
          reason: 'Removed from registrations list by administrator',
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
        <h1 className="text-2xl font-bold text-slate-900">Registered Teachers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Email verification is enough to register — no admin approval. Manage members on{' '}
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
          {message.type === 'error' && <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      {teachers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-500">No registered teachers yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teachers.map((t) => (
            <div key={t.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold text-slate-900">{t.full_name || '—'}</span>
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
                          <button
                            type="button"
                            disabled={loading === t.id}
                            onClick={() => handleRemove(t.id)}
                            className="min-h-10 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {loading === t.id ? 'Removing…' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRemovingId(null)}
                            className="min-h-10 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRemovingId(t.id)}
                        disabled={loading === t.id}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
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
