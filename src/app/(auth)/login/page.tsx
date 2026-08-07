'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Eye, EyeOff, AlertCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setPendingApproval(false);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Check is_approved status
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved, role')
        .eq('id', data.user.id)
        .single();

      if (profile && !profile.is_approved && profile.role !== 'admin') {
        // Sign out and show pending message
        await supabase.auth.signOut();
        setPendingApproval(true);
        setLoading(false);
        return;
      }

      // Redirect admins to admin panel
      if (profile?.role === 'admin') {
        router.replace('/admin');
        return;
      }
    }

    router.replace('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2744] via-[#1e3a5f] to-[#2a4f7c] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 rounded-2xl mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-blue-200 text-sm mt-1">Sign in to Teacher Welfare Panel</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {pendingApproval && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-5 text-sm">
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Account Pending Approval</p>
                <p>Your registration is awaiting admin review. You will be able to login once approved.</p>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
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
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 pr-10 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign In
            </Button>
          </form>

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
