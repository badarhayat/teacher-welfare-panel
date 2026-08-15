/**
 * Auth email redirect target. Must be listed in Supabase Redirect URLs.
 * Prefer NEXT_PUBLIC_SITE_URL so confirmation emails never point at localhost
 * when teachers open them on phones.
 */
export function getEmailRedirectTo(origin?: string): string {
  const envSite = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const windowOrigin =
    typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';
  const passed = (origin || '').replace(/\/$/, '');

  const isLocal = (url: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);

  let base = envSite || passed || windowOrigin;

  // If somehow we only have localhost but env has production, prefer env
  if (envSite && isLocal(base) && !isLocal(envSite)) {
    base = envSite;
  }

  // Browser on production: allow current origin when env is missing
  if (!envSite && windowOrigin && !isLocal(windowOrigin)) {
    base = windowOrigin;
  }

  return `${base}/auth/callback?next=/login`;
}
