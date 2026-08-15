'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface Props {
  userId: string;
  userName: string;
  userEmail: string;
  currentAdminId: string;
}

export default function DeleteMemberButton({
  userId,
  userName,
  userEmail,
  currentAdminId,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [blockEmail, setBlockEmail] = useState(true);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (userId === currentAdminId) return null;

  async function handleDelete() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          blockEmail,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to delete member');
        setLoading(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('Failed to delete member');
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError('');
          setBlockEmail(true);
          setReason('');
        }}
        title="Remove member"
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remove
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Remove faculty member?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This permanently removes <span className="font-medium">{userName}</span> (
              <span className="break-all">{userEmail}</span>) from the site. They will no longer be
              able to sign in.
            </p>

            <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={blockEmail}
                onChange={(e) => setBlockEmail(e.target.checked)}
              />
              <span>Also block this email from registering again (recommended for departed faculty)</span>
            </label>

            {blockEmail && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Left the university"
                  className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="min-h-11 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Removing…' : 'Confirm remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
