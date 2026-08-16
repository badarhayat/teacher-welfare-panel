import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST — mark a user's email as confirmed (admin only).
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: { userId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const userId = body.userId?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('SUPABASE_SERVICE_ROLE_KEY') || message.includes('Missing')) {
        return NextResponse.json(
          {
            error:
              'Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local / Vercel and redeploy.',
          },
          { status: 500 }
        );
      }
      throw err;
    }

    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to confirm email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      userId,
      email: updated.user.email,
      email_confirmed_at: updated.user.email_confirmed_at,
    });
  } catch (err) {
    console.error('Admin confirm email error:', err);
    const message = err instanceof Error ? err.message : 'Failed to confirm email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
