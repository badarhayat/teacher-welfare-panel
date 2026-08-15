import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * DELETE a faculty member from Auth (cascades profile/issues) and optionally
 * block their email from re-registering.
 *
 * Body: { userId: string, blockEmail?: boolean, reason?: string }
 */
export async function DELETE(request: NextRequest) {
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

    let body: { userId?: string; blockEmail?: boolean; reason?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const userId = body.userId?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (userId === user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
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
              'Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local and restart the dev server.',
          },
          { status: 500 }
        );
      }
      throw err;
    }

    const { data: target, error: targetError } = await admin
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const blockEmail = body.blockEmail !== false; // default true
    const reason =
      body.reason?.trim() ||
      'Removed from faculty list by administrator';

    if (blockEmail && target.email) {
      const { error: blockError } = await admin.from('blocked_emails').upsert(
        {
          email: target.email.toLowerCase(),
          reason,
          blocked_by: user.id,
        },
        { onConflict: 'email' }
      );
      if (blockError) {
        return NextResponse.json(
          { error: `Failed to block email: ${blockError.message}` },
          { status: 500 }
        );
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      email: target.email,
      blocked: blockEmail,
    });
  } catch (err) {
    console.error('Admin delete user error:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete member';
    if (message.includes('SUPABASE_SERVICE_ROLE_KEY') || message.includes('Missing')) {
      return NextResponse.json(
        {
          error:
            'Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local and restart the dev server.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
