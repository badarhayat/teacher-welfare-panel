import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getMonthName } from '@/lib/utils';
import { ArrowLeft, BarChart3, CheckCircle2, Clock, Users, AlertTriangle, TrendingUp, FileBarChart } from 'lucide-react';
import type { MonthlyReport } from '@/types';

interface Props {
  params: Promise<{ year: string; month: string }>;
}

export default async function MonthlyReportPage({ params }: Props) {
  const { year: yearStr, month: monthStr } = await params;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .eq('is_published', true)
    .maybeSingle();

  if (!data) notFound();

  const report = data as MonthlyReport;
  const s = report.stats;
  const resolutionPct = s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0;

  const categoryEntries = Object.entries(s.categories ?? {}).sort((a, b) => b[1] - a[1]);
  const priorityEntries = Object.entries(s.priorities ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-[#0f2744] via-[#1e3a5f] to-[#2a4f7c] text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200 mb-3">Teacher Welfare Panel · Monthly Report</p>
          <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl">{getMonthName(month)} {year}</h1>
          <p className="mt-3 text-blue-100 text-sm md:text-base">
            TSA Monthly Progress Report — auto-generated on {new Date(report.generated_at).toLocaleDateString('en-PK', { dateStyle: 'long' })}
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/transparency" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back to Transparency Board
        </Link>

        {/* Executive Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileBarChart className="w-5 h-5 text-[#1e3a5f]" />
            <h2 className="text-lg font-bold text-slate-900">Executive Summary</h2>
          </div>
          <p className="text-slate-700 text-sm leading-relaxed">
            In {getMonthName(month)} {year}, the Teacher Welfare Panel received a total of{' '}
            <strong>{s.total}</strong> complaint{s.total !== 1 ? 's' : ''},{' '}
            of which <strong>{s.public}</strong> were public and <strong>{s.anonymous}</strong> anonymous.{' '}
            The overall resolution rate for this period was <strong>{resolutionPct}%</strong>
            {s.avg_resolution_days != null ? ` with an average resolution time of ${s.avg_resolution_days} days` : ''}.{' '}
            A total of <strong>{s.pending}</strong> issue{s.pending !== 1 ? 's remain' : ' remains'} active.
          </p>
        </div>

        {/* Complaint Statistics */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#1e3a5f]" />
            Complaint Statistics
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total', value: s.total, icon: FileBarChart, color: 'blue' },
              { label: 'Public', value: s.public, icon: Users, color: 'purple' },
              { label: 'Anonymous', value: s.anonymous, icon: Users, color: 'slate' },
              { label: 'Resolved', value: s.resolved, icon: CheckCircle2, color: 'green' },
              { label: 'Pending', value: s.pending, icon: Clock, color: 'orange' },
              { label: 'Under Review', value: s.under_review, icon: TrendingUp, color: 'yellow' },
              { label: 'In Progress', value: s.in_progress, icon: TrendingUp, color: 'orange' },
              { label: 'Urgent', value: s.urgent, icon: AlertTriangle, color: 'red' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{value ?? 0}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
          {s.avg_resolution_days != null && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{s.avg_resolution_days} days</p>
              <p className="text-xs text-green-600 mt-1">Average Resolution Time</p>
            </div>
          )}
        </div>

        {/* Resolution Rate Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Resolution Rate</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-4 bg-green-500 rounded-full transition-all"
                style={{ width: `${resolutionPct}%` }}
              />
            </div>
            <span className="text-lg font-bold text-slate-900 min-w-[3rem] text-right">{resolutionPct}%</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">{s.resolved} resolved out of {s.total} total complaints</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Category Breakdown</h2>
            {categoryEntries.length === 0 ? (
              <p className="text-sm text-slate-500">No data.</p>
            ) : (
              <div className="space-y-3">
                {categoryEntries.map(([cat, count]) => {
                  const pct = s.total > 0 ? Math.round((count / s.total) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700 truncate">{cat}</span>
                        <span className="font-semibold text-slate-900 ml-2">{count}</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-2">
                        <div className="h-2 bg-[#1e3a5f] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Priority Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Priority Breakdown</h2>
            {priorityEntries.length === 0 ? (
              <p className="text-sm text-slate-500">No data.</p>
            ) : (
              <div className="space-y-3">
                {priorityEntries.map(([pri, count]) => {
                  const pct = s.total > 0 ? Math.round((count / s.total) * 100) : 0;
                  const colorMap: Record<string, string> = {
                    Urgent: 'bg-red-500',
                    High: 'bg-orange-500',
                    Medium: 'bg-blue-500',
                    Low: 'bg-slate-400',
                  };
                  return (
                    <div key={pri}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700">{pri}</span>
                        <span className="font-semibold text-slate-900">{count}</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${colorMap[pri] ?? 'bg-slate-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Status Distribution</h2>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            {[
              { label: 'Submitted', value: s.submitted, color: 'bg-blue-500' },
              { label: 'Under Review', value: s.under_review, color: 'bg-yellow-500' },
              { label: 'In Progress', value: s.in_progress, color: 'bg-orange-500' },
              { label: 'Communicated', value: s.communicated, color: 'bg-purple-500' },
              { label: 'Resolved', value: s.resolved, color: 'bg-green-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${color}`} />
                <div>
                  <p className="font-semibold text-slate-900">{value ?? 0}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center pb-8">
          <Link
            href="/transparency"
            className="inline-flex min-h-11 items-center rounded-lg bg-[#1e3a5f] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#15304f]"
          >
            ← Back to Transparency Board
          </Link>
        </div>
      </main>
    </div>
  );
}
