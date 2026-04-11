import { useState, useEffect } from 'react';
import { Task, Comment, ChecklistItem } from '../App';
import { X, User, Calendar, Flag, Tag, CheckSquare, MessageSquare, Plus, Trash2 } from 'lucide-react';

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
}

export function TaskDetailModal({ task, onClose, onUpdate }: TaskDetailModalProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
    }
  }, [task]);

  if (!task || !editedTask) return null;

  const handleUpdate = (updates: Partial<Task>) => {
    const updated = { ...editedTask, ...updates };
    setEditedTask(updated);
    onUpdate(task.id, updates);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: '현재 사용자',
      content: newComment,
      timestamp: new Date().toISOString()
    };

    const updatedComments = [...editedTask.comments, comment];
    handleUpdate({ comments: updatedComments });
    setNewComment('');
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;

    const item: ChecklistItem = {
      id: Date.now().toString(),
      text: newChecklistItem,
      completed: false
    };

    const updatedChecklist = [...editedTask.checklist, item];
    handleUpdate({ checklist: updatedChecklist });
    setNewChecklistItem('');
  };

  const handleToggleChecklistItem = (itemId: string) => {
    const updatedChecklist = editedTask.checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    handleUpdate({ checklist: updatedChecklist });
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    const updatedChecklist = editedTask.checklist.filter(item => item.id !== itemId);
    handleUpdate({ checklist: updatedChecklist });
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'todo': return '할 일';
      case 'in-progress': return '진행 중';
      case 'review': return '검토';
      case 'done': return '완료';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  };

  const completedCount = editedTask.checklist.filter(item => item.completed).length;
  const totalCount = editedTask.checklist.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <input
            type="text"
            value={editedTask.title}
            onChange={(e) => handleUpdate({ title: e.target.value })}
            className="text-xl flex-1 mr-4 bg-transparent border-none focus:outline-none"
          />
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-6 p-6">
            <div className="col-span-2 space-y-6">
              <div>
                <label className="block text-sm mb-2">설명</label>
                <textarea
                  value={editedTask.description}
                  onChange={(e) => handleUpdate({ description: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="작업 설명을 입력하세요"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-neutral-600" />
                    <h3 className="text-sm">체크리스트</h3>
                    {totalCount > 0 && (
                      <span className="text-xs text-neutral-500">
                        {completedCount}/{totalCount}
                      </span>
                    )}
                  </div>
                  {totalCount > 0 && (
                    <div className="flex-1 max-w-[200px] ml-4">
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  {editedTask.checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleChecklistItem(item.id)}
                        className="w-4 h-4 rounded border-neutral-300"
                      />
                      <span className={`flex-1 text-sm ${item.completed ? 'line-through text-neutral-400' : ''}`}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-100 rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-neutral-400" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                    placeholder="새 항목 추가"
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddChecklistItem}
                    className="px-3 py-2 bg-neutral-900 text-white rounded-lg text-sm hover:bg-neutral-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-neutral-600" />
                  <h3 className="text-sm">댓글</h3>
                  <span className="text-xs text-neutral-500">{editedTask.comments.length}</span>
                </div>

                <div className="space-y-3 mb-3">
                  {editedTask.comments.map(comment => (
                    <div key={comment.id} className="bg-neutral-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                          {comment.author.charAt(0)}
                        </div>
                        <span className="text-sm">{comment.author}</span>
                        <span className="text-xs text-neutral-500">{formatTimestamp(comment.timestamp)}</span>
                      </div>
                      <p className="text-sm text-neutral-700 ml-8">{comment.content}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="댓글을 입력하세요"
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddComment}
                    className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm hover:bg-neutral-800 transition-colors"
                  >
                    추가
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
                  <User className="w-4 h-4" />
                  담당자
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editedTask.assignees.map((assignee, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                    >
                      {assignee}
                      <button
                        onClick={() => {
                          const updatedAssignees = editedTask.assignees.filter((_, i) => i !== idx);
                          handleUpdate({ assignees: updatedAssignees });
                        }}
                        className="hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="담당자 추가 (Enter)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const value = e.currentTarget.value.trim();
                      if (value && !editedTask.assignees.includes(value)) {
                        handleUpdate({ assignees: [...editedTask.assignees, value] });
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
                  <Flag className="w-4 h-4" />
                  우선순위
                </label>
                <select
                  value={editedTask.priority}
                  onChange={(e) => handleUpdate({ priority: e.target.value as Task['priority'] })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                >
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
                  상태
                </label>
                <select
                  value={editedTask.status}
                  onChange={(e) => handleUpdate({ status: e.target.value as Task['status'] })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                >
                  <option value="todo">할 일</option>
                  <option value="in-progress">진행 중</option>
                  <option value="review">검토</option>
                  <option value="done">완료</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  시작일
                </label>
                <input
                  type="date"
                  value={editedTask.startDate || ''}
                  onChange={(e) => handleUpdate({ startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  마감일
                </label>
                <input
                  type="date"
                  value={editedTask.dueDate}
                  onChange={(e) => handleUpdate({ dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
                  <Tag className="w-4 h-4" />
                  태그
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editedTask.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded"
                    >
                      {tag}
                      <button
                        onClick={() => {
                          const updatedTags = editedTask.tags.filter((_, i) => i !== idx);
                          handleUpdate({ tags: updatedTags });
                        }}
                        className="hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="태그 추가 (Enter)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const value = e.currentTarget.value.trim();
                      if (value && !editedTask.tags.includes(value)) {
                        handleUpdate({ tags: [...editedTask.tags, value] });
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
