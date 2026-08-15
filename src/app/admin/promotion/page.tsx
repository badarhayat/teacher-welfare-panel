'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CAMPUSES, DEPARTMENTS, formatDate } from '@/lib/utils';
import {
  PROMOTION_RANKS,
  aggregateVacanciesByMajority,
  countFacultyByDepartment,
  latestServiceRows,
} from '@/lib/promotion/aggregate';
import type {
  PromotionRank,
  PromotionSubmission,
  UserProfile,
} from '@/types';
import { Download, TrendingUp } from 'lucide-react';

export default function AdminPromotionPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [submissions, setSubmissions] = useState<PromotionSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [campus, setCampus] = useState('All');
  const [department, setDepartment] = useState('All');
  const [rank, setRank] = useState<PromotionRank | 'All'>('All');
  const [minServiceYears, setMinServiceYears] = useState(17);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data as UserProfile);
        });
    });
  }, [supabase]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('promotion_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`);
    }

    const { data } = await query;
    setSubmissions((data ?? []) as PromotionSubmission[]);
    setLoading(false);
  }, [supabase, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (campus !== 'All' && s.campus !== campus) return false;
      if (department !== 'All' && s.department !== department) return false;
      return true;
    });
  }, [submissions, campus, department]);

  const vacancyRows = useMemo(
    () => aggregateVacanciesByMajority(filtered, rank),
    [filtered, rank]
  );

  const serviceRows = useMemo(
    () => latestServiceRows(filtered, minServiceYears),
    [filtered, minServiceYears]
  );

  const deptCounts = useMemo(() => countFacultyByDepartment(serviceRows), [serviceRows]);

  function downloadCsv() {
    const lines: string[] = [];
    lines.push('Promotion Data Report');
    lines.push(`Generated,${new Date().toISOString()}`);
    lines.push(`Date from,${dateFrom || 'any'}`);
    lines.push(`Date to,${dateTo || 'any'}`);
    lines.push(`Campus,${campus}`);
    lines.push(`Department,${department}`);
    lines.push(`Rank filter,${rank}`);
    lines.push(`Min service years,${minServiceYears}`);
    lines.push('');
    lines.push('Vacancy summary (majority)');
    lines.push(
      'Campus,Department,Rank,Existing vacant,New required,Submissions,Existing used median,New used median'
    );
    for (const r of vacancyRows) {
      lines.push(
        [
          csv(r.campus),
          csv(r.department),
          csv(r.rank),
          r.existing_vacant,
          r.new_required,
          r.submission_count,
          r.existing_used_median ? 'yes' : 'no',
          r.new_used_median ? 'yes' : 'no',
        ].join(',')
      );
    }
    lines.push('');
    lines.push(`Faculty with service ≥ ${minServiceYears} years (latest submission in range)`);
    lines.push('Campus,Department,Count');
    for (const d of deptCounts) {
      lines.push([csv(d.campus), csv(d.department), d.count].join(','));
    }
    lines.push('');
    lines.push('Faculty detail');
    lines.push(
      'Name,Email,Campus,Department,Present cadre,Service years,Cadre years,Joined,Cadre start,Submitted'
    );
    for (const r of serviceRows) {
      lines.push(
        [
          csv(r.full_name),
          csv(r.email),
          csv(r.campus),
          csv(r.department),
          csv(r.designation),
          r.service_years,
          r.cadre_years,
          r.date_of_joining,
          r.cadre_start_date,
          r.submitted_at,
        ].join(',')
      );
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promotion-data-${dateFrom || 'all'}-to-${dateTo || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header
        user={profile}
        title="Promotion Data"
        subtitle="Majority vacant seats and faculty service years for seat announcements"
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Input
              id="promo-from"
              label="From date"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              id="promo-to"
              label="To date"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <Select
              id="promo-campus"
              label="Campus"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              options={[{ value: 'All', label: 'All Campuses' }, ...CAMPUSES.map((c) => ({ value: c, label: c }))]}
            />
            <Select
              id="promo-dept"
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              options={[
                { value: 'All', label: 'All Departments' },
                ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
              ]}
            />
            <Select
              id="promo-rank"
              label="Cadre / rank"
              value={rank}
              onChange={(e) => setRank(e.target.value as PromotionRank | 'All')}
              options={[
                { value: 'All', label: 'All ranks' },
                ...PROMOTION_RANKS.map((r) => ({ value: r, label: r })),
              ]}
            />
            <Input
              id="promo-min-years"
              label="Min service years"
              type="number"
              min={0}
              value={String(minServiceYears)}
              onChange={(e) => setMinServiceYears(Math.max(0, parseInt(e.target.value || '0', 10) || 0))}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={downloadCsv} className="inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" />
              Download report (CSV)
            </Button>
            <p className="self-center text-xs text-slate-500">
              {loading ? 'Loading…' : `${filtered.length} submission(s) in filter`}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <TrendingUp className="h-4 w-4 text-[#1e3a5f]" />
              Vacancy summary (majority vote)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Per campus / department / rank: mode of reported seats; median used on ties.
            </p>
          </div>
          {vacancyRows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">No vacancy data for this filter.</p>
          ) : (
            <>
              <div className="space-y-3 p-3 lg:hidden">
                {vacancyRows.map((r) => (
                  <div
                    key={`${r.campus}-${r.department}-${r.rank}`}
                    className="rounded-lg border border-slate-200 p-3 text-sm"
                  >
                    <p className="font-medium text-slate-900">
                      {r.rank}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.campus} · {r.department}
                    </p>
                    <p className="mt-2 text-slate-700">
                      Existing vacant: <strong>{r.existing_vacant}</strong>
                      {r.existing_used_median ? ' (median)' : ''} · New required:{' '}
                      <strong>{r.new_required}</strong>
                      {r.new_used_median ? ' (median)' : ''} · from {r.submission_count} report(s)
                    </p>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Campus</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Existing vacant</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">New required</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Reports</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vacancyRows.map((r) => (
                      <tr key={`${r.campus}-${r.department}-${r.rank}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">{r.campus}</td>
                        <td className="px-4 py-3 text-slate-700">{r.department}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{r.rank}</td>
                        <td className="px-4 py-3">
                          {r.existing_vacant}
                          {r.existing_used_median && (
                            <span className="ml-1 text-xs text-amber-600">median</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.new_required}
                          {r.new_used_median && (
                            <span className="ml-1 text-xs text-amber-600">median</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{r.submission_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-900">
              Faculty with ≥ {minServiceYears} years total service
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Based on latest submission per faculty in the selected date range.
            </p>
          </div>
          {deptCounts.length > 0 && (
            <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
              <p className="mb-2 text-xs font-medium uppercase text-slate-500">Counts by department</p>
              <div className="flex flex-wrap gap-2">
                {deptCounts.map((d) => (
                  <span
                    key={`${d.campus}-${d.department}`}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                  >
                    {d.campus} / {d.department}: <strong>{d.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
          {serviceRows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">No faculty match this threshold.</p>
          ) : (
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Cadre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Service yrs</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Cadre yrs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceRows.map((r) => (
                    <tr key={r.user_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{r.full_name}</p>
                        <p className="text-xs text-slate-500">{r.campus}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.department}</td>
                      <td className="px-4 py-3 text-slate-700">{r.designation}</td>
                      <td className="px-4 py-3 font-medium">{r.service_years}</td>
                      <td className="px-4 py-3">{r.cadre_years}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="space-y-2 p-3 lg:hidden">
            {serviceRows.map((r) => (
              <div key={r.user_id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-900">{r.full_name}</p>
                <p className="text-xs text-slate-500">
                  {r.campus} · {r.department} · {r.designation}
                </p>
                <p className="mt-1 text-slate-700">
                  Service {r.service_years} yrs · Cadre {r.cadre_years} yrs
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-4 text-left sm:px-6"
          >
            <span className="font-semibold text-slate-900">Raw submissions ({filtered.length})</span>
            <span className="text-sm text-slate-500">{showRaw ? 'Hide' : 'Show'}</span>
          </button>
          {showRaw && (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {filtered.map((s) => (
                <li key={s.id} className="px-4 py-3 text-sm sm:px-6">
                  <p className="font-medium text-slate-900">
                    {s.full_name} · {s.designation}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.campus} / {s.department} · Submitted {formatDate(s.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function csv(value: string) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
