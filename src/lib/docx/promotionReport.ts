import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { PromotionServiceRow, PromotionVacancyAggregate } from '@/types';

export type PromotionReportFilters = {
  dateFrom: string;
  dateTo: string;
  campus: string;
  department: string;
  rank: string;
};

type DeptBlock = {
  campus: string;
  department: string;
  vacancies: PromotionVacancyAggregate[];
  eligible: PromotionServiceRow[];
};

const PAGE_WIDTH = 9360;
const HEADER_FILL = '1E3A5F';
const ALT_FILL = 'F1F5F9';

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: 'CBD5E1',
};

const tableBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
  insideHorizontal: thinBorder,
  insideVertical: thinBorder,
};

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

function vacantLabel(value: number, usedMedian: boolean) {
  return usedMedian ? `${value} (median)` : String(value);
}

function cell(
  text: string,
  options?: {
    bold?: boolean;
    header?: boolean;
    width?: number;
    fill?: string;
    center?: boolean;
  }
) {
  const isHeader = Boolean(options?.header);
  return new TableCell({
    width: { size: options?.width ?? 2340, type: WidthType.DXA },
    shading:
      isHeader || options?.fill
        ? { type: ShadingType.CLEAR, fill: isHeader ? HEADER_FILL : options?.fill }
        : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: options?.center || isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: isHeader || options?.bold,
            color: isHeader ? 'FFFFFF' : '1E293B',
            size: isHeader ? 18 : 20,
          }),
        ],
      }),
    ],
  });
}

function vacancyTable(rows: PromotionVacancyAggregate[]) {
  const w = [3120, 3120, 3120];
  return new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: w,
    borders: tableBorders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell('Rank', { header: true, width: w[0] }),
          cell('Existing vacant', { header: true, width: w[1], center: true }),
          cell('New required', { header: true, width: w[2], center: true }),
        ],
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: [
              cell(r.rank, { width: w[0], bold: true }),
              cell(vacantLabel(r.existing_vacant, r.existing_used_median), {
                width: w[1],
                center: true,
              }),
              cell(vacantLabel(r.new_required, r.new_used_median), {
                width: w[2],
                center: true,
              }),
            ],
          })
      ),
    ],
  });
}

function eligibleTable(rows: PromotionServiceRow[]) {
  const w = [2808, 1872, 2340, 2340];
  return new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: w,
    borders: tableBorders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell('Name', { header: true, width: w[0] }),
          cell('Present cadre', { header: true, width: w[1] }),
          cell('Total service', { header: true, width: w[2] }),
          cell('Cadre service', { header: true, width: w[3] }),
        ],
      }),
      ...rows.map(
        (r, idx) =>
          new TableRow({
            children: [
              cell(r.full_name || '—', { width: w[0], fill: idx % 2 ? ALT_FILL : undefined, bold: true }),
              cell(r.designation || '—', { width: w[1], fill: idx % 2 ? ALT_FILL : undefined }),
              cell(r.service_label, { width: w[2], fill: idx % 2 ? ALT_FILL : undefined }),
              cell(r.cadre_label, { width: w[3], fill: idx % 2 ? ALT_FILL : undefined }),
            ],
          })
      ),
    ],
  });
}

function groupByCampusDepartment(
  vacancyRows: PromotionVacancyAggregate[],
  serviceRows: PromotionServiceRow[]
): DeptBlock[] {
  const map = new Map<string, DeptBlock>();

  function block(campus: string, department: string): DeptBlock {
    const key = `${campus}||${department}`;
    const existing = map.get(key);
    if (existing) return existing;
    const next: DeptBlock = { campus, department, vacancies: [], eligible: [] };
    map.set(key, next);
    return next;
  }

  for (const row of vacancyRows) {
    block(row.campus, row.department).vacancies.push(row);
  }
  for (const row of serviceRows) {
    block(row.campus, row.department).eligible.push(row);
  }

  return [...map.values()].sort(
    (a, b) => a.campus.localeCompare(b.campus) || a.department.localeCompare(b.department)
  );
}

function filterLine(label: string, value: string) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20 }),
      new TextRun({ text: value, size: 20 }),
    ],
  });
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({
    heading: level,
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, bold: true })],
  });
}

function bodyText(text: string, options?: { italics?: boolean; after?: number }) {
  return new Paragraph({
    spacing: { after: options?.after ?? 120 },
    children: [
      new TextRun({
        text,
        size: 20,
        italics: options?.italics,
        color: options?.italics ? '64748B' : '1E293B',
      }),
    ],
  });
}

export async function downloadPromotionReportDoc(options: {
  vacancyRows: PromotionVacancyAggregate[];
  serviceRows: PromotionServiceRow[];
  minServiceYears: number;
  filters: PromotionReportFilters;
}) {
  const { vacancyRows, serviceRows, minServiceYears, filters } = options;
  const date = todayLabel();
  const blocks = groupByCampusDepartment(vacancyRows, serviceRows);

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Faculty Promotion Vacancies and Eligible Teachers', bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Teaching Staff Association (TSA), UET Lahore', bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `Generated: ${date}`, italics: true })],
    }),
    filterLine('Minimum total service', `${minServiceYears} year${minServiceYears === 1 ? '' : 's'}`),
    filterLine('Campus', filters.campus || 'All'),
    filterLine('Department', filters.department || 'All'),
    filterLine('Cadre / rank', filters.rank || 'All'),
    filterLine('Date from', filters.dateFrom || 'any'),
    filterLine('Date to', filters.dateTo || 'any'),
    bodyText(
      `Vacant seats are the majority (mode) of faculty reports per campus, department, and rank; median is used on ties. Eligible teachers are those whose total service from date of joining is at least ${minServiceYears} year${minServiceYears === 1 ? '' : 's'} (latest submission in the selected range).`,
      { italics: true, after: 200 }
    ),
  ];

  const sections: (Paragraph | Table)[] = [...children];

  if (blocks.length === 0) {
    sections.push(
      bodyText('No vacancy or eligible-faculty data for the current filters.', { italics: true })
    );
  }

  let lastCampus = '';
  for (const block of blocks) {
    if (block.campus !== lastCampus) {
      sections.push(heading(block.campus, HeadingLevel.HEADING_2));
      lastCampus = block.campus;
    }
    sections.push(heading(block.department, HeadingLevel.HEADING_3));

    sections.push(
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: 'Vacant seats', bold: true, size: 22 })],
      })
    );
    if (block.vacancies.length === 0) {
      sections.push(
        bodyText('No vacancy figures reported for this department.', { italics: true })
      );
    } else {
      sections.push(vacancyTable(block.vacancies));
      sections.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    }

    sections.push(
      bodyText(
        `Eligible for these posts: ${block.eligible.length} teacher${block.eligible.length === 1 ? '' : 's'} with total service of at least ${minServiceYears} year${minServiceYears === 1 ? '' : 's'}.`
      )
    );

    if (block.eligible.length === 0) {
      sections.push(
        bodyText(
          `No faculty in this department meet the minimum total service of ${minServiceYears} years.`,
          { italics: true }
        )
      );
    } else {
      sections.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: 'Eligible teachers', bold: true, size: 22 })],
        })
      );
      sections.push(eligibleTable(block.eligible));
      sections.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
    }
  }

  const doc = new Document({
    sections: [
      {
        children: sections,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `Promotion-Vacancies-Eligible-${stamp}.docx`);
}
