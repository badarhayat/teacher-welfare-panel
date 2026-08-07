import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate, getMonthName } from '@/lib/utils';
import { ArrowLeft, Calendar, TrendingUp, BarChart3, CheckCircle2 } from 'lucide-react';
import type { YearlyReport } from '@/types';

interface PageProps {
  params: Promise<{ year: string }>;
}

export default async function YearlyReportPage({ params }: PageProps) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  if (isNaN(year) || year < 2000 || year > 2100) notFound();

  const supabase = await createClient();

  const { data: report, error } = await supabase
    .from('yearly_reports')
    .select('*')
    .eq('year', year)
    .single();

  if (error || !report) notFound();

  const typedReport = report as YearlyReport;
  const stats = typedReport.stats;
  const resolutionRate = stats.resolution_rate ?? (stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  const isCurrentYear = year === currentYear;

  const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => getMonthName(i + 1));

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-[#0f2744] via-[#1e3a5f] to-[#2a4f7c] text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <Link
            href="/transparency"
            className="inline-flex items-center gap-1.5 text-blue-200 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Transparency Board
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">Annual Progress Report</p>
              <h1 className="text-3xl font-bold">
                {year} Year-to-Date
              </h1>
              <p className="text-blue-100 text-sm mt-2">
                {isCurrentYear
                  ? `Covering January through ${getMonthName(currentMonth)} ${year} (through today, ${new Date().toLocaleDateString('en-PK', { month: 'long', day: 'numeric' })})`
                  : `Full year: January through December ${year}`}
              </p>
              <p className="text-blue-200 text-xs mt-1">
                Generated {formatDate(typedReport.generated_at)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Executive Summary */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Executive Summary</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            In {isCurrentYear ? `the first ${currentMonth} month${currentMonth > 1 ? 's' : ''} of` : 'the year'} {year},
            the Teacher Welfare Panel recorded a total of <strong>{stats.total} faculty welfare issue{stats.total !== 1 ? 's' : ''}</strong>,
            of which <strong>{stats.resolved} ({resolutionRate}%)</strong> have been resolved.
            {stats.urgent > 0 && ` ${stats.urgent} issue${stats.urgent !== 1 ? 's were' : ' was'} marked urgent.`}
            {stats.avg_resolution_days != null && ` Average resolution time was ${stats.avg_resolution_days} day${stats.avg_resolution_days !== 1 ? 's' : ''}.`}
          </p>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Issues', value: stats.total, color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { label: 'Resolved', value: stats.resolved, color: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Pending', value: stats.pending, color: 'bg-amber-50 text-amber-700 border-amber-200' },
            { label: 'Urgent', value: stats.urgent, color: 'bg-red-50 text-red-700 border-red-200' },
            { label: 'In Progress', value: stats.in_progress, color: 'bg-orange-50 text-orange-700 border-orange-200' },
            { label: 'Under Review', value: stats.under_review, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
            { label: 'Public', value: stats.public, color: 'bg-purple-50 text-purple-700 border-purple-200' },
            { label: 'Anonymous', value: stats.anonymous, color: 'bg-slate-50 text-slate-700 border-slate-200' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border ${color} p-4`}>
              <p className="text-2xl font-bold">{value ?? 0}</p>
              <p className="text-sm font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </section>

        {/* Resolution Rate */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Overall Resolution Rate</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                style={{ width: `${Math.min(resolutionRate, 100)}%` }}
              />
            </div>
            <span className="text-2xl font-bold text-green-700 min-w-[60px] text-right">
              {resolutionRate}%
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            {stats.resolved} of {stats.total} issues resolved
            {stats.avg_resolution_days != null && ` · Average resolution time: ${stats.avg_resolution_days} days`}
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          {stats.categories && Object.keys(stats.categories).length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Issues by Category</h2>
              <div className="space-y-3">
                {Object.entries(stats.categories)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, count]) => {
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-700">{cat}</span>
                          <span className="text-slate-500">{count} ({pct}%)</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-2">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* Priority Breakdown */}
          {stats.priorities && Object.keys(stats.priorities).length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Issues by Priority</h2>
              <div className="space-y-3">
                {(['Urgent', 'High', 'Medium', 'Low'] as const).map((pri) => {
                  const count = (stats.priorities as Record<string, number>)[pri] ?? 0;
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  const barColor = { Urgent: 'bg-red-500', High: 'bg-orange-500', Medium: 'bg-blue-400', Low: 'bg-slate-300' }[pri];
                  return (
                    <div key={pri}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700">{pri}</span>
                        <span className="text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-2">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Monthly Breakdown */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Monthly Progress</h2>
          <p className="text-sm text-slate-500 mb-4">
            Click any month to view the full monthly report.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {MONTH_NAMES.map((name, i) => {
              const monthNum = i + 1;
              const isFuture = isCurrentYear && monthNum > currentMonth;
              const monthBreakdown = (stats.monthly_breakdown as Record<string, { total: number; resolved: number }> | undefined)?.[name.trim()];
              const hasData = monthBreakdown && monthBreakdown.total > 0;

              return (
                <Link
                  key={monthNum}
                  href={isFuture ? '#' : `/transparency/reports/${year}/${monthNum}`}
                  className={`rounded-lg border p-3 text-center text-sm transition-colors ${
                    isFuture
                      ? 'border-slate-100 bg-slate-50 text-slate-300 pointer-events-none'
                      : hasData
                      ? 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <p className="font-medium text-xs">{name.trim().slice(0, 3)}</p>
                  {hasData && (
                    <p className="text-xs mt-1 font-bold">{monthBreakdown.total}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
