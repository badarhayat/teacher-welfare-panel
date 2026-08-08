'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import { CAMPUSES, DESIGNATIONS, DEPARTMENTS } from '@/lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '@/types';

export default function ProfilePage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    campus: '',
    department: '',
    designation: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setProfile(data as UserProfile);
          setForm({
            full_name: data.full_name,
            campus: data.campus,
            department: data.department,
            designation: data.designation,
          });
        }
      });
    });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setProfile((prev) => prev ? { ...prev, ...form } as UserProfile : prev);
    }
    setLoading(false);
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Header user={profile} title="My Profile" subtitle="Manage your account details" />
      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-xl mx-auto space-y-5">
          {/* Profile info card */}
          <Card>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-2xl font-bold uppercase">
                {profile.full_name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{profile.full_name}</h2>
                <p className="text-sm text-slate-500">{profile.email}</p>
                <span className="inline-block mt-1 text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full font-medium capitalize">
                  {profile.role}
                </span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Profile updated successfully.
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <Input
                id="full_name"
                name="full_name"
                label="Full Name"
                type="text"
                value={form.full_name}
                onChange={handleChange}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  id="campus"
                  name="campus"
                  label="Campus"
                  value={form.campus}
                  onChange={handleChange}
                  options={CAMPUSES.map((c) => ({ value: c, label: c }))}
                />
                <Select
                  id="department"
                  name="department"
                  label="Department"
                  value={form.department}
                  onChange={handleChange}
                  options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                />
              </div>

              <Select
                id="designation"
                name="designation"
                label="Designation"
                value={form.designation}
                onChange={handleChange}
                options={DESIGNATIONS.map((d) => ({ value: d, label: d }))}
              />

              <div className="pt-2">
                <Button type="submit" loading={loading} size="lg">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
