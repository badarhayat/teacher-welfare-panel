import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import StatCard from '@/components/ui/StatCard';
import IssueCard from '@/components/issues/IssueCard';
import Link from 'next/link';
import { FileText, Clock, CheckCircle2, AlertTriangle, PlusCircle, Megaphone, Archive, Inbox, TrendingUp } from 'lucide-react';
import { CommunityUpdate, Issue, IssueStatus, UserProfile } from '@/types';
import Button from '@/components/ui/Button';
import { formatDate, ACTIVE_STATUSES, ARCHIVED_STATUSES } from '@/lib/utils';
import AdminDeletionNotices from '@/components/issues/AdminDeletionNotices';

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const isArchive = tab === 'archived';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: profile }, { data: activeIssues }, { data: archivedIssues }, { data: resolved }, { data: updates }, { data: deletionNotices }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('issues')
      .select('*, replies(*)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: false }),
    supabase
      .from('issues')
      .select('*, replies(*)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .in('status', ARCHIVED_STATUSES)
      .order('updated_at', { ascending: false }),
    supabase
      .from('issues')
      .select('id, title, resolution_summary, resolution_date, status')
      .eq('published_to_board', true)
      .eq('is_anonymous', false)
      .eq('is_confidential', false)
      .is('deleted_at', null)
      .in('status', ['Resolved', 'Closed'])
      .order('resolution_date', { ascending: false })
      .limit(3),
    supabase
      .from('community_updates')
      .select('id, title, content, published_at, is_published, created_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(3),
    supabase
      .from('issues')
      .select('id, title, deleted_at, category')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .eq('deleted_by_role', 'admin')
      .is('deletion_noticed_at', null)
      .order('deleted_at', { ascending: false }),
  ]);

  if (!profile) redirect('/login');

  const currentIssues: Issue[] = (isArchive ? archivedIssues : activeIssues) ?? [];
  const allIssuesForStats: Issue[] = [...(activeIssues ?? []), ...(archivedIssues ?? [])];

  const statusCounts = allIssuesForStats.reduce(
    (acc, issue) => {
      acc[issue.status as IssueStatus] = (acc[issue.status as IssueStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<IssueStatus, number>
  );

  const openCount = (activeIssues ?? []).length;
  const resolvedCount = (statusCounts['Resolved'] ?? 0) + (statusCounts['Closed'] ?? 0);
  const recentResolved = (resolved ?? []) as Array<Pick<Issue, 'id' | 'title' | 'resolution_summary' | 'resolution_date' | 'status'>>;
  const communityUpdates = (updates ?? []) as CommunityUpdate[];

  return (
    <div className="flex flex-col flex-1">
      <Header
        user={profile as UserProfile}
        title="My Dashboard"
        subtitle={`Welcome back, ${profile.full_name}`}
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <AdminDeletionNotices initialNotices={deletionNotices ?? []} />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Issues" value={allIssuesForStats.length} icon={FileText} color="blue" />
          <StatCard title="Active Issues" value={openCount} icon={AlertTriangle} color="orange" />
          <StatCard title="Resolved" value={resolvedCount} icon={CheckCircle2} color="green" />
          <StatCard
            title="Under Review"
            value={statusCounts['Under Review'] ?? 0}
            icon={Clock}
            color="purple"
          />
        </div>

        {/* Issue tabs + New Issue button */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !isArchive ? 'bg-[#1e3a5f] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Inbox className="w-4 h-4" />
              My Issues
            </Link>
            <Link
              href="/dashboard?tab=archived"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isArchive ? 'bg-[#1e3a5f] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archived ({(archivedIssues ?? []).length})
            </Link>
          </div>
          {!isArchive && (
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/promotion">
                <Button size="sm" variant="outline" className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  Promotion Data
                </Button>
              </Link>
              <Link href="/dashboard/issues/new">
                <Button size="sm" className="flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4" />
                  New Issue
                </Button>
              </Link>
            </div>
          )}
        </div>

        {currentIssues.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            {isArchive ? (
              <>
                <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-medium text-slate-700 mb-1">No archived issues</h3>
                <p className="text-sm text-slate-500">
                  Resolved and closed issues will appear here.
                </p>
              </>
            ) : (
              <>
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-medium text-slate-700 mb-1">No active issues</h3>
                <p className="text-sm text-slate-500">
                  Use New Issue above to submit your first issue, suggestion, or question to the welfare committee.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {currentIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                href={`/dashboard/issues/${issue.id}`}
              />
            ))}
            <div className="text-center pt-2">
              <Link href="/dashboard/issues" className="text-sm text-[#1e3a5f] font-medium hover:underline">
                View all issues →
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Recently Resolved</h3>
              <Link href="/transparency" className="text-xs text-[#1e3a5f] font-medium hover:underline">
                View transparency board
              </Link>
            </div>
            {recentResolved.length === 0 ? (
              <p className="text-sm text-slate-500">No public resolutions available yet.</p>
            ) : (
              <div className="space-y-3">
                {recentResolved.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-100 p-3 bg-slate-50">
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.resolution_summary ?? 'Resolution summary published.'}</p>
                    <p className="text-xs text-slate-400 mt-2">{item.resolution_date ? formatDate(item.resolution_date) : 'Date pending'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Community Updates</h3>
              <Megaphone className="w-4 h-4 text-slate-400" />
            </div>
            {communityUpdates.length === 0 ? (
              <p className="text-sm text-slate-500">No updates published yet.</p>
            ) : (
              <div className="space-y-3">
                {communityUpdates.map((update) => (
                  <div key={update.id} className="rounded-lg border border-slate-100 p-3 bg-slate-50">
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">{update.title}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{update.content}</p>
                    <p className="text-xs text-slate-400 mt-2">{formatDate(update.published_at ?? update.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
