'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import {
  durationSince,
  emptyVacancies,
  formatDuration,
  PROMOTION_RANKS,
} from '@/lib/promotion/aggregate';
import type {
  PromotionRank,
  PromotionSubmission,
  PromotionVacancies,
  UserProfile,
} from '@/types';

function normalizeVacancies(raw: PromotionVacancies | null | undefined): PromotionVacancies {
  const base = emptyVacancies();
  for (const rank of PROMOTION_RANKS) {
    const entry = raw?.[rank];
    base[rank] = {
      existing_vacant: Math.max(0, Number(entry?.existing_vacant) || 0),
      new_required: Math.max(0, Number(entry?.new_required) || 0),
      new_required_reason: entry?.new_required_reason ?? '',
    };
  }
  return base;
}

export default function PromotionDataPage() {
  const supabase = createClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [past, setPast] = useState<PromotionSubmission[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [cadreStartDate, setCadreStartDate] = useState('');
  const [vacancies, setVacancies] = useState<PromotionVacancies>(emptyVacancies());
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: prof }, { data: subs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('promotion_submissions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      if (prof) setProfile(prof as UserProfile);
      setPast((subs ?? []) as PromotionSubmission[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const serviceLabel = useMemo(
    () => formatDuration(durationSince(dateOfJoining)),
    [dateOfJoining]
  );
  const cadreLabel = useMemo(
    () => formatDuration(durationSince(cadreStartDate)),
    [cadreStartDate]
  );

  function resetForm() {
    setEditingId(null);
    setDateOfJoining('');
    setCadreStartDate('');
    setVacancies(emptyVacancies());
  }

  function startEdit(submission: PromotionSubmission) {
    setError('');
    setSuccess('');
    setEditingId(submission.id);
    setDateOfJoining(submission.date_of_joining);
    setCadreStartDate(submission.cadre_start_date);
    setVacancies(normalizeVacancies(submission.vacancies));
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  function updateVacancy(
    rank: PromotionRank,
    field: 'existing_vacant' | 'new_required' | 'new_required_reason',
    value: string
  ) {
    setVacancies((prev) => {
      const next = { ...prev, [rank]: { ...prev[rank] } };
      if (field === 'new_required_reason') {
        next[rank].new_required_reason = value;
      } else {
        const n = Math.max(0, parseInt(value || '0', 10) || 0);
        next[rank][field] = n;
        if (field === 'new_required' && n === 0) {
          next[rank].new_required_reason = '';
        }
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!profile) return;

    if (!dateOfJoining || !cadreStartDate) {
      setError('Please enter date of joining and date entered present cadre.');
      return;
    }
    if (cadreStartDate < dateOfJoining) {
      setError('Cadre start date cannot be before date of joining.');
      return;
    }

    for (const rank of PROMOTION_RANKS) {
      const entry = vacancies[rank];
      if (entry.new_required > 0 && !entry.new_required_reason?.trim()) {
        setError(`Please provide a reason for new ${rank} seats required.`);
        return;
      }
    }

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError('Not signed in.');
      return;
    }

    const payload = {
      user_id: user.id,
      full_name: profile.full_name,
      email: profile.email,
      campus: profile.campus,
      department: profile.department,
      designation: profile.designation,
      date_of_joining: dateOfJoining,
      cadre_start_date: cadreStartDate,
      vacancies,
    };

    if (editingId) {
      const { data, error: updateError } = await supabase
        .from('promotion_submissions')
        .update({
          full_name: payload.full_name,
          email: payload.email,
          campus: payload.campus,
          department: payload.department,
          designation: payload.designation,
          date_of_joining: payload.date_of_joining,
          cadre_start_date: payload.cadre_start_date,
          vacancies: payload.vacancies,
        })
        .eq('id', editingId)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setPast((prev) =>
        prev.map((s) => (s.id === editingId ? (data as PromotionSubmission) : s))
      );
      setSuccess('Promotion data updated. Admin dashboard will show the revised figures.');
      resetForm();
      setLoading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('promotion_submissions')
      .insert(payload)
      .select('*')
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setPast((prev) => [data as PromotionSubmission, ...prev]);
    setSuccess('Promotion data submitted successfully.');
    resetForm();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        'Delete this promotion submission? It will be removed from the admin dashboard and aggregates.'
      )
    ) {
      return;
    }

    setError('');
    setSuccess('');
    setDeletingId(id);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setDeletingId(null);
      setError('Not signed in.');
      return;
    }

    const { error: deleteError } = await supabase
      .from('promotion_submissions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    setPast((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) resetForm();
    setSuccess('Submission deleted. Admin dashboard and aggregates will no longer include it.');
    setDeletingId(null);
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
        subtitle="Report vacant / required seats in your department"
      />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-4 sm:p-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">
                {editingId ? 'Edit submission' : 'New submission'}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {editingId
                  ? 'Save changes to update this report in the admin dashboard.'
                  : 'Update campus, department, or designation from My Profile if needed.'}
              </p>
            </div>
            {editingId && (
              <Button type="button" variant="secondary" size="sm" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800">Your details (from profile)</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Name</p>
                <p className="font-medium text-slate-800">{profile.full_name}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Email</p>
                <p className="break-all font-medium text-slate-800">{profile.email}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Campus</p>
                <p className="font-medium text-slate-800">{profile.campus}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Department</p>
                <p className="font-medium text-slate-800">{profile.department}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 sm:col-span-2">
                <p className="text-xs text-slate-500">Present cadre</p>
                <p className="font-medium text-slate-800">{profile.designation}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="date_of_joining"
              label="Date of joining"
              type="date"
              value={dateOfJoining}
              onChange={(e) => setDateOfJoining(e.target.value)}
              required
            />
            <Input
              id="cadre_start_date"
              label="Date entered present cadre"
              type="date"
              value={cadreStartDate}
              onChange={(e) => setCadreStartDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-800">
              Total service: <strong>{serviceLabel}</strong>
            </span>
            <span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-800">
              In present cadre: <strong>{cadreLabel}</strong>
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-slate-900">Vacant / required seats in your department</h2>
              <p className="mt-1 text-xs text-slate-500">
                Existing vacant = sanctioned but unfilled (no reason). New required seats need a reason.
              </p>
            </div>
            {PROMOTION_RANKS.map((rank) => (
              <div key={rank} className="rounded-lg border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">{rank}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    id={`${rank}-existing`}
                    label="Existing vacant seats"
                    type="number"
                    min={0}
                    value={String(vacancies[rank].existing_vacant)}
                    onChange={(e) => updateVacancy(rank, 'existing_vacant', e.target.value)}
                  />
                  <Input
                    id={`${rank}-new`}
                    label="New seats required"
                    type="number"
                    min={0}
                    value={String(vacancies[rank].new_required)}
                    onChange={(e) => updateVacancy(rank, 'new_required', e.target.value)}
                  />
                </div>
                {vacancies[rank].new_required > 0 && (
                  <div className="mt-3">
                    <Input
                      id={`${rank}-reason`}
                      label="Reason for new seats"
                      type="text"
                      placeholder="Why are additional seats needed?"
                      value={vacancies[rank].new_required_reason ?? ''}
                      onChange={(e) => updateVacancy(rank, 'new_required_reason', e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={loading} className="w-full sm:w-auto">
              {editingId ? 'Save changes' : 'Submit promotion data'}
            </Button>
          </div>
        </form>

        {past.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-3 font-semibold text-slate-900">Your submissions</h2>
            <ul className="divide-y divide-slate-100">
              {past.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {s.campus} · {s.department}
                      {editingId === s.id && (
                        <span className="ml-2 text-xs font-normal text-[#1e3a5f]">(editing)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      Cadre: {s.designation} · Joined {s.date_of_joining} · Cadre since{' '}
                      {s.cadre_start_date}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{formatDate(s.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(s)}
                      disabled={loading || deletingId === s.id}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      loading={deletingId === s.id}
                      onClick={() => handleDelete(s.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
