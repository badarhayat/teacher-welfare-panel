import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function isRlsError(code?: string, message?: string) {
  if (code === '42501') return true;
  return Boolean(message && /row-level security|permission denied|forbidden/i.test(message));
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');

  let query = supabase
    .from('issues')
    .select('*, replies(*)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('Issues API insert blocked: no authenticated user session.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, category, priority, is_anonymous } = body;

  if (!title || !description || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const payload = {
    user_id: user.id,
    is_anonymous: Boolean(is_anonymous),
    title,
    description,
    category,
    priority: priority ?? 'Medium',
    status: 'Submitted',
  };

  const { data, error } = await supabase.from('issues').insert(payload).select().single();

  if (error) {
    console.error('Issues API insert failed', {
      userId: user.id,
      payload: {
        user_id: payload.user_id,
        is_anonymous: payload.is_anonymous,
        titleLength: payload.title.length,
        category: payload.category,
        priority: payload.priority,
        status: payload.status,
      },
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    });

    const status = isRlsError(error.code, error.message) ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data, { status: 201 });
}
