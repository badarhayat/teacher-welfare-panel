import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';
import { ArrowLeft, Calendar, Tag, Gauge, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { UserProfile } from '@/types';
import TeacherReplyForm from '@/components/issues/TeacherReplyForm';
import IssueEditDeleteActions from './IssueEditDeleteActions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IssueDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: issue }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('issues')
      .select('*, replies(*, admin:admin_id(full_name, designation), teacher:user_id(full_name, designation))')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
  ]);

  if (!profile) redirect('/login');
  if (!issue) notFound();

  const isAdminDeleted = Boolean(issue.deleted_at && issue.deleted_by_role === 'admin');
  const canEdit = issue.user_id === user.id && !issue.deleted_at;

  return (
    <div className="flex flex-col flex-1">
      <Header user={profile as UserProfile} title="Issue Detail" />
      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/dashboard/issues"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Issues
          </Link>

          {isAdminDeleted && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">This issue was removed by an administrator</p>
              <p className="mt-1 text-amber-800">
                It is no longer visible on your active issues list or the transparency board
                {issue.deleted_at ? ` (removed ${formatDate(issue.deleted_at)})` : ''}.
              </p>
            </div>
          )}

          {/* Issue card */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold text-slate-900">{issue.title}</h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={getStatusColor(issue.status)}>{issue.status}</Badge>
                {canEdit && <IssueEditDeleteActions issue={issue} redirectPath="/dashboard" />}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-5">
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {issue.category}
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                <Badge className={getPriorityColor(issue.priority)}>{issue.priority}</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Submitted: {formatDate(issue.created_at)}
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{issue.description}</p>
            </div>
          </div>

          {/* Replies */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">
                Conversation {issue.replies?.length > 0 && `(${issue.replies.length})`}
              </h3>
            </div>

            {!issue.replies || issue.replies.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm">No replies yet. Start the conversation with the admin.</p>
              </div>
            ) : (
              <div className="space-y-4">
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
                            {reply.admin?.designation && (
                              <p className="text-xs text-blue-500">{reply.admin.designation}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-slate-800">{reply.teacher?.full_name ?? 'You'}</p>
                            {reply.teacher?.designation && (
                              <p className="text-xs text-slate-500">{reply.teacher.designation}</p>
                            )}
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{formatDate(reply.created_at)}</p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{reply.message}</p>
                  </div>
                ))}
              </div>
            )}

            {!issue.deleted_at && <TeacherReplyForm issueId={issue.id} />}
          </div>
        </div>
      </main>
    </div>
  );
}
