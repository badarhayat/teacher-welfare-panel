import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const body = await request.json();
    const { full_name, email, password, campus, department, designation } = body;

    // Validate required fields
    if (!full_name || !email || !password || !campus || !department || !designation) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email domain
    if (!email.endsWith('@uet.edu.pk')) {
      return NextResponse.json(
        { error: 'An Engineering University email address is required' },
        { status: 400 }
      );
    }

    // Hash password using bcrypt (simple approach - in production use proper bcrypt)
    // For now, we'll store plain password hash via Supabase auth
    
    // Check if registration already exists
    const { data: existing } = await supabase
      .from('teacher_registrations')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Registration with this email already exists' },
        { status: 409 }
      );
    }

    // Insert into teacher_registrations table with status='pending'
    // Password will be hashed by the admin approval workflow
    const { data, error } = await supabase
      .from('teacher_registrations')
      .insert([
        {
          email,
          full_name,
          campus,
          department,
          designation,
          status: 'pending',
          password_hash: password, // Temporary storage - will be hashed on approval
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Registration insert error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to submit registration' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        status: 'pending',
        message: 'Registration submitted successfully. Awaiting admin approval.',
        registration_id: data.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
