import { useDrag } from 'react-dnd';
import { Task } from '../App';
import { CheckSquare } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: task.id },
    collect: monitor => ({
      isDragging: monitor.isDragging()
    })
  }));

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-amber-500',
      'bg-cyan-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name.charAt(0);
  };

  const getTagColor = (tag: string) => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('backend')) return 'bg-blue-100 text-blue-700';
    if (tagLower.includes('frontend')) return 'bg-green-100 text-green-700';
    if (tagLower.includes('design')) return 'bg-purple-100 text-purple-700';
    if (tagLower.includes('database')) return 'bg-amber-100 text-amber-700';
    if (tagLower.includes('security')) return 'bg-red-100 text-red-700';
    return 'bg-neutral-100 text-neutral-700';
  };

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={`bg-white rounded border border-neutral-200 p-3 cursor-pointer hover:shadow-md transition-all ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="mb-2">
        <h4 className="text-sm text-neutral-900 leading-tight mb-2">{task.title}</h4>

        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.map(tag => (
              <span
                key={tag}
                className={`text-xs px-2 py-0.5 rounded font-medium ${getTagColor(tag)}`}
              >
                {tag.toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">TFT-{task.id}</span>
          {task.checklist.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <CheckSquare className="w-3 h-3" />
              <span>{task.checklist.filter(item => item.completed).length}/{task.checklist.length}</span>
            </div>
          )}
        </div>
        <div className="flex -space-x-1">
          {task.assignees.slice(0, 3).map((assignee, idx) => (
            <div
              key={idx}
              className={`w-6 h-6 rounded-full ${getAvatarColor(assignee)} flex items-center justify-center text-xs text-white font-medium border-2 border-white`}
              title={assignee}
            >
              {getInitials(assignee)}
            </div>
          ))}
          {task.assignees.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-neutral-400 flex items-center justify-center text-xs text-white font-medium border-2 border-white">
              +{task.assignees.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
