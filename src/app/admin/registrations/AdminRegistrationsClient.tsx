'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, User, Building, GraduationCap, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';

interface PendingTeacher {
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
  initialRegistrations: PendingTeacher[];
}

export default function AdminRegistrationsClient({ initialRegistrations }: Props) {
  const supabase = createClient();
  const [registrations, setRegistrations] = useState<PendingTeacher[]>(initialRegistrations);
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectionInput, setRejectionInput] = useState<string>('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pending = registrations.filter((r) => !r.is_approved);
  const approved = registrations.filter((r) => r.is_approved);

  async function handleApprove(id: string) {
    setLoading(id);
    setMessage(null);
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true, approved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to approve' });
    } else {
      setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, is_approved: true } : r)));
      setMessage({ type: 'success', text: 'Teacher approved. They can now log in.' });
    }
    setLoading(null);
  }

  async function handleReject(id: string) {
    setLoading(id);
    setMessage(null);
    const target = registrations.find((r) => r.id === id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: id,
          blockEmail: true,
          reason: rejectionInput.trim() || 'Registration rejected by administrator',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to reject' });
      } else {
        setRegistrations((prev) => prev.filter((r) => r.id !== id));
        setMessage({
          type: 'success',
          text: target
            ? `Rejected and removed ${target.email}. Email blocked from re-registering.`
            : 'Registration rejected, removed, and email blocked.',
        });
        setRejectingId(null);
        setRejectionInput('');
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to reject' });
    }
    setLoading(null);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Teacher Registrations</h1>
        <p className="text-slate-500 text-sm mt-1">Review and approve pending faculty registration requests.</p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Pending Registrations */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          Pending Approval ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No pending registrations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((reg) => (
              <div
                key={reg.id}
                className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden"
              >
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">{reg.full_name}</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {reg.designation}
                        </span>
                      </div>
                      <p className="break-all text-sm text-slate-600">{reg.email}</p>
                      <div className="flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-4">
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {reg.campus}
                        </span>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          {reg.department}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Submitted {formatDate(reg.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-shrink-0">
                      <button
                        onClick={() => handleApprove(reg.id)}
                        disabled={loading === reg.id}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {loading === reg.id ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(reg.id);
                          setRejectionInput('');
                        }}
                        disabled={loading === reg.id}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Rejection form */}
                  {rejectingId === reg.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Rejection Reason (optional)
                      </label>
                      <input
                        type="text"
                        className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-red-300 sm:text-sm"
                        placeholder="e.g. Could not verify employment status"
                        value={rejectionInput}
                        onChange={(e) => setRejectionInput(e.target.value)}
                      />
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <button
                          onClick={() => handleReject(reg.id)}
                          disabled={loading === reg.id}
                          className="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {loading === reg.id ? 'Rejecting…' : 'Confirm Reject'}
                        </button>
                        <button
                          onClick={() => setRejectingId(null)}
                          className="min-h-11 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approved Teachers */}
      {approved.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Approved Teachers ({approved.length})
          </h2>
          <div className="space-y-3 lg:hidden">
            {approved.map((reg) => (
              <div key={reg.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{reg.full_name}</p>
                    <p className="break-all text-sm text-slate-600">{reg.email}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Approved</Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p className="break-words">{reg.department}</p>
                  <p className="break-words text-xs text-slate-500">{reg.campus}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white lg:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Campus</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Department</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approved.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{reg.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{reg.email}</td>
                    <td className="px-4 py-3 text-slate-600">{reg.campus}</td>
                    <td className="px-4 py-3 text-slate-600">{reg.department}</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-green-100 text-green-800">Approved</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
