'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { AlertCircle, CheckCircle2, Send } from 'lucide-react';

interface TeacherReplyFormProps {
  issueId: string;
}

export default function TeacherReplyForm({ issueId }: TeacherReplyFormProps) {
  const supabase = createClient();
  const router = useRouter();

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    const payload = {
      issue_id: issueId,
      user_id: user.id,
      message: message.trim(),
    };

    const { error: insertError } = await supabase.from('replies').insert(payload);

    if (insertError) {
      console.error('Teacher reply insert failed', {
        issueId,
        userId: user.id,
        error: {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        },
      });
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setMessage('');
    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-6 border-t border-slate-100 pt-5">
      <h4 className="font-medium text-slate-900">Reply to Admin</h4>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Reply sent successfully.
        </div>
      )}

      <Textarea
        id="teacher-reply"
        label="Your Message"
        placeholder="Write your follow-up reply to the admin..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        required
      />
      <Button type="submit" loading={loading} className="flex items-center gap-2">
        <Send className="w-4 h-4" /> Send Reply
      </Button>
    </form>
  );
}
