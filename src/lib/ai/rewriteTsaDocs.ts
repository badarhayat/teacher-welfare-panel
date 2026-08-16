/**
 * Rewrite unresolved issues as formal TSA / General Secretary agenda text via Gemini.
 * Server-only — requires GEMINI_API_KEY.
 */

export type RewriteInputIssue = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
};

export type RewrittenAgendaItem = {
  id: string;
  title: string;
  paragraphs: string[];
};

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1].trim() : trimmed;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Gemini response did not contain JSON');
  }
  return JSON.parse(raw.slice(start, end + 1));
}

async function callGemini(prompt: string, model: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini request failed (${res.status})`);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text.trim()) {
    throw new Error('Gemini returned an empty response');
  }
  return text;
}

function buildPrompt(docType: 'agenda' | 'vc', issues: RewriteInputIssue[]): string {
  const payload = issues.map((i) => ({
    id: i.id,
    category: i.category,
    priority: i.priority,
    title: i.title,
    description: i.description,
  }));

  return `You are drafting official correspondence for the General Secretary, Teaching Staff Association (TSA), University of Engineering and Technology (UET) Lahore, Pakistan.

Document type: ${docType === 'agenda' ? 'Meeting agenda items for the Worthy Vice Chancellor' : 'Formal brief / covering note items for the Worthy Vice Chancellor'}

Rewrite EVERY issue into institutional language as if written by the General Secretary on behalf of TSA — NOT as quotes or submissions from individual teachers.

Hard rules:
- Do NOT include any personal names, emails, employee IDs, phone numbers, CNIC, or wording like "a faculty member named…", "the complainant", "the applicant submitted".
- Do NOT invent facts. Use only the substance in title/description. If details are thin, write a clear formal request for consideration based on what is given.
- Remove first-person teacher voice ("I request", "my salary"). Convert to institutional voice ("It is submitted that…", "TSA requests…", "Faculty have raised concern regarding…").
- Each item needs: a short formal title (agenda heading) and 2–4 formal paragraphs the VC can understand without other context.
- Keep category/priority only as context for tone (urgency); do not invent campus/department.

Return ONLY valid JSON with this shape:
{
  "items": [
    {
      "id": "<same id as input>",
      "title": "<formal agenda title>",
      "paragraphs": ["paragraph 1", "paragraph 2"]
    }
  ]
}

Include exactly one output object per input issue, same ids, same order.

Input issues JSON:
${JSON.stringify(payload, null, 2)}`;
}

export async function rewriteIssuesWithGemini(
  issues: RewriteInputIssue[],
  docType: 'agenda' | 'vc'
): Promise<RewrittenAgendaItem[]> {
  if (issues.length === 0) return [];

  const prompt = buildPrompt(docType, issues);
  const models = [DEFAULT_MODEL, 'gemini-3.5-flash', 'gemini-flash-latest'];
  let lastError: Error | null = null;
  let text = '';

  for (const model of [...new Set(models)]) {
    try {
      text = await callGemini(prompt, model);
      lastError = null;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (lastError || !text) {
    throw lastError || new Error('Gemini rewrite failed');
  }

  const parsed = extractJsonObject(text) as {
    items?: Array<{ id?: string; title?: string; paragraphs?: string[] }>;
  };

  const byId = new Map(
    (parsed.items ?? [])
      .filter((i) => i && i.id)
      .map((i) => [
        i.id as string,
        {
          id: i.id as string,
          title: (i.title || '').trim(),
          paragraphs: (i.paragraphs || []).map((p) => String(p).trim()).filter(Boolean),
        } satisfies RewrittenAgendaItem,
      ])
  );

  return issues.map((issue) => {
    const rewritten = byId.get(issue.id);
    if (rewritten && rewritten.paragraphs.length > 0) {
      return {
        id: issue.id,
        title: rewritten.title || issue.title,
        paragraphs: rewritten.paragraphs,
      };
    }
    // Per-item fallback if model skipped one
    return {
      id: issue.id,
      title: issue.title,
      paragraphs: [
        `Matter for consideration: ${issue.title}.`,
        issue.description
          ? `Particulars: ${issue.description}`
          : 'The Teaching Staff Association requests kind attention and appropriate directions for early resolution of this faculty welfare concern.',
      ],
    };
  });
}
