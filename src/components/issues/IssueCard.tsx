import Link from 'next/link';
import { Issue } from '@/types';
import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { MessageSquare, Clock, ChevronRight } from 'lucide-react';

interface IssueCardProps {
  issue: Issue;
  href: string;
}

export default function IssueCard({ issue, href }: IssueCardProps) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer group">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={getStatusColor(issue.status)}>{issue.status}</Badge>
              <Badge className={getPriorityColor(issue.priority)}>{issue.priority}</Badge>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {issue.category}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-[#1e3a5f] transition-colors truncate">
              {issue.title}
            </h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{issue.description}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1 group-hover:text-[#1e3a5f] transition-colors" />
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(issue.created_at)}
          </div>
          {issue.replies && issue.replies.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600">
              <MessageSquare className="w-3.5 h-3.5" />
              {issue.replies.length} {issue.replies.length === 1 ? 'reply' : 'replies'}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
