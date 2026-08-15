import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import { UserProfile, BlockedEmail } from '@/types';
import BlockedEmailsClient from './BlockedEmailsClient';

export default async function AdminBlockedEmailsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: blocked }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('blocked_emails')
      .select('id, email, reason, blocked_by, created_at')
      .order('created_at', { ascending: false }),
  ]);

  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  return (
    <div className="flex flex-col flex-1">
      <Header
        user={profile as UserProfile}
        title="Blocked Emails"
        subtitle="Prevent departed faculty from registering again"
      />
      <main className="flex-1 p-4 sm:p-6">
        <BlockedEmailsClient initialBlocked={(blocked ?? []) as BlockedEmail[]} />
      </main>
    </div>
  );
}
