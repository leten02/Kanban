import { useDrag } from 'react-dnd';
import { Task } from '../App';
import { CheckSquare, Calendar, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { getAvatarColor } from '../../lib/avatarUtils';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

function DueDateBadge({ dueDate }: { dueDate: string }) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let label: string;
  let cls: string;
  if (diffDays < 0) {
    label = `D+${Math.abs(diffDays)}`;
    cls = 'text-red-600 bg-red-50';
  } else if (diffDays === 0) {
    label = 'D-day';
    cls = 'text-orange-600 bg-orange-50';
  } else if (diffDays === 1) {
    label = 'D-1';
    cls = 'text-orange-500 bg-orange-50';
  } else {
    label = `D-${diffDays}`;
    cls = 'text-neutral-500 bg-neutral-50';
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>
      <Calendar className="w-3 h-3" />
      {label}
    </span>
  );
}

const PRIORITY_CONFIG = {
  high:   { label: '높음', icon: ArrowUp,    cls: 'text-red-500' },
  medium: { label: '보통', icon: ArrowRight, cls: 'text-amber-500' },
  low:    { label: '낮음', icon: ArrowDown,  cls: 'text-blue-400' },
};

// 태그 해시 기반 색상 — 한국어 포함 모든 태그에 일관된 색 적용
const TAG_PALETTES = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_PALETTES[Math.abs(hash) % TAG_PALETTES.length];
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: task.id },
    collect: monitor => ({
      isDragging: monitor.isDragging()
    })
  }));

  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const PriorityIcon = priority.icon;
  const assigneeName = task.assignee_name ?? task.assignees[0];

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={`bg-white rounded border border-neutral-200 p-3 cursor-pointer hover:shadow-md transition-all ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      {/* 제목 */}
      <h4 className="text-sm text-neutral-900 leading-tight mb-2">{task.title}</h4>

      {/* 태그 */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map(tag => (
            <span key={tag} className={`text-xs px-1.5 py-0.5 rounded font-medium ${getTagColor(tag)}`}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 하단 메타 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* 우선순위 */}
          <span className={`inline-flex items-center gap-0.5 text-xs ${priority.cls}`} title={`우선순위: ${priority.label}`}>
            <PriorityIcon className="w-3 h-3" />
          </span>

          {/* ID */}
          <span className="text-xs text-neutral-400">TFT-{task.id}</span>

          {/* 서브태스크 진행 */}
          {task.checklist.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <CheckSquare className="w-3 h-3" />
              <span>{task.checklist.filter(i => i.completed).length}/{task.checklist.length}</span>
            </div>
          )}

          {/* 마감일 */}
          {task.dueDate && <DueDateBadge dueDate={task.dueDate} />}
        </div>

        {/* 담당자 아바타 */}
        {assigneeName && (
          <div
            className={`w-6 h-6 rounded-full flex-shrink-0 ${getAvatarColor(assigneeName)} flex items-center justify-center text-xs text-white font-medium`}
            title={assigneeName}
          >
            {assigneeName.charAt(0)}
          </div>
        )}
      </div>
    </div>
  );
}
