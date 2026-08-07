import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminRegistrationsClient from './AdminRegistrationsClient';

export default async function AdminRegistrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  // Pending = teachers who signed up but have not been approved yet
  const { data: registrations } = await supabase
    .from('profiles')
    .select('id, email, full_name, campus, department, designation, created_at, is_approved')
    .eq('role', 'teacher')
    .order('created_at', { ascending: false });

  return <AdminRegistrationsClient initialRegistrations={registrations ?? []} />;
}
