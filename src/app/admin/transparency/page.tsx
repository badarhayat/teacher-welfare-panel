'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { CommunityUpdate, UserProfile } from '@/types';
import { formatDate } from '@/lib/utils';
import { CheckCircle2, Megaphone, AlertCircle } from 'lucide-react';

export default function AdminTransparencyPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [updates, setUpdates] = useState<CommunityUpdate[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) setProfile(data as UserProfile);
      });
    });
    fetchUpdates();
  }, []);

  async function fetchUpdates() {
    const { data } = await supabase
      .from('community_updates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setUpdates((data ?? []) as CommunityUpdate[]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Authentication required.');
      setLoading(false);
      return;
    }

    const payload = {
      title: title.trim(),
      content: content.trim(),
      is_published: publishNow,
      published_at: publishNow ? new Date().toISOString() : null,
      created_by: user.id,
    };

    const { error } = await supabase.from('community_updates').insert(payload);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTitle('');
    setContent('');
    setPublishNow(true);
    await fetchUpdates();
    setLoading(false);
  }

  async function togglePublish(update: CommunityUpdate) {
    const nextPublish = !update.is_published;
    await supabase
      .from('community_updates')
      .update({
        is_published: nextPublish,
        published_at: nextPublish ? new Date().toISOString() : null,
      })
      .eq('id', update.id);
    await fetchUpdates();
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
      <Header user={profile} title="Transparency Controls" subtitle="Publish community resolutions and announcements" />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-5">Create Community Update</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Update published successfully.
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              id="update_title"
              label="Announcement Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Welfare Committee Monthly Progress"
              required
            />
            <Textarea
              id="update_content"
              label="Announcement Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Summarize actions, improvements, and policy decisions for faculty community."
              required
            />
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
              />
              Publish immediately on public transparency board
            </label>
            <Button type="submit" loading={loading} className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> Save Update
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Community Updates</h2>
          {updates.length === 0 ? (
            <p className="text-sm text-slate-500">No updates created yet.</p>
          ) : (
            <div className="space-y-3">
              {updates.map((update) => (
                <div key={update.id} className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{update.title}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{update.content}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {update.published_at ? `Published: ${formatDate(update.published_at)}` : `Drafted: ${formatDate(update.created_at)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => togglePublish(update)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${update.is_published ? 'bg-slate-200 text-slate-700' : 'bg-[#1e3a5f] text-white'}`}
                    >
                      {update.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
