import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import type { Issue } from '@/types';

export type UnresolvedDocIssue = Pick<
  Issue,
  'id' | 'title' | 'category' | 'priority' | 'status' | 'created_at'
> & {
  user?: {
    campus?: string;
    department?: string;
    full_name?: string;
  } | null;
  is_anonymous?: boolean;
};

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

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

function thinBorder() {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  };
}

function headerCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: thinBorder(),
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18 })],
      }),
    ],
  });
}

function bodyCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: thinBorder(),
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 18 })],
      }),
    ],
  });
}

function issuesTable(issues: UnresolvedDocIssue[]) {
  const widths = [600, 2200, 1400, 1200, 1200, 1100, 1100];
  return new Table({
    width: { size: 8800, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          headerCell('#', widths[0]),
          headerCell('Title', widths[1]),
          headerCell('Category', widths[2]),
          headerCell('Campus', widths[3]),
          headerCell('Priority', widths[4]),
          headerCell('Status', widths[5]),
          headerCell('Submitted', widths[6]),
        ],
      }),
      ...issues.map((issue, idx) => {
        const campus = issue.is_anonymous ? '—' : (issue.user?.campus ?? '—');
        return new TableRow({
          children: [
            bodyCell(String(idx + 1), widths[0]),
            bodyCell(issue.title, widths[1]),
            bodyCell(issue.category, widths[2]),
            bodyCell(campus, widths[3]),
            bodyCell(issue.priority, widths[4]),
            bodyCell(issue.status, widths[5]),
            bodyCell(formatShortDate(issue.created_at), widths[6]),
          ],
        });
      }),
    ],
  });
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
            children: [new TextRun({ text: 'Teacher Welfare Panel / TSA', bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: 'Brief for the Worthy Vice Chancellor', italics: true })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: `Date: ${date}` })],
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
                  `Respectfully submitted for kind consideration: a summary of ${issues.length} unresolved faculty welfare issue(s) currently pending with the Teacher Welfare / TSA mechanism as of ${date}. These matters remain open (not Resolved or Closed) and are listed below for administrative review and guidance.`,
              }),
            ],
          }),
          ...(issues.length === 0
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'There are presently no unresolved issues on record.',
                      italics: true,
                    }),
                  ],
                }),
              ]
            : [issuesTable(issues)]),
          new Paragraph({
            spacing: { before: 300, after: 200 },
            children: [
              new TextRun({
                text:
                  'It is requested that the above issues may kindly be considered for appropriate directions / resolution through the concerned offices. The Teacher Welfare Committee remains available for any further clarification or briefing.',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 300 },
            children: [new TextRun({ text: 'With regards,' })],
          }),
          new Paragraph({
            spacing: { before: 200 },
            children: [new TextRun({ text: '____________________________' })],
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Administrator / TSA', bold: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Teacher Welfare Panel', italics: true })],
          }),
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
  const byCategory = new Map<string, UnresolvedDocIssue[]>();
  for (const issue of issues) {
    const key = issue.category || 'Other';
    const list = byCategory.get(key) ?? [];
    list.push(issue);
    byCategory.set(key, list);
  }

  const agendaBlocks: Paragraph[] = [];
  let itemNo = 1;
  for (const [category, items] of byCategory) {
    agendaBlocks.push(
      new Paragraph({
        spacing: { before: 240, after: 80 },
        children: [new TextRun({ text: `${itemNo}. ${category}`, bold: true, size: 24 })],
      })
    );
    items.forEach((issue, idx) => {
      const campus = issue.is_anonymous ? '—' : (issue.user?.campus ?? '—');
      const dept = issue.is_anonymous ? '—' : (issue.user?.department ?? '—');
      agendaBlocks.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `   ${itemNo}.${idx + 1}  ${issue.title}`,
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `        Campus: ${campus} | Department: ${dept} | Priority: ${issue.priority} | Status: ${issue.status} | Submitted: ${formatShortDate(issue.created_at)}`,
              size: 18,
              color: '555555',
            }),
          ],
        })
      );
    });
    itemNo += 1;
  }

  if (issues.length === 0) {
    agendaBlocks.push(
      new Paragraph({
        children: [new TextRun({ text: 'No unresolved issues to discuss.', italics: true })],
      })
    );
  }

  agendaBlocks.push(
    new Paragraph({
      spacing: { before: 300 },
      children: [new TextRun({ text: `${itemNo}. Any other business`, bold: true, size: 24 })],
    })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Agenda — Faculty Welfare Issues Meeting', bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new TextRun({ text: 'Teacher Welfare Panel / TSA' })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Generated: ${date}. Based on unresolved issues as of this date (${issues.length} item${issues.length === 1 ? '' : 's'}).`,
              }),
            ],
          }),
          ...agendaBlocks,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `Meeting-Agenda-Unresolved-Issues-${stamp}.docx`);
}
