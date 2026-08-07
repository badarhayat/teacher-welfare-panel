import { Issue } from '@/types';
import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

interface IssueTableProps {
  issues: Issue[];
  adminView?: boolean;
  basePath?: string;
}

export default function IssueTable({
  issues,
  adminView = false,
  basePath = '/dashboard/issues',
}: IssueTableProps) {
  if (issues.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="text-lg font-medium">No issues found</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Title
            </th>
            {adminView && (
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Faculty
              </th>
            )}
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Category
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Priority
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Date
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Replies
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {issues.map((issue) => (
            <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">
                <Link
                  href={`${basePath}/${issue.id}`}
                  className="font-medium text-slate-900 hover:text-[#1e3a5f] transition-colors line-clamp-1 max-w-[240px] block"
                >
                  {issue.title}
                </Link>
              </td>
              {adminView && (
                <td className="px-4 py-3">
                  <div>
                    {issue.is_anonymous ? (
                      <>
                        <p className="font-medium text-slate-900">Anonymous Faculty Member</p>
                        <p className="text-xs text-slate-500">Identity hidden by submitter</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-slate-900">{issue.user?.full_name ?? '—'}</p>
                        <p className="text-xs text-slate-500">
                          {issue.user?.department ?? '—'} · {issue.user?.campus ?? '—'}
                        </p>
                      </>
                    )}
                  </div>
                </td>
              )}
              <td className="px-4 py-3 text-slate-600">{issue.category}</td>
              <td className="px-4 py-3">
                <Badge className={getPriorityColor(issue.priority)}>{issue.priority}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge className={getStatusColor(issue.status)}>{issue.status}</Badge>
              </td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                {formatDate(issue.created_at)}
              </td>
              <td className="px-4 py-3">
                {issue.replies && issue.replies.length > 0 ? (
                  <div className="flex items-center gap-1 text-blue-600">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{issue.replies.length}</span>
                  </div>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
