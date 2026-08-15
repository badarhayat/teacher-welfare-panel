export type UserRole = 'teacher' | 'admin';

export type Campus =
  | 'Main Campus'
  | 'KSK Campus'
  | 'Faisalabad Campus'
  | 'Narowal Campus'
  | 'RCET Gujranwala'
  | string; // backward compat for pre-UET campus names

export type Designation =
  | 'Professor'
  | 'Associate Professor'
  | 'Assistant Professor'
  | 'Lecturer'
  | 'Lab Engineer'       // backward compat
  | 'Research Associate' // backward compat
  | 'Visiting Faculty';  // backward compat

export type IssueCategory =
  | 'Salary & Compensation'
  | 'Medical & Health'
  | 'Housing & Accommodation'
  | 'Research & Development'
  | 'Workload & Schedule'
  | 'Infrastructure & Facilities'
  | 'Administrative'
  | 'Professional Development'
  | 'Other';

export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type IssueStatus =
  | 'Submitted'
  | 'Under Review'
  | 'In Progress'
  | 'Communicated to Authorities'
  | 'Resolved'
  | 'Closed';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  campus: Campus;
  department: string;
  designation: Designation;
  role: UserRole;
  is_approved?: boolean;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  user_id: string;
  is_anonymous: boolean;
  is_confidential?: boolean;
  title: string;
  description: string;
  category: IssueCategory;
  priority: IssuePriority;
  status: IssueStatus;
  resolution_summary?: string | null;
  actions_taken?: string | null;
  published_to_board?: boolean;
  resolution_date?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deleted_by_role?: 'teacher' | 'admin' | null;
  deletion_noticed_at?: string | null;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  replies?: IssueReply[];
  timeline?: IssueTimelineEntry[];
}

export interface IssueTimelineEntry {
  id: string;
  issue_id: string;
  status: IssueStatus;
  note?: string | null;
  changed_at: string;
}

export interface CommunityUpdate {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  published_at?: string | null;
  created_at: string;
}

export interface IssueReply {
  id: string;
  issue_id: string;
  admin_id?: string | null;
  user_id?: string | null;
  message: string;
  created_at: string;
  admin?: UserProfile;
  teacher?: UserProfile;
}

export interface IssueFilters {
  status?: IssueStatus | 'All';
  category?: IssueCategory | 'All';
  priority?: IssuePriority | 'All';
  campus?: Campus | 'All';
  department?: string;
  search?: string;
}

export interface MonthlyReportStats {
  total: number;
  public: number;
  anonymous: number;
  resolved: number;
  pending: number;
  submitted: number;
  under_review: number;
  in_progress: number;
  communicated: number;
  urgent: number;
  avg_resolution_days: number | null;
  categories: Record<string, number>;
  priorities: Record<string, number>;
}

export interface MonthlyReport {
  id: string;
  year: number;
  month: number;
  stats: MonthlyReportStats;
  is_published: boolean;
  generated_at: string;
  created_by: string | null;
}

export interface YearlyReport {
  id: string;
  year: number;
  stats: MonthlyReportStats & {
    resolution_rate: number;
    monthly_breakdown?: Record<string, { total: number; resolved: number }>;
  };
  generated_at: string;
  created_by: string | null;
}

export type TeacherRegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface TeacherRegistration {
  id: string;
  email: string;
  full_name: string;
  campus: Campus;
  department: string;
  designation: Designation;
  status: TeacherRegistrationStatus;
  rejection_reason?: string | null;
  created_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface BlockedEmail {
  id: string;
  email: string;
  reason?: string | null;
  blocked_by?: string | null;
  created_at: string;
}

export type PromotionRank =
  | 'Lecturer'
  | 'Assistant Professor'
  | 'Associate Professor'
  | 'Professor';

export interface PromotionVacancyEntry {
  existing_vacant: number;
  new_required: number;
  new_required_reason?: string | null;
}

export type PromotionVacancies = Record<PromotionRank, PromotionVacancyEntry>;

export interface PromotionSubmission {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  campus: string;
  department: string;
  designation: string;
  date_of_joining: string;
  cadre_start_date: string;
  vacancies: PromotionVacancies;
  created_at: string;
}

export interface PromotionVacancyAggregate {
  campus: string;
  department: string;
  rank: PromotionRank;
  existing_vacant: number;
  new_required: number;
  submission_count: number;
  existing_used_median: boolean;
  new_used_median: boolean;
}

export interface PromotionServiceRow {
  user_id: string;
  full_name: string;
  email: string;
  campus: string;
  department: string;
  designation: string;
  date_of_joining: string;
  cadre_start_date: string;
  service_years: number;
  cadre_years: number;
  service_label: string;
  cadre_label: string;
  submitted_at: string;
}
