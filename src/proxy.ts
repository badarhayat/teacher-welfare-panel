import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute = pathname === '/' || pathname === '/login' || pathname === '/register';
  const isAuthRoute = pathname === '/login' || pathname === '/register';
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isAdminRoute = pathname.startsWith('/admin');
  const isProfileRoute = pathname === '/profile' || pathname.startsWith('/profile/');
  const isProtectedRoute = isDashboardRoute || isAdminRoute || isProfileRoute;

  if (pathname.startsWith('/api')) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtectedRoute) {
    console.log(`[proxy] unauthenticated redirect -> /login from ${pathname}`);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (!user) {
    if (!isPublicRoute) {
      console.log(`[proxy] unauthenticated public/other access allowed: ${pathname}`);
    }
    return supabaseResponse;
  }

  console.log(`[proxy] authenticated user.id=${user.id} path=${pathname}`);

  const profileResult = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const { data: profile, error: profileError } = profileResult;
  const role = typeof profile?.role === 'string' ? profile.role : null;

  console.log('[proxy] profile query response', {
    userId: user.id,
    data: profile,
    error: profileError,
    status: profileResult.status,
    statusText: profileResult.statusText,
  });
  console.log('[proxy] profile query error', profileError);
  console.log('[proxy] role value', role);

  // Do not treat query failures as missing-profile; avoid false loop/sign-out behavior.
  if (profileError && profileError.code !== 'PGRST116') {
    console.error('[proxy] profile query failed unexpectedly; bypassing proxy role checks', {
      userId: user.id,
      pathname,
      error: profileError,
    });
    return supabaseResponse;
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && profile) {
    console.log(`[proxy] authenticated redirect -> /dashboard from ${pathname}`);
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Clear stale auth sessions if profile is missing on protected routes.
  if (!profile && isProtectedRoute) {
    console.log(`[proxy] missing profile; signing out and redirecting -> /login from ${pathname}`);
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Admin-only route guard
  if (isAdminRoute) {
    if (role !== 'admin') {
      console.log(`[proxy] non-admin redirect -> /dashboard from ${pathname}`);
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
