import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import type { Issue } from '@/types';

export type UnresolvedDocIssue = Pick<
  Issue,
  'id' | 'title' | 'description' | 'category' | 'priority' | 'status' | 'created_at'
>;

const TSA_FROM = 'General Secretary, Teaching Staff Association (TSA), UET Lahore';

function todayLabel() {
  return new Date().toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function cleanText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/** Formal paragraphs for VC / agenda: title + description, no submitter fields. */
export function formatAgendaItemParagraphs(issue: UnresolvedDocIssue): string[] {
  const title = cleanText(issue.title);
  const description = cleanText(issue.description);

  const opening = title
    ? `Matter for consideration: ${title}${/[.!?]$/.test(title) ? '' : '.'}`
    : 'Matter for consideration regarding faculty welfare.';

  if (!description) {
    return [
      `${opening} The Teaching Staff Association requests kind attention and appropriate directions for early resolution of this faculty welfare concern.`,
    ];
  }

  // Avoid repeating the title if description starts the same way
  const detail = description.toLowerCase().startsWith(title.toLowerCase())
    ? description
    : description;

  return [
    opening,
    `Particulars: ${detail}${/[.!?]$/.test(detail) ? '' : '.'}`,
  ];
}

function signOffParagraphs(): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 300 },
      children: [new TextRun({ text: 'With regards,' })],
    }),
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: '____________________________' })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'General Secretary', bold: true })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Teaching Staff Association (TSA)', bold: true })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'UET Lahore', italics: true })],
    }),
  ];
}

function buildItemBlocks(
  issues: UnresolvedDocIssue[],
  options: { groupByCategory: boolean }
): Paragraph[] {
  const blocks: Paragraph[] = [];

  if (issues.length === 0) {
    blocks.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'There are presently no unresolved faculty welfare matters on the agenda.',
            italics: true,
          }),
        ],
      })
    );
    return blocks;
  }

  if (!options.groupByCategory) {
    issues.forEach((issue, idx) => {
      blocks.push(
        new Paragraph({
          spacing: { before: 200, after: 60 },
          children: [
            new TextRun({
              text: `${idx + 1}. ${cleanText(issue.title) || 'Faculty welfare matter'}`,
              bold: true,
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: `Category: ${issue.category || 'Other'}  |  Priority: ${issue.priority}`,
              size: 18,
              color: '444444',
            }),
          ],
        }),
        ...formatAgendaItemParagraphs(issue).map(
          (text) =>
            new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text, size: 20 })],
            })
        )
      );
    });
    return blocks;
  }

  const byCategory = new Map<string, UnresolvedDocIssue[]>();
  for (const issue of issues) {
    const key = issue.category || 'Other';
    const list = byCategory.get(key) ?? [];
    list.push(issue);
    byCategory.set(key, list);
  }

  let sectionNo = 1;
  for (const [category, items] of byCategory) {
    blocks.push(
      new Paragraph({
        spacing: { before: 280, after: 100 },
        children: [new TextRun({ text: `${sectionNo}. ${category}`, bold: true, size: 24 })],
      })
    );
    items.forEach((issue, idx) => {
      blocks.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({
              text: `${sectionNo}.${idx + 1}  ${cleanText(issue.title) || 'Faculty welfare matter'}`,
              bold: true,
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: `Priority: ${issue.priority}`,
              size: 18,
              color: '444444',
            }),
          ],
        }),
        ...formatAgendaItemParagraphs(issue).map(
          (text) =>
            new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text, size: 20 })],
            })
        )
      );
    });
    sectionNo += 1;
  }

  blocks.push(
    new Paragraph({
      spacing: { before: 300 },
      children: [new TextRun({ text: `${sectionNo}. Any other business`, bold: true, size: 24 })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: 'Any additional faculty welfare matters that may arise with the permission of the chair.',
          size: 20,
        }),
      ],
    })
  );

  return blocks;
}

export async function downloadVcEmailDoc(issues: UnresolvedDocIssue[]) {
  const date = todayLabel();
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Teaching Staff Association (TSA)', bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'UET Lahore', bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'Brief for the Worthy Vice Chancellor',
                italics: true,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: `Date: ${date}` })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: `From: ${TSA_FROM}` })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: 'The Worthy Vice Chancellor,' })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text:
                  `Respectfully submitted for kind consideration by the General Secretary, Teaching Staff Association (TSA), UET Lahore: a summary of ${issues.length} unresolved faculty welfare matter(s) as of ${date}. Individual faculty identities are not disclosed. The substance of each matter is set out below so that appropriate directions may be issued on the basis of this brief alone.`,
              }),
            ],
          }),
          ...buildItemBlocks(issues, { groupByCategory: false }),
          new Paragraph({
            spacing: { before: 300, after: 200 },
            children: [
              new TextRun({
                text:
                  'It is requested that the above matters may kindly be considered for appropriate directions / resolution through the concerned offices. The Teaching Staff Association remains available for any further clarification or briefing.',
              }),
            ],
          }),
          ...signOffParagraphs(),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `VC-Email-Unresolved-Issues-${stamp}.docx`);
}

export async function downloadMeetingAgendaDoc(issues: UnresolvedDocIssue[]) {
  const date = todayLabel();
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Agenda — Faculty Welfare Issues Meeting', bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Teaching Staff Association (TSA), UET Lahore', bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'Prepared for the Worthy Vice Chancellor',
                italics: true,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: `Meeting / document date: ${date}` })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Prepared by: ${TSA_FROM}. The following ${issues.length} unresolved faculty welfare matter(s) are placed on the agenda. Submitter names and personal particulars are not included; each item is described so that the matter may be understood on reading alone.`,
              }),
            ],
          }),
          ...buildItemBlocks(issues, { groupByCategory: true }),
          ...signOffParagraphs(),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `Meeting-Agenda-Unresolved-Issues-${stamp}.docx`);
}
