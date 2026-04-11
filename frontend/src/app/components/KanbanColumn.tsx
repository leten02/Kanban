import { useDrop } from 'react-dnd';
import { Task } from '../App';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  status: Task['status'];
  title: string;
  tasks: Task[];
  moveTask: (taskId: string, newStatus: Task['status']) => void;
  onTaskClick: (task: Task) => void;
}

export function KanbanColumn({ status, title, tasks, moveTask, onTaskClick }: KanbanColumnProps) {
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
      </div>

      <div
        ref={drop}
        className={`flex-1 rounded transition-colors min-h-[calc(100vh-280px)] p-2 ${
          isOver ? 'bg-neutral-100' : 'bg-neutral-50'
        }`}
      >
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick?.(task)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
