'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getMonthName } from '@/lib/utils';
import { BarChart3, TrendingUp, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { MonthlyReport, YearlyReport } from '@/types';

interface Props {
  monthlyReports: MonthlyReport[];
  yearlyReports: YearlyReport[];
}

export default function AdminReportsClient({ monthlyReports: initial, yearlyReports: initialYearly }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function generateReport(type: 'monthly' | 'yearly', year: number, month?: number) {
    setGenerating(true);
    setMessage(null);
    const fn = type === 'monthly' ? 'generate_monthly_report' : 'generate_yearly_report';
    const params = type === 'monthly'
      ? { p_year: year, p_month: month! }
      : { p_year: year };

    const { error } = await supabase.rpc(fn, params);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({
        type: 'success',
        text: `${type === 'monthly' ? `${getMonthName(month!)} ${year}` : `${year} yearly`} report generated.`,
      });
      router.refresh();
    }
    setGenerating(false);
  }

  return (
    <div className="flex-1 p-6 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Generate and view monthly and yearly progress reports.</p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-[#1e3a5f]" />
          Generate Reports
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => generateReport('monthly', currentYear, currentMonth)}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            {generating ? 'Generating…' : `Generate ${getMonthName(currentMonth)} ${currentYear}`}
          </button>
          <button
            onClick={() => generateReport('yearly', currentYear)}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            {generating ? 'Generating…' : `Generate ${currentYear} Year-to-Date`}
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#1e3a5f]" />
          Monthly Reports ({initial.length})
        </h2>
        {initial.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            No monthly reports yet. Click &quot;Generate&quot; above to create the first one.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Resolved</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Pending</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Generated</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initial.map((r) => {
                  const s = r.stats as Record<string, number>;
                  const rate = s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{getMonthName(r.month)} {r.year}</td>
                      <td className="px-4 py-3 text-slate-700">{s.total ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className="text-green-700 font-medium">{s.resolved ?? 0}</span>
                        <span className="text-slate-400 text-xs ml-1">({rate}%)</span>
                      </td>
                      <td className="px-4 py-3 text-amber-700">{s.pending ?? 0}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(r.generated_at)}</td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <Link href={`/transparency/reports/${r.year}/${r.month}`} className="text-xs text-[#1e3a5f] font-medium hover:underline" target="_blank">View</Link>
                        <button onClick={() => generateReport('monthly', r.year, r.month)} disabled={generating} className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50" title="Regenerate"><RefreshCw className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-600" />
          Yearly Reports ({initialYearly.length})
        </h2>
        {initialYearly.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">No yearly reports yet.</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Year</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Resolved</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Resolution Rate</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Generated</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialYearly.map((r) => {
                  const s = r.stats as Record<string, number>;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.year}</td>
                      <td className="px-4 py-3 text-slate-700">{s.total ?? 0}</td>
                      <td className="px-4 py-3 text-green-700 font-medium">{s.resolved ?? 0}</td>
                      <td className="px-4 py-3 text-purple-700 font-medium">{s.resolution_rate ?? 0}%</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(r.generated_at)}</td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <Link href={`/transparency/reports/${r.year}`} className="text-xs text-[#1e3a5f] font-medium hover:underline" target="_blank">View</Link>
                        <button onClick={() => generateReport('yearly', r.year)} disabled={generating} className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50" title="Regenerate"><RefreshCw className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}