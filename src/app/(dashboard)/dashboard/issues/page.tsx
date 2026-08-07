import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import IssueTable from '@/components/issues/IssueTable';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { UserProfile } from '@/types';
import Button from '@/components/ui/Button';

export default async function IssuesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: issues }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('issues')
      .select('*, replies(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  if (!profile) redirect('/login');

  return (
    <div className="flex flex-col flex-1">
      <Header user={profile as UserProfile} title="My Issues" subtitle="All your submitted issues" />
      <main className="flex-1 p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">All Issues</h2>
              <p className="text-sm text-slate-500">{issues?.length ?? 0} total</p>
            </div>
            <Link href="/dashboard/issues/new">
              <Button size="sm" className="flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" />
                Submit New
              </Button>
            </Link>
          </div>
          <IssueTable issues={issues ?? []} basePath="/dashboard/issues" />
        </div>
      </main>
    </div>
  );
}
