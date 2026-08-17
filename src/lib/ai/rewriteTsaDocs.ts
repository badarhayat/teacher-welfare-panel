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
const BATCH_SIZE = 6;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          title: { type: 'STRING' },
          paragraphs: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
        required: ['id', 'title', 'paragraphs'],
      },
    },
  },
  required: ['items'],
};

type GeminiItem = { id?: string; title?: string; paragraphs?: string[] };

function fallbackItem(issue: RewriteInputIssue): RewrittenAgendaItem {
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
}

function sliceJsonObject(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1].trim() : trimmed;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Gemini response did not contain JSON');
  }
  return raw.slice(start, end + 1);
}

/** Escape raw control characters that appear inside JSON string values. */
function escapeControlsInStrings(json: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of json) {
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }
    if (ch === '\n') {
      out += '\\n';
      continue;
    }
    if (ch === '\r') {
      out += '\\r';
      continue;
    }
    if (ch === '\t') {
      out += '\\t';
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code < 32) {
      out += ' ';
      continue;
    }
    out += ch;
  }
  return out;
}

function repairJson(raw: string): string {
  return escapeControlsInStrings(
    raw
      .replace(/^\uFEFF/, '')
      .replace(/[\u201C\u201D]/g, "'")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/,\s*([}\]])/g, '$1')
  );
}

function extractJsonObject(text: string): unknown {
  const sliced = sliceJsonObject(text);
  try {
    return JSON.parse(sliced);
  } catch (first) {
    try {
      return JSON.parse(repairJson(sliced));
    } catch {
      const message = first instanceof Error ? first.message : '';
      const posMatch = message.match(/position (\d+)/i);
      const pos = posMatch ? Number(posMatch[1]) : 0;
      console.error(
        'Gemini JSON parse failed. Snippet:',
        sliced.slice(Math.max(0, pos - 80), pos + 80),
        first
      );
      throw first instanceof Error ? first : new Error('Gemini response was not valid JSON');
    }
  }
}

function itemsFromParsed(parsed: unknown): GeminiItem[] {
  if (!parsed || typeof parsed !== 'object') return [];
  const items = (parsed as { items?: GeminiItem[] }).items;
  return Array.isArray(items) ? items : [];
}

async function callGemini(prompt: string, model: string, useSchema: boolean): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const generationConfig: Record<string, unknown> = {
    responseMimeType: 'application/json',
    maxOutputTokens: 8192,
  };
  if (useSchema) {
    generationConfig.responseSchema = RESPONSE_SCHEMA;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini request failed (${res.status})`);
  }

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text.trim()) {
    throw new Error(
      candidate?.finishReason
        ? `Gemini returned an empty response (${candidate.finishReason})`
        : 'Gemini returned an empty response'
    );
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

  const lengthRules =
    docType === 'agenda'
      ? `- Each item needs: a short formal title (agenda heading) and ONE dense paragraph (two only if the source is long).
- Preserve EVERY fact and figure from title/description: amounts, dates, percentages, seat counts, BPS/scales, departments, campuses, conditions, and pending actions. Do not invent, round, or drop numbers.
- Be brief. Do not restate the title in the paragraph. Do not add rhetoric or filler such as "it is respectfully submitted", "kind consideration", or "early resolution" unless that is the only substance given.
- Institutional TSA voice still; the VC must understand the matter from this paragraph alone.`
      : `- Each item needs: a short formal title (agenda heading) and 2–4 formal paragraphs the VC can understand without other context.`;

  return `You are drafting official correspondence for the General Secretary, Teaching Staff Association (TSA), University of Engineering and Technology (UET) Lahore, Pakistan.

Document type: ${docType === 'agenda' ? 'Meeting agenda items for the Worthy Vice Chancellor' : 'Formal brief / covering note items for the Worthy Vice Chancellor'}

Rewrite EVERY issue into institutional language as if written by the General Secretary on behalf of TSA — NOT as quotes or submissions from individual teachers.

Hard rules:
- Do NOT include any personal names, emails, employee IDs, phone numbers, CNIC, or wording like "a faculty member named…", "the complainant", "the applicant submitted".
- Do NOT invent facts. Use only the substance in title/description. If details are thin, write a clear formal request for consideration based on what is given.
- Remove first-person teacher voice ("I request", "my salary"). Convert to institutional voice ("It is submitted that…", "TSA requests…", "Faculty have raised concern regarding…").
${lengthRules}
- Keep category/priority only as context for tone (urgency); do not invent campus/department.
- In JSON string values, never use unescaped double quotes. Prefer wording without inner quotes, or use apostrophes.
- Return valid JSON only: no markdown, no comments, no trailing commas.

Return ONLY valid JSON with this shape:
{
  "items": [
    {
      "id": "<same id as input>",
      "title": "<formal agenda title>",
      "paragraphs": ${docType === 'agenda' ? '["one dense paragraph with all facts and figures"]' : '["paragraph 1", "paragraph 2"]'}
    }
  ]
}

Include exactly one output object per input issue, same ids, same order.

Input issues JSON:
${JSON.stringify(payload, null, 2)}`;
}

async function rewriteBatch(
  issues: RewriteInputIssue[],
  docType: 'agenda' | 'vc'
): Promise<RewrittenAgendaItem[]> {
  const prompt = buildPrompt(docType, issues);
  const models = [DEFAULT_MODEL, 'gemini-3.5-flash', 'gemini-flash-latest'];
  let lastError: Error | null = null;
  let text = '';

  for (const model of [...new Set(models)]) {
    for (const useSchema of [true, false]) {
      try {
        text = await callGemini(prompt, model, useSchema);
        lastError = null;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
    if (!lastError && text) break;
  }

  if (lastError || !text) {
    throw lastError || new Error('Gemini rewrite failed');
  }

  const parsed = extractJsonObject(text);
  const byId = new Map(
    itemsFromParsed(parsed)
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
    return fallbackItem(issue);
  });
}

export async function rewriteIssuesWithGemini(
  issues: RewriteInputIssue[],
  docType: 'agenda' | 'vc'
): Promise<RewrittenAgendaItem[]> {
  if (issues.length === 0) return [];

  const out: RewrittenAgendaItem[] = [];
  for (let i = 0; i < issues.length; i += BATCH_SIZE) {
    const batch = issues.slice(i, i + BATCH_SIZE);
    try {
      out.push(...(await rewriteBatch(batch, docType)));
    } catch (err) {
      console.error(`Gemini rewrite batch ${i / BATCH_SIZE + 1} failed:`, err);
      out.push(...batch.map(fallbackItem));
    }
  }
  return out;
}
