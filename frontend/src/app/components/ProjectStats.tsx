import { Task } from '../App';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

interface ProjectStatsProps {
  tasks: Task[];
}

export function ProjectStats({ tasks }: ProjectStatsProps) {
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length
  };

  const completionRate = tasks.length > 0 ? Math.round((stats.done / tasks.length) * 100) : 0;

  return (
    <div className="mb-4">
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Circle className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-600">전체</span>
          </div>
          <div className="text-2xl">{stats.total}</div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs text-neutral-600">진행 중</span>
          </div>
          <div className="text-2xl">{stats.inProgress}</div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-neutral-600">검토</span>
          </div>
          <div className="text-2xl">{stats.review}</div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs text-neutral-600">완료율</span>
          </div>
          <div className="text-2xl">{completionRate}%</div>
        </div>
      </div>
    </div>
  );
}
