import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminRegistrationsClient, {
  type PendingEmailRow,
} from './AdminRegistrationsClient';

async function loadPendingEmailConfirmations(): Promise<{
  rows: PendingEmailRow[];
  error: string | null;
}> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Missing service role key';
    return {
      rows: [],
      error:
        message.includes('SUPABASE_SERVICE_ROLE_KEY') || message.includes('Missing')
          ? 'Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to Vercel / .env.local and redeploy.'
          : message,
    };
  }

  const unconfirmedIds: { id: string; email: string; created_at: string }[] = [];
  let page = 1;
  const perPage = 100;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return { rows: [], error: error.message };
    }
    const users = data.users ?? [];
    for (const u of users) {
      if (!u.email_confirmed_at) {
        unconfirmedIds.push({
          id: u.id,
          email: u.email ?? '',
          created_at: u.created_at,
        });
      }
    }
    if (users.length < perPage) break;
    page += 1;
    if (page > 50) break; // safety cap
  }

  if (unconfirmedIds.length === 0) {
    return { rows: [], error: null };
  }

  const ids = unconfirmedIds.map((u) => u.id);
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name, campus, department, designation, created_at, role')
    .in('id', ids);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const rows: PendingEmailRow[] = unconfirmedIds
    .map((u) => {
      const p = profileMap.get(u.id);
      if (p?.role === 'admin') return null;
      return {
        id: u.id,
        email: p?.email || u.email,
        full_name: p?.full_name || '—',
        campus: p?.campus || '—',
        department: p?.department || '—',
        designation: p?.designation || '—',
        created_at: p?.created_at || u.created_at,
      };
    })
    .filter((r): r is PendingEmailRow => r !== null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { rows, error: null };
}

export default async function AdminRegistrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  const { rows, error } = await loadPendingEmailConfirmations();

  return <AdminRegistrationsClient initialPending={rows} loadError={error} />;
}
