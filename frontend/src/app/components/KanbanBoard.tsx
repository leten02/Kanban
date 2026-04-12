import { Task } from '../App';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  tasks: Task[];
  filters?: { search: string; assigneeMemberId: number | null; priority: Task['priority'] | null; tag: string | null };
  moveTask: (taskId: string, newStatus: Task['status']) => void;
  onTaskClick: (task: Task) => void;
  onAddTask?: (status: Task['status']) => void;
}

export function KanbanBoard({ tasks, filters, moveTask, onTaskClick, onAddTask }: KanbanBoardProps) {
  const columns: { id: Task['status']; title: string }[] = [
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'review', title: 'In Review' },
    { id: 'done', title: 'Done' }
  ];

  const hasActiveFilter = filters && (
    filters.search || filters.assigneeMemberId !== null || filters.priority || filters.tag
  );

  return (
    <div className="mt-4">
      {hasActiveFilter && tasks.length === 0 && (
        <div className="text-center py-16 text-neutral-400">
          <p className="text-sm">필터 조건에 맞는 작업이 없습니다</p>
          <p className="text-xs mt-1">검색어나 필터를 변경해보세요</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            status={column.id}
            title={column.title}
            tasks={tasks.filter(task => task.status === column.id)}
            moveTask={moveTask}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
          />
        ))}
      </div>
    </div>
  );
}
