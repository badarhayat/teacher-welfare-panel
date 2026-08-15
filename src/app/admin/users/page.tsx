import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import { UserProfile } from '@/types';
import { formatDate } from '@/lib/utils';
import { User, AlertCircle } from 'lucide-react';
import PromoteButton from './PromoteButton';
import DeleteMemberButton from './DeleteMemberButton';

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: users, error: usersError }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('*, issues(id)').order('full_name'),
  ]);

  if (!profile) redirect('/login');

  const members = users ?? [];

  return (
    <div className="flex flex-col flex-1">
      <Header
        user={profile as UserProfile}
        title="Faculty Members"
        subtitle="Registered after email verification — no admin approval required"
      />
      <main className="flex-1 p-4 sm:p-6">
        {usersError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Could not load faculty list</p>
              <p className="mt-0.5">{usersError.message}</p>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-900">All Members</h2>
            <p className="text-sm text-slate-500">
              {members.length} member{members.length === 1 ? '' : 's'} · promote, or remove departed faculty
            </p>
          </div>

          {!usersError && members.length === 0 ? (
            <div className="px-4 py-16 text-center text-slate-500">
              <User className="mx-auto mb-3 h-10 w-10 text-slate-200" />
              <p className="font-medium text-slate-700">No faculty members yet</p>
              <p className="mt-1 text-sm">
                After teachers register and verify their @uet.edu.pk email, they appear here.
                If users exist in Auth but not here, run the{' '}
                <code className="rounded bg-slate-100 px-1 text-xs">email_only_faculty_access.sql</code> patch.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-3 lg:hidden">
                {members.map((u) => (
                  <div key={u.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-sm font-semibold uppercase text-white">
                        {(u.full_name || u.email || '?').charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-medium text-slate-900">{u.full_name || '—'}</p>
                        <p className="break-all text-xs text-slate-500">{u.email}</p>
                      </div>
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {Array.isArray(u.issues) ? u.issues.length : 0} issues
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-slate-600">
                      <p className="break-words">
                        {u.designation} · {u.department}
                      </p>
                      <p className="break-words text-xs text-slate-500">
                        {u.campus} · Joined {formatDate(u.created_at)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                      <PromoteButton userId={u.id} initialRole={u.role} currentAdminId={user.id} />
                      <DeleteMemberButton
                        userId={u.id}
                        userName={u.full_name}
                        userEmail={u.email}
                        currentAdminId={user.id}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Department
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Campus
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Designation
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Issues
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Joined
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map((u) => (
                      <tr key={u.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-xs font-semibold uppercase text-white">
                              {(u.full_name || u.email || '?').charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{u.full_name || '—'}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{u.department}</td>
                        <td className="px-4 py-3 text-slate-600">{u.campus}</td>
                        <td className="px-4 py-3 text-slate-600">{u.designation}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {Array.isArray(u.issues) ? u.issues.length : 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                        <td className="px-4 py-3">
                          <PromoteButton
                            userId={u.id}
                            initialRole={u.role}
                            currentAdminId={user.id}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <DeleteMemberButton
                            userId={u.id}
                            userName={u.full_name}
                            userEmail={u.email}
                            currentAdminId={user.id}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
