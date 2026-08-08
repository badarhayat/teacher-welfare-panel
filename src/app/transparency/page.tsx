import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate, ISSUE_CATEGORIES, ISSUE_STATUSES, getMonthName } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { CheckCircle2, Megaphone, Search, CalendarClock, BarChart3, FileBarChart, TrendingUp } from 'lucide-react';
import type { MonthlyReport, MonthlyReportStats, YearlyReport } from '@/types';

interface TransparencyPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 6;

function normalizeComplaintKey(title: string, category: string) {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 4)
    .join(' ');
  return `${category}::${normalized || 'general'}`;
}

export default async function TransparencyPage({ searchParams }: TransparencyPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user: loggedInUser } } = await supabase.auth.getUser();
  const { data: loggedInProfile } = loggedInUser
    ? await supabase.from('profiles').select('role').eq('id', loggedInUser.id).single()
    : { data: null };

  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  const query = params.q?.trim() ?? '';
  const category = params.category?.trim() ?? 'All';
  const status = params.status?.trim() ?? 'All';
  const page = Math.max(Number(params.page ?? '1') || 1, 1);
  const start = (page - 1) * PAGE_SIZE;

  let issuesQuery = supabase
    .from('issues')
    .select('id, title, category, status, resolution_summary, actions_taken, resolution_date, created_at, updated_at, timeline:issue_status_history(id, issue_id, status, note, changed_at)', { count: 'exact' })
    .eq('published_to_board', true)
    .eq('is_anonymous', false)
    .order('updated_at', { ascending: false });

  if (query) {
    issuesQuery = issuesQuery.or(`title.ilike.%${query}%,resolution_summary.ilike.%${query}%,actions_taken.ilike.%${query}%`);
  }

  if (category !== 'All') {
    issuesQuery = issuesQuery.eq('category', category);
  }

  if (status !== 'All') {
    issuesQuery = issuesQuery.eq('status', status);
  }

  // Auto-generate current month report if it doesn't exist yet
  const { data: existingMonthly } = await supabase
    .from('monthly_reports')
    .select('id')
    .eq('year', currentYear)
    .eq('month', currentMonth)
    .maybeSingle();

  if (!existingMonthly) {
    await supabase.rpc('generate_monthly_report', { p_year: currentYear, p_month: currentMonth });
  }

  // Auto-generate current year report if it doesn't exist yet
  const { data: existingYearly } = await supabase
    .from('yearly_reports')
    .select('id')
    .eq('year', currentYear)
    .maybeSingle();

  if (!existingYearly) {
    await supabase.rpc('generate_yearly_report', { p_year: currentYear });
  }

  const [{ data: issues }, { data: updates }, { data: reports }, { data: yearlyReports }] = await Promise.all([
    issuesQuery,
    supabase
      .from('community_updates')
      .select('id, title, content, published_at, created_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(5),
    supabase
      .from('monthly_reports')
      .select('id, year, month, stats, is_published, generated_at')
      .eq('is_published', true)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(24),
    supabase
      .from('yearly_reports')
      .select('id, year, stats, generated_at')
      .order('year', { ascending: false })
      .limit(10),
  ]);

  const groupedMap = new Map<string, {
    key: string;
    category: string;
    complaintTheme: string;
    titles: string[];
    issueCount: number;
    latestStatus: string;
    latestResolutionSummary: string | null;
    latestActionsTaken: string | null;
    latestResolutionDate: string | null;
    latestUpdatedAt: string;
    timeline: Array<{ id: string; issue_id: string; status: string; note: string | null; changed_at: string }>;
  }>();

  for (const issue of (issues ?? [])) {
    const key = normalizeComplaintKey(issue.title, issue.category);
    const existing = groupedMap.get(key);

    if (!existing) {
      groupedMap.set(key, {
        key,
        category: issue.category,
        complaintTheme: issue.title,
        titles: [issue.title],
        issueCount: 1,
        latestStatus: issue.status,
        latestResolutionSummary: issue.resolution_summary,
        latestActionsTaken: issue.actions_taken,
        latestResolutionDate: issue.resolution_date,
        latestUpdatedAt: issue.updated_at,
        timeline: issue.timeline ?? [],
      });
      continue;
    }

    existing.issueCount += 1;
    existing.titles.push(issue.title);
    if (new Date(issue.updated_at).getTime() > new Date(existing.latestUpdatedAt).getTime()) {
      existing.latestStatus = issue.status;
      existing.latestResolutionSummary = issue.resolution_summary;
      existing.latestActionsTaken = issue.actions_taken;
      existing.latestResolutionDate = issue.resolution_date;
      existing.latestUpdatedAt = issue.updated_at;
      existing.timeline = issue.timeline ?? existing.timeline;
      existing.complaintTheme = issue.title;
    }
  }

  const groupedIssues = Array.from(groupedMap.values()).sort(
    (a, b) => new Date(b.latestUpdatedAt).getTime() - new Date(a.latestUpdatedAt).getTime()
  );

  const totalPages = Math.max(Math.ceil(groupedIssues.length / PAGE_SIZE), 1);
  const pagedGroups = groupedIssues.slice(start, start + PAGE_SIZE);


  function buildQuery(nextPage: number) {
    const search = new URLSearchParams();
    if (query) search.set('q', query);
    if (category !== 'All') search.set('category', category);
    if (status !== 'All') search.set('status', status);
    search.set('page', String(nextPage));
    return `/transparency?${search.toString()}`;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-[#0f2744] via-[#1e3a5f] to-[#2a4f7c] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200 mb-3">Teacher Welfare Panel</p>
          <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl">Public Transparency Board</h1>
          <p className="mt-3 text-blue-100 max-w-3xl text-sm md:text-base">
            Community visibility into resolved faculty welfare actions, announcements, and measurable progress.
          </p>
          {loggedInUser && (
            <Link
              href={loggedInProfile?.role === 'admin' ? '/admin' : '/dashboard'}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/30 bg-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/25"
            >
              ← Back to {loggedInProfile?.role === 'admin' ? 'Admin Panel' : 'My Dashboard'}
            </Link>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <form className="grid grid-cols-1 md:grid-cols-4 gap-3" method="GET" action="/transparency">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Search resolution title, summary, actions..."
                className="min-h-11 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] sm:text-sm"
              />
            </div>
            <select
              name="category"
              defaultValue={category}
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] sm:text-sm"
            >
              <option value="All">All Categories</option>
              {ISSUE_CATEGORIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                name="status"
                defaultValue={status}
                className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] sm:text-sm"
              >
                <option value="All">All Statuses</option>
                {ISSUE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                type="submit"
                className="min-h-11 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#15304f]"
              >
                Filter
              </button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Community Welfare Progress</h2>
              <span className="text-xs text-slate-500">Showing public records only</span>
            </div>

            {pagedGroups.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">
                No public issue groups match your filters.
              </div>
            ) : (
              <div className="space-y-4">
                {pagedGroups.map((group) => (
                  <article key={group.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-base">{group.complaintTheme}</h3>
                        <p className="text-xs text-slate-500 mt-1">Category: {group.category} · Similar complaints: {group.issueCount}</p>
                      </div>
                      <Badge className={group.latestStatus === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                        {group.latestStatus}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Resolution Summary</p>
                        <p className="text-sm text-slate-700 mt-1 leading-relaxed">{group.latestResolutionSummary ?? 'Issue under active review. Summary will be posted after resolution milestones.'}</p>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Actions Taken</p>
                        <p className="text-sm text-slate-700 mt-1 leading-relaxed">{group.latestActionsTaken ?? 'Action progress is being tracked by administration.'}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      <CalendarClock className="w-4 h-4" />
                      Last Update: {formatDate(group.latestResolutionDate ?? group.latestUpdatedAt)}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">Status Timeline</p>
                      <div className="space-y-2">
                        {(group.timeline ?? []).slice().sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()).map((entry) => (
                          <div key={entry.id} className="flex items-start gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-[#1e3a5f] mt-0.5" />
                            <div>
                              <p className="font-medium">{entry.status}</p>
                              <p className="text-xs text-slate-500">{formatDate(entry.changed_at)}</p>
                              {entry.note && <p className="text-xs text-slate-600 mt-0.5">{entry.note}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <Link
                  href={buildQuery(Math.max(page - 1, 1))}
                  className={`inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm ${page <= 1 ? 'pointer-events-none opacity-50 border-slate-200 text-slate-400' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                >
                  Previous
                </Link>
                <Link
                  href={buildQuery(Math.min(page + 1, totalPages))}
                  className={`inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm ${page >= totalPages ? 'pointer-events-none opacity-50 border-slate-200 text-slate-400' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                >
                  Next
                </Link>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Megaphone className="w-4 h-4 text-[#1e3a5f]" />
                <h3 className="font-semibold text-slate-900">Community Announcements</h3>
              </div>
              {(updates ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No announcements published yet.</p>
              ) : (
                <div className="space-y-3">
                  {(updates ?? []).map((update) => (
                    <div key={update.id} className="rounded-lg border border-slate-100 p-3 bg-slate-50">
                      <p className="text-sm font-medium text-slate-900">{update.title}</p>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{update.content}</p>
                      <p className="text-xs text-slate-400 mt-2">{formatDate(update.published_at ?? update.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-600">
              <h4 className="font-semibold text-slate-900 mb-2">Transparency Policy</h4>
              <p>
                Anonymous issues are automatically excluded to protect faculty privacy while sharing community-level progress.
                Status updates appear here automatically — no manual step required.
              </p>
            </div>

            {/* Yearly Reports */}
            {yearlyReports && yearlyReports.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-[#1e3a5f]" />
                  <h3 className="font-semibold text-slate-900">Yearly Reports</h3>
                </div>
                <div className="space-y-2">
                  {(yearlyReports as YearlyReport[]).map((report) => (
                    <Link
                      key={report.id}
                      href={`/transparency/reports/${report.year}`}
                      className="block rounded-lg border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 p-3 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900">
                          {report.year} — Year-to-Date Report
                        </p>
                        <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="grid grid-cols-3 gap-1 mt-2 text-xs text-slate-600">
                        <span>Total: <strong>{report.stats.total ?? 0}</strong></span>
                        <span>Resolved: <strong>{report.stats.resolved ?? 0}</strong></span>
                        <span>Resolution: <strong>{report.stats.resolution_rate ?? 0}%</strong></span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* ── Monthly Progress Reports — full-width section ─────────────────── */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
            <FileBarChart className="w-5 h-5 text-[#1e3a5f] flex-shrink-0" />
            <h2 className="text-lg font-semibold text-slate-900 flex-1">Monthly Progress Reports</h2>
            {/* Year / Month navigation links */}
            {reports && reports.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Group available months by year for navigation */}
                {Array.from(
                  new Set((reports as MonthlyReport[]).map((r) => r.year))
                ).map((yr) => (
                  <div key={yr} className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-slate-500 pr-1">{yr}:</span>
                    {(reports as MonthlyReport[])
                      .filter((r) => r.year === yr)
                      .map((r) => (
                        <Link
                          key={`${r.year}-${r.month}`}
                          href={`/transparency/reports/${r.year}/${r.month}`}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-[#1e3a5f] hover:text-white hover:border-[#1e3a5f] transition-colors"
                        >
                          {getMonthName(r.month).slice(0, 3)}
                        </Link>
                      ))}
                  </div>
                ))}
              </div>
            )}
            <span className="text-xs text-slate-400 ml-auto">Auto-generated · data through day of viewing</span>
          </div>

          {!reports || reports.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500 text-sm">
              Generating report for this month…
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(reports as MonthlyReport[]).map((report) => {
                // stats may arrive as a plain object from JSONB; parse defensively
                const raw = report.stats as unknown;
                const s: MonthlyReportStats =
                  typeof raw === 'string'
                    ? (JSON.parse(raw) as MonthlyReportStats)
                    : (raw as MonthlyReportStats) ?? {};
                const total       = (s.total       ?? 0) as number;
                const resolved    = (s.resolved    ?? 0) as number;
                const pending     = (s.pending     ?? 0) as number;
                const publicCount = (s.public      ?? 0) as number;
                const anonymous   = (s.anonymous   ?? 0) as number;
                const underReview = (s.under_review ?? 0) as number;
                const inProgress  = (s.in_progress  ?? 0) as number;
                const resRate     = total > 0 ? Math.round((resolved / total) * 100) : null;

                return (
                  <div key={report.id} className="px-6 py-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {getMonthName(report.month)} {report.year}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Generated: {formatDate(report.generated_at)}
                        </p>
                      </div>
                      {resRate !== null && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-28 bg-slate-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-green-500"
                              style={{ width: `${resRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-green-700 min-w-[38px]">
                            {resRate}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stats grid */}
                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
                      {[
                        { label: 'Total',        value: total,       color: 'bg-blue-50  text-blue-700'  },
                        { label: 'Public',       value: publicCount, color: 'bg-indigo-50 text-indigo-700' },
                        { label: 'Anonymous',    value: anonymous,   color: 'bg-slate-50 text-slate-600'  },
                        { label: 'Resolved',     value: resolved,    color: 'bg-green-50 text-green-700'  },
                        { label: 'Pending',      value: pending,     color: 'bg-amber-50 text-amber-700'  },
                        { label: 'Under Review', value: underReview, color: 'bg-yellow-50 text-yellow-700' },
                        { label: 'In Progress',  value: inProgress,  color: 'bg-orange-50 text-orange-700' },
                        { label: 'Resolution',   value: resRate !== null ? `${resRate}%` : '—', color: 'bg-purple-50 text-purple-700' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className={`rounded-lg ${color} px-3 py-2 text-center`}>
                          <p className="text-lg font-bold leading-none">{value}</p>
                          <p className="text-xs mt-1 font-medium opacity-80">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* View Details */}
                    <Link
                      href={`/transparency/reports/${report.year}/${report.month}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[#1e3a5f] text-white hover:bg-[#15304f] transition-colors"
                    >
                      <BarChart3 className="w-4 h-4" />
                      View Full Report
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
