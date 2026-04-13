import { useDrop } from 'react-dnd';
import { Task } from '../App';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  status: Task['status'];
  title: string;
  tasks: Task[];
  moveTask: (taskId: string, newStatus: Task['status']) => void;
  onTaskClick: (task: Task) => void;
  onAddTask?: (status: Task['status']) => void;
}

export function KanbanColumn({ status, title, tasks, moveTask, onTaskClick, onAddTask }: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'TASK',
    drop: (item: { id: string }) => {
      moveTask(item.id, status);
    },
    collect: monitor => ({
      isOver: monitor.isOver()
    })
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs text-neutral-500 uppercase tracking-wide font-medium">{title}</h3>
        <span className="text-xs text-neutral-500">{tasks.length}</span>
        {onAddTask && (
          <button
            onClick={() => onAddTask(status)}
            className="ml-auto p-0.5 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors"
            title={`${title}에 새 작업 추가`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div
        ref={drop}
        className={`flex-1 rounded transition-colors min-h-[calc(100vh-280px)] p-2 cursor-pointer ${
          isOver ? 'bg-neutral-100' : 'bg-neutral-50 hover:bg-neutral-100/70'
        }`}
        onClick={() => onAddTask?.(status)}
      >
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick?.(task)}
            />
          ))}
        </div>
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-neutral-300 gap-1 select-none pointer-events-none">
            <Plus className="w-4 h-4" />
            <span className="text-xs">여기에 드래그하거나 + 클릭</span>
          </div>
        )}
      </div>
    </div>
  );
}
