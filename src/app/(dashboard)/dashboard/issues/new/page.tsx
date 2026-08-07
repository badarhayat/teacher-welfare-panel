'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Card from '@/components/ui/Card';
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES } from '@/lib/utils';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { UserProfile } from '@/types';
import { useEffect } from 'react';

export default function NewIssuePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'Medium',
    is_anonymous: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => { if (data) setProfile(data as UserProfile); });
    });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const value = e.target instanceof HTMLInputElement && e.target.type === 'checkbox'
      ? e.target.checked
      : e.target.value;
    setForm((prev) => ({ ...prev, [e.target.name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.category) { setError('Please select a category.'); return; }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Issue insert aborted: no authenticated user session found.');
      setLoading(false);
      router.replace('/login');
      return;
    }

    const payload = {
      user_id: user.id,
      is_anonymous: form.is_anonymous,
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
      status: 'Submitted',
    };

    const { error } = await supabase.from('issues').insert(payload);

    if (error) {
      console.error('Issue insert failed from submission form', {
        userId: user.id,
        payload: {
          user_id: payload.user_id,
          is_anonymous: payload.is_anonymous,
          titleLength: payload.title.length,
          category: payload.category,
          priority: payload.priority,
          status: payload.status,
        },
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      });
      setError(error.message);
      setLoading(false);
      return;
    }

    router.replace('/dashboard/issues');
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
      <Header user={profile} title="Submit Issue" subtitle="Raise a concern or suggestion" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard/issues"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Issues
          </Link>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Issue Details</h2>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                id="title"
                name="title"
                label="Issue Title"
                type="text"
                placeholder="Brief title describing your issue"
                value={form.title}
                onChange={handleChange}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  id="category"
                  name="category"
                  label="Category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  placeholder="Select category"
                  options={ISSUE_CATEGORIES.map((c) => ({ value: c, label: c }))}
                />
                <Select
                  id="priority"
                  name="priority"
                  label="Priority"
                  value={form.priority}
                  onChange={handleChange}
                  options={ISSUE_PRIORITIES.map((p) => ({ value: p, label: p }))}
                />
              </div>

              <Textarea
                id="description"
                name="description"
                label="Description"
                placeholder="Describe your issue in detail. Include relevant dates, amounts, or reference numbers if applicable."
                value={form.description}
                onChange={handleChange}
                rows={6}
                required
              />

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                  <input
                    id="is_anonymous"
                    name="is_anonymous"
                    type="checkbox"
                    checked={form.is_anonymous}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                  />
                  <span>
                    <span className="font-medium text-slate-900">Submit anonymously</span>
                    <span className="block text-slate-600">
                      Your identity, department, and campus will be hidden for this issue, including from admins.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" loading={loading} size="lg">
                  Submit Issue
                </Button>
                <Link href="/dashboard/issues">
                  <Button type="button" variant="secondary" size="lg">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
