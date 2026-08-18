import { IssueStatus, IssuePriority, IssueCategory } from '@/types';

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusColor(status: IssueStatus): string {
  const map: Record<IssueStatus, string> = {
    Submitted: 'bg-blue-100 text-blue-800',
    'Under Review': 'bg-yellow-100 text-yellow-800',
    'In Progress': 'bg-orange-100 text-orange-800',
    'Communicated to Authorities': 'bg-purple-100 text-purple-800',
    Resolved: 'bg-green-100 text-green-800',
    Closed: 'bg-gray-100 text-gray-600',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

export function getPriorityColor(priority: IssuePriority): string {
  const map: Record<IssuePriority, string> = {
    Low: 'bg-slate-100 text-slate-700',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-orange-100 text-orange-700',
    Urgent: 'bg-red-100 text-red-700',
  };
  return map[priority] ?? 'bg-slate-100 text-slate-700';
}

export const ISSUE_CATEGORIES: IssueCategory[] = [
  'Salary & Compensation',
  'Medical & Health',
  'Housing & Accommodation',
  'Research & Development',
  'Workload & Schedule',
  'Infrastructure & Facilities',
  'Administrative',
  'Professional Development',
  'Other',
];

export const ISSUE_STATUSES: IssueStatus[] = [
  'Submitted',
  'Under Review',
  'In Progress',
  'Communicated to Authorities',
  'Resolved',
  'Closed',
];

export const ACTIVE_STATUSES: IssueStatus[] = [
  'Submitted',
  'Under Review',
  'In Progress',
  'Communicated to Authorities',
];

export const ARCHIVED_STATUSES: IssueStatus[] = ['Resolved', 'Closed'];

export const ISSUE_PRIORITIES: IssuePriority[] = ['Low', 'Medium', 'High', 'Urgent'];

// Faculty designations at UET Lahore
export const DESIGNATIONS = [
  'Lecturer',
  'Assistant Professor',
  'Associate Professor',
  'Professor',
] as const;

// UET campus → department hierarchy for cascading dropdown (2-level structure)
export const CAMPUSES_DEPARTMENTS: Record<string, readonly string[]> = {
  'Main Campus': [
    'Architecture',
    'Architectural Engineering & Design',
    'Automotive Engineering Centre',
    'Chemical Engineering',
    'Chemistry',
    'City & Regional Planning',
    'Civil Engineering',
    'Computer Engineering',
    'Computer Science',
    'Electrical Engineering',
    'Geological Engineering',
    'Humanities, Social Sciences & Modern Languages',
    'Industrial & Manufacturing Engineering',
    'Institute of Business & Management (IBM)',
    'Institute of Data Science',
    'Institute of Environmental Engineering & Research',
    'Islamic Studies',
    'Mathematics',
    'Mechanical Engineering',
    'Mechatronics & Control Engineering',
    'Metallurgical & Materials Engineering',
    'Mining Engineering',
    'Petroleum & Gas Engineering',
    'Physics',
    'Polymer & Process Engineering',
    'Product & Industrial Design',
    'Transportation Engineering & Management',
  ],
  'KSK Campus': [
    'Biomedical Engineering',
    'Chemical, Polymer & Composite Materials Engineering',
    'Civil & Environmental Engineering',
    'Computer Science',
    'Electrical, Electronics & Telecommunication Engineering',
    'Energy Engineering',
    'Food Engineering & Biotechnology',
    'Institute of Machine Learning, Artificial Intelligence & Cyber Security',
    'Management Sciences',
    'Mechanical, Mechatronics & Manufacturing Engineering',
    'Natural Sciences & Humanities',
  ],
  'Faisalabad Campus': [
    'Basic Sciences & Humanities',
    'Chemical, Polymer & Composite Materials Engineering',
    'Computer Science',
    'Electrical, Electronics & Telecommunication Engineering',
    'Mechatronics & Control Engineering',
    'Textile Engineering Department',
  ],
  'Narowal Campus': [
    'Basic Sciences & Humanities',
    'Biomedical Engineering',
    'Civil Engineering',
    'Computer Science & Engineering',
    'Electrical Engineering',
    'Mechanical Engineering',
  ],
  'RCET Gujranwala': [
    'Electrical Engineering',
    'Computer Science',
    'Industrial & Manufacturing Engineering',
    'Mechanical Engineering',
    'Natural Sciences & Humanities',
  ],
};

// Derived from department map so registration and admin filters never drift
export const CAMPUSES = Object.keys(CAMPUSES_DEPARTMENTS);

// Flat list of all departments (for filter dropdowns and backward compat)
export const DEPARTMENTS: string[] = Object.values(CAMPUSES_DEPARTMENTS).flat();

// For backward compatibility, keep UET_FACULTIES as a mapping to departments
export const UET_FACULTIES: Record<string, readonly string[]> = {
  'Faculty of Electrical Engineering': [
    'Electrical Engineering',
    'Electronics Engineering',
    'Telecommunication Engineering',
    'Computer Engineering',
  ],
  'Faculty of Mechanical Engineering': [
    'Mechanical Engineering',
    'Mechatronics Engineering',
    'Industrial Engineering',
    'Automotive Engineering',
  ],
  'Faculty of Civil Engineering': [
    'Civil Engineering',
    'Environmental Engineering',
    'Structural Engineering',
    'Transportation Engineering',
  ],
  'Faculty of Chemical, Metallurgical & Polymer Engineering': [
    'Chemical Engineering',
    'Metallurgical Engineering',
    'Polymer & Process Engineering',
    'Materials Engineering',
  ],
  'Faculty of Architecture & Planning': [
    'Architecture',
    'City & Regional Planning',
    'Urban Design',
  ],
  'Faculty of Computing & Information Technology': [
    'Computer Science',
    'Software Engineering',
    'Information Technology',
    'Artificial Intelligence & Data Science',
  ],
  'Faculty of Natural Sciences & Humanities': [
    'Applied Physics',
    'Applied Chemistry',
    'Mathematics',
    'Humanities and Social Sciences',
  ],
  'Faculty of Management & Business': [
    'Business Administration',
    'Management Sciences',
    'Economics',
  ],
};

export function getMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-PK', { month: 'long' });
}
