import { useState, useEffect } from 'react';
import { Task } from '../App';
import { X, Calendar, Flag, CheckSquare, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { AssigneePicker } from './AssigneePicker';
import { TagPicker } from './TagPicker';
import { subtaskApi, commentApi, TaskComment, Subtask } from '../../lib/api';

interface TaskDetailModalProps {
  task: Task | null;
  projectId: number;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
}

export function TaskDetailModal({ task, projectId, onClose, onUpdate }: TaskDetailModalProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
      // DB에서 서브태스크/댓글 로드
      const taskId = Number(task.id);
      subtaskApi.list(taskId).then(r => setSubtasks(r.data)).catch(() => setSubtasks([]));
      commentApi.list(taskId).then(r => setComments(r.data)).catch(() => setComments([]));
    }
  }, [task?.id]);

  if (!task || !editedTask) return null;

  const handleUpdate = (updates: Partial<Task>) => {
    const updated = { ...editedTask, ...updates };
    setEditedTask(updated);
    onUpdate(task.id, updates);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await commentApi.create(Number(task.id), newComment.trim());
      setComments(prev => [...prev, res.data]);
      setNewComment('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await commentApi.delete(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim()) return;
    try {
      const res = await subtaskApi.create(Number(task.id), { title: newChecklistItem.trim() });
      setSubtasks(prev => [...prev, res.data]);
      setNewChecklistItem('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSubtask = async (subtaskId: number, current: boolean) => {
    try {
      const res = await subtaskApi.update(subtaskId, { is_completed: !current });
      setSubtasks(prev => prev.map(s => s.id === subtaskId ? res.data : s));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    try {
      await subtaskApi.delete(subtaskId);
      setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
    } catch (e) {
      console.error(e);
    }
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
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

  const completedCount = subtasks.filter(s => s.is_completed).length;
  const totalCount = subtasks.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

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
            {/* 왼쪽: 설명, 체크리스트, 댓글 */}
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

              {/* 체크리스트 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-neutral-600" />
                    <h3 className="text-sm">체크리스트</h3>
                    {totalCount > 0 && (
                      <span className="text-xs text-neutral-500">{completedCount}/{totalCount}</span>
                    )}
                  </div>
                  {totalCount > 0 && (
                    <div className="flex-1 max-w-[200px] ml-4">
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 transition-all" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  {subtasks.map(item => (
                    <div key={item.id} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        onChange={() => handleToggleSubtask(item.id, item.is_completed)}
                        className="w-4 h-4 rounded border-neutral-300"
                      />
                      <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-neutral-400' : ''}`}>
                        {item.title}
                      </span>
                      <button
                        onClick={() => handleDeleteSubtask(item.id)}
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
                    onKeyDown={(e) => {
                      if ((e.nativeEvent as InputEvent).isComposing) return;
                      if (e.key === 'Enter') handleAddChecklistItem();
                    }}
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

              {/* 댓글 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-neutral-600" />
                  <h3 className="text-sm">댓글</h3>
                  <span className="text-xs text-neutral-500">{comments.length}</span>
                </div>

                <div className="space-y-3 mb-3">
                  {comments.map(comment => (
                    <div key={comment.id} className="bg-neutral-50 rounded-lg p-3 group relative">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                          {comment.author_name.charAt(0)}
                        </div>
                        <span className="text-sm">{comment.author_name}</span>
                        <span className="text-xs text-neutral-500">{formatTimestamp(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-neutral-700 ml-8">{comment.content}</p>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-200 rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-neutral-400" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.nativeEvent as InputEvent).isComposing) return;
                      if (e.key === 'Enter') handleAddComment();
                    }}
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

            {/* 오른쪽: 메타 정보 */}
            <div className="space-y-4">
              {/* 담당자 */}
              <div>
                <label className="block text-sm text-neutral-600 mb-2">담당자</label>
                <AssigneePicker
                  projectId={projectId}
                  value={editedTask.assignee_member_id ?? null}
                  onChange={(memberId, memberName) => {
                    handleUpdate({ assignee_member_id: memberId, assignee_name: memberName, assignees: memberName ? [memberName] : [] });
                  }}
                />
              </div>

              {/* 우선순위 */}
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

              {/* 상태 */}
              <div>
                <label className="block text-sm text-neutral-600 mb-2">상태</label>
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

              {/* 시작일 */}
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

              {/* 마감일 */}
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

              {/* 태그 */}
              <div>
                <label className="block text-sm text-neutral-600 mb-2">태그</label>
                <TagPicker
                  projectId={projectId}
                  value={editedTask.tags}
                  onChange={(tags) => handleUpdate({ tags })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
