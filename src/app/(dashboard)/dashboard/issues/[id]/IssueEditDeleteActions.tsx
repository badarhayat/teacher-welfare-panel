'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, X, Check, AlertTriangle } from 'lucide-react';
import { Issue } from '@/types';
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES } from '@/lib/utils';

interface Props {
  issue: Issue;
  redirectPath?: string;
  compact?: boolean;
}

export default function IssueEditDeleteActions({ issue, redirectPath = '/dashboard', compact = false }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: issue.title,
    description: issue.description,
    category: issue.category,
    priority: issue.priority,
  });

  async function handleUpdate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Update failed');
      } else {
        setEditing(false);
        router.refresh();
      }
    } catch {
      setError('An error occurred');
    }
    setLoading(false);
  }

  async function handleDelete() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/issues/${issue.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Delete failed');
      } else {
        router.push(redirectPath);
        router.refresh();
      }
    } catch {
      setError('An error occurred');
    }
    setLoading(false);
  }

  return (
    <>
      {/* Edit/Delete buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => { setEditing(true); setDeleting(false); }}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          title="Edit issue"
        >
          <Pencil className="w-3.5 h-3.5" />
          {!compact && 'Edit'}
        </button>
        <button
          onClick={() => { setDeleting(true); setEditing(false); }}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
          title="Delete issue"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {!compact && 'Delete'}
        </button>
      </div>

      {/* Edit form overlay */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <h3 className="font-semibold text-slate-900">Edit Issue</h3>
              <button onClick={() => setEditing(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close edit dialog">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 p-4 sm:p-6">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 sm:text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as typeof form.category }))}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 sm:text-sm"
                  >
                    {ISSUE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as typeof form.priority }))}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 sm:text-sm"
                  >
                    {ISSUE_PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                onClick={() => setEditing(false)}
                className="min-h-11 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation overlay */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-4 py-5 text-center sm:px-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Delete Issue?</h3>
              <p className="text-sm text-slate-600 mb-4">
                This will remove <strong>&quot;{issue.title}&quot;</strong> from your issues. This action cannot be undone.
              </p>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  onClick={() => setDeleting(false)}
                  className="min-h-11 flex-1 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="min-h-11 flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting…' : 'Delete Issue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
