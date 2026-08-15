import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('issues')
    .select('*, replies(*, admin:admin_id(full_name, designation))')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(data);
}

// PATCH: Edit an issue (creator or admin only)
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { title, description, category, priority } = body;

    // Fetch current issue
    const { data: issue, error: fetchError } = await supabase
      .from('issues')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // Check permissions: creator or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isCreator = issue.user_id === user.id;
    const isAdmin = profile?.role === 'admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'You cannot edit this issue' },
        { status: 403 }
      );
    }

    // Prepare update object with only allowed fields
    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (priority !== undefined) updateData.priority = priority;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update issue
    const { data: updatedIssue, error: updateError } = await supabase
      .from('issues')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json(updatedIssue, { status: 200 });
  } catch (error) {
    console.error('Update issue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Soft delete an issue (creator or admin only)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Fetch current issue
    const { data: issue, error: fetchError } = await supabase
      .from('issues')
      .select('user_id, deleted_at')
      .eq('id', id)
      .single();

    if (fetchError || !issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // Check if already deleted
    if (issue.deleted_at) {
      return NextResponse.json(
        { error: 'Issue is already deleted' },
        { status: 410 }
      );
    }

    // Check permissions: creator or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isCreator = issue.user_id === user.id;
    const isAdmin = profile?.role === 'admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'You cannot delete this issue' },
        { status: 403 }
      );
    }

    // Soft delete: remove from board and record who deleted
    const { error: deleteError } = await supabase
      .from('issues')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        deleted_by_role: isAdmin ? 'admin' : 'teacher',
        published_to_board: false,
        deletion_noticed_at: isAdmin ? null : new Date().toISOString(),
      })
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json(
      { status: 'deleted', message: 'Issue deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete issue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
