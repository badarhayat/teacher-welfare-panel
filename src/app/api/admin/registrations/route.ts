import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET: List pending registrations (admin only)
export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin status (in production, verify JWT token)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch pending registrations
    const { data, error } = await supabase
      .from('teacher_registrations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ registrations: data }, { status: 200 });
  } catch (error) {
    console.error('Fetch registrations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Approve or reject a registration (admin only)
export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const adminAuthClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const body = await request.json();
    const { registration_id, action } = body; // action: 'approve' | 'reject'

    if (!registration_id || !action) {
      return NextResponse.json(
        { error: 'Missing registration_id or action' },
        { status: 400 }
      );
    }

    // Fetch the pending registration
    const { data: registration, error: fetchError } = await supabase
      .from('teacher_registrations')
      .select('*')
      .eq('id', registration_id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !registration) {
      return NextResponse.json(
        { error: 'Registration not found or already processed' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      // Create auth user
      const { data: authUser, error: authError } = await adminAuthClient.auth.admin.createUser({
        email: registration.email,
        password: registration.password_hash,
        email_confirm: true,
        user_metadata: {
          full_name: registration.full_name,
          campus: registration.campus,
          department: registration.department,
          designation: registration.designation,
        },
      });

      if (authError) {
        console.error('Auth user creation error:', authError);
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 400 }
        );
      }

      // Create profile with is_approved=true
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authUser.user.id,
            email: registration.email,
            full_name: registration.full_name,
            campus: registration.campus,
            department: registration.department,
            designation: registration.designation,
            role: 'teacher',
            is_approved: true,
            approved_at: new Date().toISOString(),
          },
        ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 400 }
        );
      }

      // Update registration status to 'approved'
      const { error: updateError } = await supabase
        .from('teacher_registrations')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', registration_id);

      if (updateError) {
        console.error('Registration update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update registration' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          status: 'approved',
          message: 'Registration approved. User can now login.',
          user_id: authUser.user.id,
        },
        { status: 200 }
      );
    } else if (action === 'reject') {
      const { rejection_reason } = body;

      // Update registration status to 'rejected'
      const { error: updateError } = await supabase
        .from('teacher_registrations')
        .update({
          status: 'rejected',
          rejection_reason: rejection_reason || 'Rejected by administrator',
        })
        .eq('id', registration_id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update registration' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          status: 'rejected',
          message: 'Registration rejected',
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Registration action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
