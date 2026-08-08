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
    <>
      <div className="space-y-3 p-3 lg:hidden">
        {issues.map((issue) => (
          <Link
            key={issue.id}
            href={`${basePath}/${issue.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <p className="min-w-0 flex-1 break-words font-medium text-slate-900">{issue.title}</p>
              <Badge className={getStatusColor(issue.status)}>{issue.status}</Badge>
            </div>
            {adminView && (
              <div className="mt-2 text-sm text-slate-600">
                <p className="font-medium text-slate-800">
                  {issue.is_anonymous ? 'Anonymous Faculty Member' : issue.user?.full_name ?? 'Unknown faculty member'}
                </p>
                {!issue.is_anonymous && (
                  <p className="break-words text-xs text-slate-500">
                    {issue.user?.department ?? 'No department'} · {issue.user?.campus ?? 'No campus'}
                  </p>
                )}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge>{issue.category}</Badge>
              <Badge className={getPriorityColor(issue.priority)}>{issue.priority}</Badge>
              <span className="text-xs text-slate-500">{formatDate(issue.created_at)}</span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600">
                <MessageSquare className="h-3.5 w-3.5" />
                {issue.replies?.length ?? 0}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="hidden overflow-x-auto lg:block">
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
    </>
  );
}
