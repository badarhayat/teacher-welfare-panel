import type {
  PromotionRank,
  PromotionSubmission,
  PromotionVacancies,
  PromotionVacancyAggregate,
  PromotionVacancyEntry,
  PromotionServiceRow,
} from '@/types';
import { DESIGNATIONS } from '@/lib/utils';

export const PROMOTION_RANKS = DESIGNATIONS as unknown as PromotionRank[];

export function emptyVacancies(): PromotionVacancies {
  return {
    Lecturer: { existing_vacant: 0, new_required: 0, new_required_reason: '' },
    'Assistant Professor': { existing_vacant: 0, new_required: 0, new_required_reason: '' },
    'Associate Professor': { existing_vacant: 0, new_required: 0, new_required_reason: '' },
    Professor: { existing_vacant: 0, new_required: 0, new_required_reason: '' },
  };
}

/** Whole years between a date (YYYY-MM-DD) and today (or asOf). */
export function yearsSince(dateStr: string, asOf: Date = new Date()): number {
  if (!dateStr) return 0;
  const start = new Date(dateStr);
  if (Number.isNaN(start.getTime())) return 0;
  let years = asOf.getFullYear() - start.getFullYear();
  const m = asOf.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < start.getDate())) years -= 1;
  return Math.max(0, years);
}

function modeOrMedian(values: number[]): { value: number; usedMedian: boolean } {
  if (values.length === 0) return { value: 0, usedMedian: false };

  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);

  let maxCount = 0;
  for (const c of counts.values()) maxCount = Math.max(maxCount, c);

  const modes = [...counts.entries()]
    .filter(([, c]) => c === maxCount)
    .map(([v]) => v)
    .sort((a, b) => a - b);

  if (modes.length === 1) {
    return { value: modes[0], usedMedian: false };
  }

  // Tie between modes → median of all submissions
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  return { value: median, usedMedian: true };
}

function readEntry(
  vacancies: PromotionVacancies | Record<string, PromotionVacancyEntry> | null | undefined,
  rank: PromotionRank
): PromotionVacancyEntry {
  const entry = vacancies?.[rank];
  return {
    existing_vacant: Math.max(0, Number(entry?.existing_vacant) || 0),
    new_required: Math.max(0, Number(entry?.new_required) || 0),
    new_required_reason: entry?.new_required_reason ?? '',
  };
}

/**
 * Majority (mode) of existing_vacant and new_required per campus + department + rank.
 * On mode tie, uses median of all values for that field.
 */
export function aggregateVacanciesByMajority(
  submissions: PromotionSubmission[],
  rankFilter: PromotionRank | 'All' = 'All'
): PromotionVacancyAggregate[] {
  const ranks = rankFilter === 'All' ? PROMOTION_RANKS : [rankFilter];
  const groups = new Map<string, { campus: string; department: string; rank: PromotionRank; existing: number[]; neu: number[] }>();

  for (const sub of submissions) {
    for (const rank of ranks) {
      const key = `${sub.campus}||${sub.department}||${rank}`;
      const entry = readEntry(sub.vacancies, rank);
      const g = groups.get(key) ?? {
        campus: sub.campus,
        department: sub.department,
        rank,
        existing: [],
        neu: [],
      };
      g.existing.push(entry.existing_vacant);
      g.neu.push(entry.new_required);
      groups.set(key, g);
    }
  }

  return [...groups.values()]
    .map((g) => {
      const existing = modeOrMedian(g.existing);
      const neu = modeOrMedian(g.neu);
      return {
        campus: g.campus,
        department: g.department,
        rank: g.rank,
        existing_vacant: existing.value,
        new_required: neu.value,
        submission_count: g.existing.length,
        existing_used_median: existing.usedMedian,
        new_used_median: neu.usedMedian,
      };
    })
    .sort((a, b) =>
      a.campus.localeCompare(b.campus) ||
      a.department.localeCompare(b.department) ||
      PROMOTION_RANKS.indexOf(a.rank) - PROMOTION_RANKS.indexOf(b.rank)
    );
}

/** Latest submission per user (by created_at) for service year reporting. */
export function latestServiceRows(
  submissions: PromotionSubmission[],
  minServiceYears = 0
): PromotionServiceRow[] {
  const latest = new Map<string, PromotionSubmission>();
  for (const sub of submissions) {
    const prev = latest.get(sub.user_id);
    if (!prev || new Date(sub.created_at) > new Date(prev.created_at)) {
      latest.set(sub.user_id, sub);
    }
  }

  return [...latest.values()]
    .map((sub) => {
      const service_years = yearsSince(sub.date_of_joining);
      const cadre_years = yearsSince(sub.cadre_start_date);
      return {
        user_id: sub.user_id,
        full_name: sub.full_name,
        email: sub.email,
        campus: sub.campus,
        department: sub.department,
        designation: sub.designation,
        date_of_joining: sub.date_of_joining,
        cadre_start_date: sub.cadre_start_date,
        service_years,
        cadre_years,
        submitted_at: sub.created_at,
      };
    })
    .filter((r) => r.service_years >= minServiceYears)
    .sort(
      (a, b) =>
        a.campus.localeCompare(b.campus) ||
        a.department.localeCompare(b.department) ||
        b.service_years - a.service_years ||
        a.full_name.localeCompare(b.full_name)
    );
}

export function countFacultyByDepartment(
  rows: PromotionServiceRow[]
): { campus: string; department: string; count: number }[] {
  const map = new Map<string, { campus: string; department: string; count: number }>();
  for (const r of rows) {
    const key = `${r.campus}||${r.department}`;
    const cur = map.get(key) ?? { campus: r.campus, department: r.department, count: 0 };
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort(
    (a, b) => a.campus.localeCompare(b.campus) || a.department.localeCompare(b.department)
  );
}
