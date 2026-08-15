'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import IssueTable from '@/components/issues/IssueTable';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { CAMPUSES, DEPARTMENTS, ISSUE_STATUSES, ISSUE_CATEGORIES, ISSUE_PRIORITIES, ACTIVE_STATUSES, ARCHIVED_STATUSES } from '@/lib/utils';
import { Issue, UserProfile } from '@/types';
import { Download, Search, Inbox, Archive, List } from 'lucide-react';
import UnresolvedDocsButtons from '@/components/admin/UnresolvedDocsButtons';

type ViewMode = 'active' | 'archived' | 'all';

export default function AdminIssuesPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const v = p.get('view');
      if (v === 'archived' || v === 'all') return v;
    }
    return 'active';
  });
  const [filters, setFilters] = useState({
    status: 'All',
    priority: 'All',
    category: 'All',
    campus: 'All',
    department: 'All',
    search: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) setProfile(data as UserProfile);
      });
    });
  }, []);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('issues')
      .select('*, user:profiles!issues_user_id_fkey(*), replies(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply view-mode pre-filter at the server level
    if (viewMode === 'active') {
      query = query.in('status', ACTIVE_STATUSES);
    } else if (viewMode === 'archived') {
      query = query.in('status', ARCHIVED_STATUSES);
    }

    if (filters.status !== 'All') query = query.eq('status', filters.status);
    if (filters.priority !== 'All') query = query.eq('priority', filters.priority);
    if (filters.category !== 'All') query = query.eq('category', filters.category);
    if (filters.search) query = query.ilike('title', `%${filters.search}%`);

    const { data } = await query;
    let result = ((data ?? []) as Issue[]).map((issue) => ({
      ...issue,
      user: issue.is_anonymous ? undefined : issue.user,
    }));

    const missingUserIds = Array.from(
      new Set(
        result
          .filter((issue) => !issue.is_anonymous && !issue.user && issue.user_id)
          .map((issue) => issue.user_id)
      )
    );

    if (missingUserIds.length > 0) {
      const { data: fallbackProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', missingUserIds);

      if (!profileError && fallbackProfiles) {
        const profileMap = new Map(fallbackProfiles.map((p) => [p.id, p]));
        result = result.map((issue) => {
          if (issue.is_anonymous || issue.user) return issue;
          return {
            ...issue,
            user: profileMap.get(issue.user_id) as UserProfile | undefined,
          };
        });
      }
    }

    if (filters.campus !== 'All') {
      result = result.filter((i) => i.user?.campus === filters.campus);
    }
    if (filters.department !== 'All') {
      result = result.filter((i) => i.user?.department === filters.department);
    }

    setIssues(result);
    setLoading(false);
  }, [filters, viewMode]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  async function exportPDF() {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape' });
    const viewLabel = viewMode === 'active' ? 'Active Issues' : viewMode === 'archived' ? 'Archived Issues' : 'All Issues';
    doc.setFontSize(14);
    doc.text(`Teacher Welfare Panel — ${viewLabel}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [['#', 'Title', 'Faculty', 'Department', 'Campus', 'Category', 'Priority', 'Status', 'Date']],
      body: issues.map((issue, idx) => [
        idx + 1,
        issue.title,
        issue.is_anonymous ? 'Anonymous Faculty Member' : (issue.user?.full_name ?? '—'),
        issue.is_anonymous ? 'Hidden' : (issue.user?.department ?? '—'),
        issue.is_anonymous ? 'Hidden' : (issue.user?.campus ?? '—'),
        issue.category,
        issue.priority,
        issue.status,
        new Date(issue.created_at).toLocaleDateString(),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 95] },
    });

    doc.save(`welfare-issues-${viewMode}-${Date.now()}.pdf`);
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const viewTabs: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'active',   label: 'Active',   icon: <Inbox   className="w-4 h-4" /> },
    { key: 'archived', label: 'Archived', icon: <Archive className="w-4 h-4" /> },
    { key: 'all',      label: 'All',      icon: <List    className="w-4 h-4" /> },
  ];

  const statusOptions =
    viewMode === 'active'   ? [{ value: 'All', label: 'All Active Statuses' }, ...ACTIVE_STATUSES.map((s) => ({ value: s, label: s }))] :
    viewMode === 'archived' ? [{ value: 'All', label: 'All Archived Statuses' }, ...ARCHIVED_STATUSES.map((s) => ({ value: s, label: s }))] :
    [{ value: 'All', label: 'All Statuses' }, ...ISSUE_STATUSES.map((s) => ({ value: s, label: s }))];

  return (
    <div className="flex flex-col flex-1">
      <Header user={profile} title="All Issues" subtitle="Manage and respond to faculty issues" />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        {/* View mode tabs */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1.5 w-fit shadow-sm">
          {viewTabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => { setViewMode(key); setFilters((f) => ({ ...f, status: 'All' })); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === key
                  ? 'bg-[#1e3a5f] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
              />
            </div>
            <Select
              id="filter-status"
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              options={statusOptions}
            />
            <Select
              id="filter-priority"
              value={filters.priority}
              onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))}
              options={[{ value: 'All', label: 'All Priorities' }, ...ISSUE_PRIORITIES.map((p) => ({ value: p, label: p }))]}
            />
            <Select
              id="filter-category"
              value={filters.category}
              onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
              options={[{ value: 'All', label: 'All Categories' }, ...ISSUE_CATEGORIES.map((c) => ({ value: c, label: c }))]}
            />
            <Select
              id="filter-campus"
              value={filters.campus}
              onChange={(e) => setFilters((p) => ({ ...p, campus: e.target.value }))}
              options={[{ value: 'All', label: 'All Campuses' }, ...CAMPUSES.map((c) => ({ value: c, label: c }))]}
            />
            <Select
              id="filter-dept"
              value={filters.department}
              onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))}
              options={[{ value: 'All', label: 'All Depts' }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))]}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">
                {viewMode === 'active' ? 'Active Issues' : viewMode === 'archived' ? 'Archived Issues' : 'All Issues'}
              </h2>
              <p className="text-sm text-slate-500">
                {loading ? 'Loading...' : `${issues.length} result${issues.length !== 1 ? 's' : ''}`}
              </p>
              {viewMode === 'archived' && (
                <p className="text-xs text-slate-500 mt-0.5">Archived issues are kept permanently and never deleted.</p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <UnresolvedDocsButtons />
              <Button size="sm" variant="outline" onClick={exportPDF} className="flex items-center gap-1.5">
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <IssueTable issues={issues} adminView basePath="/admin/issues" />
          )}
        </div>
      </main>
    </div>
  );
}
