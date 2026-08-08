// Prevents prerendering — auth pages require runtime env vars for the Supabase client
export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
