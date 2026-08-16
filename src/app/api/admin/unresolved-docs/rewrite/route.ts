import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rewriteIssuesWithGemini } from '@/lib/ai/rewriteTsaDocs';

/**
 * POST — rewrite unresolved issues as formal TSA / General Secretary text (Gemini).
 * Body: { docType: 'agenda' | 'vc', issues: [{ id, title, description, category, priority }] }
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

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY is not set on the server. Add it in Vercel Environment Variables and redeploy.',
        },
        { status: 500 }
      );
    }

    let body: {
      docType?: 'agenda' | 'vc';
      issues?: Array<{
        id?: string;
        title?: string;
        description?: string;
        category?: string;
        priority?: string;
      }>;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const docType = body.docType === 'vc' ? 'vc' : 'agenda';
    const issues = (body.issues ?? [])
      .filter((i) => i?.id && i?.title)
      .map((i) => ({
        id: String(i.id),
        title: String(i.title || ''),
        description: String(i.description || ''),
        category: String(i.category || 'Other'),
        priority: String(i.priority || 'Medium'),
      }));

    if (issues.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const items = await rewriteIssuesWithGemini(issues, docType);
    return NextResponse.json({ items, usedAi: true });
  } catch (err) {
    console.error('Gemini rewrite error:', err);
    const message = err instanceof Error ? err.message : 'Failed to rewrite with Gemini';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
