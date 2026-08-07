import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminReportsClient from './AdminReportsClient';
import { getMonthName } from '@/lib/utils';
import type { MonthlyReport, YearlyReport } from '@/types';

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  const [{ data: monthlyReports }, { data: yearlyReports }] = await Promise.all([
    supabase
      .from('monthly_reports')
      .select('id, year, month, stats, generated_at')
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
    supabase
      .from('yearly_reports')
      .select('id, year, stats, generated_at')
      .order('year', { ascending: false }),
  ]);

  return (
    <AdminReportsClient
      monthlyReports={(monthlyReports ?? []) as MonthlyReport[]}
      yearlyReports={(yearlyReports ?? []) as YearlyReport[]}
    />
  );
}
