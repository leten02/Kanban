import { Task } from '../App';
import { useState } from 'react';
import { Trash2, User } from 'lucide-react';

interface TimelineViewProps {
  tasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
}

export function TimelineView({ tasks, updateTask, deleteTask }: TimelineViewProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const getDateRange = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    const days: Date[] = [];
    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    return days;
  };

  const dateRange = getDateRange();

  const getMonthHeaders = () => {
    const months = new Map<string, number>();
    dateRange.forEach(date => {
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      months.set(key, (months.get(key) || 0) + 1);
    });
    return Array.from(months.entries()).map(([key, count]) => {
      const [year, month] = key.split('-');
      return {
        label: `${parseInt(month) + 1}월`,
        days: count
      };
    });
  };

  const monthHeaders = getMonthHeaders();

  const getTaskBarPosition = (task: Task) => {
    if (!task.startDate || !task.dueDate) return null;

    const startDate = new Date(task.startDate);
    const endDate = new Date(task.dueDate);
    const firstDay = dateRange[0];

    const startOffset = Math.max(0, Math.floor((startDate.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)));
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return {
      left: startOffset * 40,
      width: duration * 40
    };
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'done': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'review': return 'bg-amber-500';
      default: return 'bg-neutral-400';
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0);
  };

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

  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
      <div className="flex">
        <div className="w-[450px] border-r border-neutral-200">
          <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-3">
            <div className="flex items-center gap-4 text-xs text-neutral-600">
              <div className="w-8"></div>
              <div className="flex-1">작업</div>
              <div className="w-24">담당자</div>
            </div>
          </div>

          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            {tasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedTasks.has(task.id)}
                  onChange={() => toggleTaskSelection(task.id)}
                  className="w-4 h-4 rounded border-neutral-300"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">TFT-{task.id}</span>
                    {task.status === 'done' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    )}
                  </div>
                  <div className="text-sm truncate">{task.title}</div>
                </div>
                <div className="flex -space-x-1">
                  {task.assignees.slice(0, 2).map((assignee, idx) => (
                    <div
                      key={idx}
                      className={`w-7 h-7 rounded-full ${getAvatarColor(assignee)} flex items-center justify-center text-xs text-white border-2 border-white`}
                      title={assignee}
                    >
                      {getInitials(assignee)}
                    </div>
                  ))}
                  {task.assignees.length > 2 && (
                    <div className="w-7 h-7 rounded-full bg-neutral-400 flex items-center justify-center text-xs text-white border-2 border-white">
                      +{task.assignees.length - 2}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="bg-neutral-50 border-b border-neutral-200">
            <div className="flex">
              {monthHeaders.map((month, idx) => (
                <div
                  key={idx}
                  className="border-r border-neutral-200 px-3 py-2 text-xs text-neutral-600"
                  style={{ width: `${month.days * 40}px` }}
                >
                  {month.label}
                </div>
              ))}
            </div>
            <div className="flex border-t border-neutral-200">
              {dateRange.map((date, idx) => (
                <div
                  key={idx}
                  className="w-[40px] border-r border-neutral-100 px-1 py-2 text-center text-xs text-neutral-500"
                >
                  {date.getDate()}
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-auto max-h-[calc(100vh-320px)]">
            <div className="absolute inset-0">
              {dateRange.map((date, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 border-r border-neutral-100"
                  style={{ left: `${idx * 40}px`, width: '40px' }}
                />
              ))}
            </div>

            <div className="relative">
              {tasks.map((task, idx) => {
                const position = getTaskBarPosition(task);
                if (!position) return (
                  <div key={task.id} className="h-[57px] border-b border-neutral-100" />
                );

                return (
                  <div
                    key={task.id}
                    className="h-[57px] border-b border-neutral-100 flex items-center"
                  >
                    <div
                      className={`absolute h-8 rounded ${getStatusColor(task.status)} flex items-center justify-between px-2 cursor-pointer hover:opacity-90 transition-opacity group`}
                      style={{
                        left: `${position.left}px`,
                        width: `${position.width}px`
                      }}
                      title={`${task.title} (${task.startDate} ~ ${task.dueDate})`}
                    >
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1 hover:bg-white/20 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
