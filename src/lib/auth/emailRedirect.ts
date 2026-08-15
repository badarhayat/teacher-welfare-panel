/** Shared auth email redirect target (must be listed in Supabase Redirect URLs). */
export function getEmailRedirectTo(origin?: string): string {
  const base =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    '';
  return `${base.replace(/\/$/, '')}/auth/callback?next=/login`;
}
