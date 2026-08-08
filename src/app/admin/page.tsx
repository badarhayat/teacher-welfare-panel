import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import StatCard from '@/components/ui/StatCard';
import IssueTable from '@/components/issues/IssueTable';
import { UserProfile, IssueStatus } from '@/types';
import { FileText, Users, Clock, CheckCircle2, AlertTriangle, TrendingUp, EyeOff, Inbox, UserCheck } from 'lucide-react';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: profile },
    { data: allIssuesMeta },
    { data: recentIssues },
    { data: users },
    { data: pendingRegistrations },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('issues').select('id, status, priority, is_anonymous').is('deleted_at', null),
    supabase
      .from('issues')
      .select('*, user:profiles!issues_user_id_fkey(*), replies(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('profiles').select('id').eq('role', 'teacher'),
    supabase.from('teacher_registrations').select('id').eq('status', 'pending'),
  ]);

  if (!profile) redirect('/login');

  const meta = allIssuesMeta ?? [];
  const statusCounts = meta.reduce((acc, issue) => {
    acc[issue.status as IssueStatus] = (acc[issue.status as IssueStatus] ?? 0) + 1;
    return acc;
  }, {} as Record<IssueStatus, number>);

  const totalIssues   = meta.length;
  const activeIssues  = meta.filter((i) => !['Resolved', 'Closed'].includes(i.status)).length;
  const submitted     = statusCounts['Submitted'] ?? 0;
  const underReview   = statusCounts['Under Review'] ?? 0;
  const inProgress    = statusCounts['In Progress'] ?? 0;
  const communicated  = statusCounts['Communicated to Authorities'] ?? 0;
  const resolved      = (statusCounts['Resolved'] ?? 0) + (statusCounts['Closed'] ?? 0);
  const anonymous     = meta.filter((i) => i.is_anonymous).length;
  const urgent        = meta.filter((i) => i.priority === 'Urgent' && !['Resolved', 'Closed'].includes(i.status)).length;
  const pendingCount  = pendingRegistrations?.length ?? 0;

  const tableIssues = (recentIssues ?? []).map((issue) => ({
    ...issue,
    user: issue.is_anonymous ? undefined : issue.user,
  }));

  return (
    <div className="flex flex-col flex-1">
      <Header user={profile as UserProfile} title="Admin Overview" subtitle="Teacher Welfare Panel" />
      <main className="flex-1 space-y-6 p-4 sm:p-6">

        {/* Pending approvals alert */}
        {pendingCount > 0 && (
          <a href="/admin/registrations" className="block">
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 hover:bg-amber-100 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800">{pendingCount} Pending Registration{pendingCount !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Teacher accounts awaiting your approval before they can log in.</p>
                </div>
              </div>
              <span className="text-sm font-medium text-amber-700 underline">Review →</span>
            </div>
          </a>
        )}

        {/* Primary stats row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Issues"    value={totalIssues}  icon={FileText}      color="blue" />
          <StatCard title="Active Issues"   value={activeIssues} icon={Inbox}         color="orange" />
          <StatCard title="Resolved"        value={resolved}     icon={CheckCircle2}  color="green" />
          <StatCard title="Faculty Members" value={users?.length ?? 0} icon={Users}   color="purple" />
        </div>

        {/* Status breakdown row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Submitted"    value={submitted}    icon={TrendingUp}   color="blue" />
          <StatCard title="Under Review" value={underReview}  icon={Clock}        color="orange" />
          <StatCard title="In Progress"  value={inProgress}   icon={TrendingUp}   color="orange" />
          <StatCard title="Communicated" value={communicated} icon={CheckCircle2} color="purple" />
          <StatCard title="Anonymous"    value={anonymous}    icon={EyeOff}       color="gray" />
        </div>

        {/* Urgent alert */}
        {urgent > 0 && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-5 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">{urgent} Urgent Issue{urgent !== 1 ? 's' : ''} Require Attention</p>
                <p className="text-xs text-red-600 mt-0.5">These are marked Urgent and still active.</p>
              </div>
            </div>
            <a
              href="/admin/issues?view=active&priority=Urgent"
              className="text-sm font-medium text-red-700 hover:text-red-900 underline"
            >
              View Urgent →
            </a>
          </div>
        )}

        {/* Recent Issues table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">Recent Issues</h2>
              <p className="text-sm text-slate-500">Latest submissions across all departments</p>
            </div>
            <div className="flex items-center gap-3">
              <a href="/admin/issues?view=archived" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
                Archived
              </a>
              <a href="/admin/issues" className="text-sm text-[#1e3a5f] font-medium hover:underline">
                View All →
              </a>
            </div>
          </div>
          <IssueTable issues={tableIssues} adminView basePath="/admin/issues" />
        </div>
      </main>
    </div>
  );
}

