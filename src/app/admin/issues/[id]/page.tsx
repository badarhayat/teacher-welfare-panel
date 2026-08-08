'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { getStatusColor, getPriorityColor, formatDate, ISSUE_STATUSES } from '@/lib/utils';
import { ArrowLeft, Calendar, Tag, Gauge, MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { UserProfile, Issue } from '@/types';
import IssueEditDeleteActions from '@/app/(dashboard)/dashboard/issues/[id]/IssueEditDeleteActions';

export default function AdminIssueDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [publishingLoading, setPublishingLoading] = useState(false);
  const [error, setError] = useState('');
  const [replySuccess, setReplySuccess] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [publishSuccess, setPublishSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) setProfile(data as UserProfile);
      });
    });
    fetchIssue();
  }, [id]);

  async function fetchIssue() {
    const { data } = await supabase
      .from('issues')
      .select('*, user:profiles!issues_user_id_fkey(*), replies(*, admin:admin_id(full_name, designation), teacher:user_id(full_name, designation))')
      .eq('id', id)
      .single();
    if (data) {
      let issueUser = data.is_anonymous ? undefined : (data.user as UserProfile | undefined);

      if (!data.is_anonymous && !issueUser && data.user_id) {
        const { data: fallbackProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user_id)
          .maybeSingle();
        issueUser = (fallbackProfile as UserProfile | null) ?? undefined;
      }

      const mergedIssue: Issue = {
        ...(data as Issue),
        user: issueUser,
      };

      setIssue(mergedIssue);
      setNewStatus(data.status);
      setResolutionSummary(data.resolution_summary ?? '');
      setActionsTaken(data.actions_taken ?? '');
    }
  }

  async function handleStatusChange() {
    if (!issue || newStatus === issue.status) return;
    setStatusLoading(true);
    setError('');
    const { error } = await supabase.from('issues').update({ status: newStatus }).eq('id', id);
    if (error) {
      setError(error.message);
      setStatusLoading(false);
      return;
    }

    await fetchIssue();
    setStatusLoading(false);
  }

  async function handlePublishResolution(e: React.FormEvent) {
    e.preventDefault();
    if (!issue) return;
    setPublishSuccess(false);
    setError('');

    if (!issue.is_anonymous && !resolutionSummary.trim()) {
      setError('Please add a resolution summary for the transparency board.');
      return;
    }

    setPublishingLoading(true);
    const updates: Record<string, unknown> = {
      resolution_summary: resolutionSummary.trim() || null,
      actions_taken: actionsTaken.trim() || null,
    };

    if ((newStatus === 'Resolved' || newStatus === 'Closed') && !issue.resolution_date) {
      updates.resolution_date = new Date().toISOString();
    }

    const { error } = await supabase.from('issues').update(updates).eq('id', id);
    if (error) {
      setError(error.message);
      setPublishingLoading(false);
      return;
    }

    setPublishSuccess(true);
    await fetchIssue();
    setPublishingLoading(false);
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setReplyLoading(true);
    setError('');
    setReplySuccess(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('replies').insert({
      issue_id: id,
      admin_id: user.id,
      message: replyMessage.trim(),
    });

    if (error) {
      setError(error.message);
    } else {
      setReplyMessage('');
      setReplySuccess(true);
      await fetchIssue();
    }
    setReplyLoading(false);
  }

  if (!profile || !issue) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Header user={profile} title="Issue Detail" subtitle="Admin view" />
      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <Link href="/admin/issues" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Back to Issues
          </Link>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Issue Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2 className="text-xl font-bold text-slate-900">{issue.title}</h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={getStatusColor(issue.status)}>{issue.status}</Badge>
                <IssueEditDeleteActions issue={issue} redirectPath="/admin/issues" compact />
              </div>
            </div>

            {/* Faculty Info */}
            {issue.is_anonymous ? (
              <div className="bg-slate-50 rounded-lg p-3 mb-4 flex flex-wrap gap-4 text-sm">
                <div><span className="text-slate-500">Faculty: </span><strong>Anonymous Faculty Member</strong></div>
                <div><span className="text-slate-500">Department: </span>Hidden</div>
                <div><span className="text-slate-500">Campus: </span>Hidden</div>
                <div className="w-full text-xs text-slate-500 mt-1">
                  Privacy notice: Submitter identity is intentionally hidden for this anonymous issue.
                </div>
              </div>
            ) : issue.user && (
              <div className="bg-slate-50 rounded-lg p-3 mb-4 flex flex-wrap gap-4 text-sm">
                <div><span className="text-slate-500">Faculty: </span><strong>{issue.user.full_name}</strong></div>
                <div><span className="text-slate-500">Designation: </span>{issue.user.designation}</div>
                <div><span className="text-slate-500">Department: </span>{issue.user.department}</div>
                <div><span className="text-slate-500">Campus: </span>{issue.user.campus}</div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {issue.category}
              </div>
              <Badge className={getPriorityColor(issue.priority)}>{issue.priority}</Badge>
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatDate(issue.created_at)}
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{issue.description}</p>
            </div>
          </div>

          {/* Status Update */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Update Status</h3>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Select
                  id="status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  options={ISSUE_STATUSES.map((s) => ({ value: s, label: s }))}
                />
              </div>
              <Button
                onClick={handleStatusChange}
                loading={statusLoading}
                disabled={newStatus === issue.status}
                variant={newStatus !== issue.status ? 'primary' : 'secondary'}
              >
                Update
              </Button>
            </div>
          </div>

          {/* Replies */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">
                Replies {issue.replies && issue.replies.length > 0 && `(${issue.replies.length})`}
              </h3>
            </div>

            {issue.replies && issue.replies.length > 0 ? (
              <div className="space-y-3 mb-6">
                {issue.replies
                  .slice()
                  .sort((a: { created_at: string }, b: { created_at: string }) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((reply: { id: string; message: string; created_at: string; admin_id?: string | null; user_id?: string | null; admin?: { full_name?: string; designation?: string }; teacher?: { full_name?: string; designation?: string } }) => (
                  <div key={reply.id} className={reply.admin_id ? 'bg-blue-50 border border-blue-100 rounded-lg p-4' : 'bg-slate-50 border border-slate-200 rounded-lg p-4'}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        {reply.admin_id ? (
                          <>
                            <p className="text-sm font-semibold text-[#1e3a5f]">{reply.admin?.full_name ?? 'Admin'}</p>
                            {reply.admin?.designation && <p className="text-xs text-blue-500">{reply.admin.designation}</p>}
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-slate-800">{reply.teacher?.full_name ?? 'Teacher'}</p>
                            {reply.teacher?.designation && <p className="text-xs text-slate-500">{reply.teacher.designation}</p>}
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{formatDate(reply.created_at)}</p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{reply.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 mb-5">No replies yet.</p>
            )}

            {/* Reply form */}
            {replySuccess && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Reply sent successfully.
              </div>
            )}
            <form onSubmit={handleReply} className="space-y-3">
              <Textarea
                id="reply"
                label="Write a Reply"
                placeholder="Enter your response to the faculty member..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={4}
                required
              />
              <Button type="submit" loading={replyLoading} className="flex items-center gap-2">
                <Send className="w-4 h-4" /> Send Reply
              </Button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Transparency Board Details</h3>
            <form onSubmit={handlePublishResolution} className="space-y-4">
              <Textarea
                id="resolution_summary"
                label="Resolution Summary"
                placeholder="Summarize what was resolved for the faculty community."
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                rows={3}
              />
              <Textarea
                id="actions_taken"
                label="Actions Taken"
                placeholder="List actions taken by administration/welfare committee."
                value={actionsTaken}
                onChange={(e) => setActionsTaken(e.target.value)}
                rows={3}
              />

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {issue.is_anonymous
                  ? 'This issue is anonymous and is automatically excluded from the public transparency board.'
                  : 'This issue is automatically included on the public transparency board. Status updates are reflected in real time.'}
              </div>

              {publishSuccess && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Transparency details saved successfully.
                </div>
              )}

              <Button type="submit" loading={publishingLoading} className="flex items-center gap-2">
                Save Transparency Settings
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
