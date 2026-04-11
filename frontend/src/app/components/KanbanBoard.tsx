import { Task } from '../App';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  tasks: Task[];
  moveTask: (taskId: string, newStatus: Task['status']) => void;
  onTaskClick: (task: Task) => void;
}

export function KanbanBoard({ tasks, moveTask, onTaskClick }: KanbanBoardProps) {
  const columns: { id: Task['status']; title: string }[] = [
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'review', title: 'In Review' },
    { id: 'done', title: 'Done' }
  ];

  return (
    <div className="mt-4">
      <div className="grid grid-cols-4 gap-3">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            status={column.id}
            title={column.title}
            tasks={tasks.filter(task => task.status === column.id)}
            moveTask={moveTask}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
}
