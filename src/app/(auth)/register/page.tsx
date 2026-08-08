'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, AlertCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { CAMPUSES_DEPARTMENTS, DESIGNATIONS } from '@/lib/utils';

const CAMPUS_KEYS = Object.keys(CAMPUSES_DEPARTMENTS) as string[];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    campus: '',
    department: '',
    designation: '',
  });
  const [registrationData, setRegistrationData] = useState<{
    full_name: string;
    email: string;
    campus: string;
    department: string;
    designation: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    if (name === 'campus') {
      setForm((prev) => ({ ...prev, campus: value, department: '' }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  const departmentOptions = form.campus ? CAMPUSES_DEPARTMENTS[form.campus] ?? [] : [];

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.email.endsWith('@uet.edu.pk')) {
      setError('Please use your Engineering University email address.');
      return;
    }
    if (!form.campus || !form.department) {
      setError('Please select a campus and department.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    // signUp creates the auth user; handle_new_user trigger creates the profile
    // with is_approved = false so the user is blocked until an admin approves.
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          campus: form.campus,
          department: form.department,
          designation: form.designation,
          role: 'teacher',
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setRegistrationData({
      full_name: form.full_name,
      email: form.email,
      campus: form.campus,
      department: form.department,
      designation: form.designation,
    });
    setPending(true);
    setLoading(false);
  }

  if (pending && registrationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f2744] via-[#1e3a5f] to-[#2a4f7c] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Registration Submitted!</h2>
          <p className="text-slate-600 text-sm mb-4">
            Your registration is pending admin approval. You will be able to log in once approved.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 text-left text-sm text-slate-600 mb-6 space-y-1">
            <p><span className="font-medium">Name:</span> {registrationData.full_name}</p>
            <p><span className="font-medium">Email:</span> {registrationData.email}</p>
            <p><span className="font-medium">Campus:</span> {registrationData.campus}</p>
            <p><span className="font-medium">Department:</span> {registrationData.department}</p>
            <p><span className="font-medium">Designation:</span> {registrationData.designation}</p>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            The university administrator will review your application and verify your faculty status before granting access.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f2744] via-[#1e3a5f] to-[#2a4f7c] p-4 py-8 sm:py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 rounded-2xl mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Your Account</h1>
          <p className="text-blue-200 text-sm mt-1">Teacher Welfare Panel &mdash; Engineering University Faculty Registration</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-5 text-sm">
            <p className="font-medium mb-0.5">Engineering University Faculty Only</p>
            <p>Registration requires an Engineering University email address. Your account will be reviewed by an administrator before access is granted.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              id="full_name"
              name="full_name"
              label="Full Name"
              type="text"
              placeholder="Dr. Ahmed Khan"
              value={form.full_name}
              onChange={handleChange}
              required
            />

            <div>
              <Input
                id="email"
                name="email"
                label="University Email"
                type="email"
                placeholder="faculty@university.edu"
                value={form.email}
                onChange={handleChange}
                required
              />
              {form.email && !form.email.endsWith('@uet.edu.pk') && (
                <p className="text-xs text-red-500 mt-1">Please enter your Engineering University email address.</p>
              )}
            </div>

            <Select
              id="campus"
              name="campus"
              label="Campus"
              value={form.campus}
              onChange={handleChange}
              required
              placeholder="Select campus"
              options={CAMPUS_KEYS.map((c) => ({ value: c, label: c }))}
            />

            <div>
              <Select
                id="department"
                name="department"
                label="Department / School / Institute"
                value={form.department}
                onChange={handleChange}
                required
                placeholder={form.campus ? 'Select department' : 'Select a campus first'}
                options={departmentOptions.map((d) => ({ value: d, label: d }))}
              />
              {!form.campus && (
                <p className="text-xs text-slate-400 mt-1">Select a campus to see available departments</p>
              )}
            </div>

            <Select
              id="designation"
              name="designation"
              label="Designation"
              value={form.designation}
              onChange={handleChange}
              required
              placeholder="Select designation"
              options={DESIGNATIONS.map((d) => ({ value: d, label: d }))}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <Input
                id="password"
                name="password"
                label="Password"
                type="password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange}
                required
              />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
              Submit Registration
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#1e3a5f] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}