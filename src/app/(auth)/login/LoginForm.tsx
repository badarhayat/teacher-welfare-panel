'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Eye, EyeOff, AlertCircle, Clock, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { getEmailRedirectTo } from '@/lib/auth/emailRedirect';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (searchParams.get('error') === 'confirmation_failed') {
      setError('Email confirmation link was invalid or expired. Request a new one below.');
      setNeedsEmailConfirm(true);
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setPendingApproval(false);
    setNeedsEmailConfirm(false);
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      const msg = signInError.message || 'Sign in failed';
      setError(msg);
      if (/confirm|verified|verification/i.test(msg)) {
        setNeedsEmailConfirm(true);
      }
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved, role')
        .eq('id', data.user.id)
        .single();

      if (profile && !profile.is_approved && profile.role !== 'admin') {
        await supabase.auth.signOut();
        setPendingApproval(true);
        setLoading(false);
        return;
      }

      if (profile?.role === 'admin') {
        router.replace('/admin');
        return;
      }
    }

    router.replace('/dashboard');
  }

  async function handleResendConfirmation() {
    if (!email.trim()) {
      setError('Enter your email address above, then resend confirmation.');
      return;
    }
    setResending(true);
    setError('');
    setInfo('');
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: getEmailRedirectTo() },
    });
    if (resendError) {
      setError(resendError.message);
    } else {
      setInfo('Confirmation email sent. Check your inbox and spam folder.');
      setNeedsEmailConfirm(true);
    }
    setResending(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f2744] via-[#1e3a5f] to-[#2a4f7c] p-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 rounded-2xl mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-blue-200 text-sm mt-1">Sign in to Teacher Welfare Panel</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
          {pendingApproval && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-5 text-sm">
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Account Not Yet Active</p>
                <p>
                  Engineering University (@uet.edu.pk) accounts only need email verification.
                  If you just registered, confirm the link in your inbox, then try again.
                  Otherwise contact an administrator.
                </p>
              </div>
            </div>
          )}
          {needsEmailConfirm && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-5 text-sm">
              <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Email not confirmed</p>
                <p className="mb-2">
                  Enter your university email above, then resend the confirmation link.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={resending}
                  onClick={handleResendConfirmation}
                >
                  Resend confirmation email
                </Button>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {info && (
            <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {info}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              id="email"
              label="Email Address"
              type="email"
              placeholder="you@university.edu.pk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-11 text-base text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign In
            </Button>
          </form>

          {!needsEmailConfirm && (
            <p className="mt-4 text-center text-xs text-slate-500">
              Didn&apos;t get a confirmation email?{' '}
              <button
                type="button"
                className="font-medium text-[#1e3a5f] hover:underline"
                onClick={() => setNeedsEmailConfirm(true)}
              >
                Resend it
              </button>
            </p>
          )}

          <p className="text-center text-sm text-slate-600 mt-6">
            No account?{' '}
            <Link href="/register" className="text-[#1e3a5f] font-medium hover:underline">
              Register here
            </Link>
          </p>
        </div>

        <p className="text-center text-blue-300/60 text-xs mt-6">
          Teacher Welfare Panel · Engineering University
        </p>
      </div>
    </div>
  );
}
