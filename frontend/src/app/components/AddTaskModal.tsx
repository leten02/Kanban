import { useState, useEffect } from 'react';
import { Task } from '../App';
import { X } from 'lucide-react';
import { AssigneePicker } from './AssigneePicker';
import { TagPicker } from './TagPicker';
import { Epic } from '../../lib/api';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, 'id'> & { epic_id?: number | null }) => void;
  projectId: number;
  epics?: Epic[];
  initialStatus?: Task['status'];
}

export function AddTaskModal({ isOpen, onClose, onAdd, projectId, epics = [], initialStatus }: AddTaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee_member_id: null as number | null,
    assignee_name: null as string | null,
    priority: 'medium' as Task['priority'],
    startDate: '',
    dueDate: '',
    status: (initialStatus ?? 'todo') as Task['status'],
    tags: [] as string[],
    epic_id: null as number | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        status: initialStatus ?? 'todo',
        epic_id: epics.length > 0 ? epics[0].id : null,
      }));
    }
  }, [isOpen, initialStatus, epics]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.title.trim()) return;

    setIsSubmitting(true);

    onAdd({
      title: formData.title,
      description: formData.description,
      assignees: formData.assignee_name ? [formData.assignee_name] : [],
      assignee_member_id: formData.assignee_member_id,
      assignee_name: formData.assignee_name,
      priority: formData.priority,
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      status: formData.status,
      tags: formData.tags,
      epic_id: formData.epic_id,
      comments: [],
      checklist: [],
    });

    setFormData({
      title: '',
      description: '',
      assignee_member_id: null,
      assignee_name: null,
      priority: 'medium',
      startDate: '',
      dueDate: '',
      status: 'todo',
      tags: [],
      epic_id: epics.length > 0 ? epics[0].id : null,
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg">새 작업 추가</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5">작업 제목 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                placeholder="작업 제목을 입력하세요"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1.5">설명</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none"
                placeholder="작업에 대한 설명을 입력하세요"
                rows={3}
              />
            </div>

            {epics.length > 0 && (
              <div>
                <label className="block text-sm mb-1.5">에픽</label>
                <select
                  value={formData.epic_id ?? ''}
                  onChange={e => setFormData({ ...formData, epic_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                >
                  <option value="">에픽 없음</option>
                  {epics.map(epic => (
                    <option key={epic.id} value={epic.id}>{epic.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm mb-1.5">담당자</label>
              <AssigneePicker
                projectId={projectId}
                value={formData.assignee_member_id}
                onChange={(memberId, memberName) =>
                  setFormData({ ...formData, assignee_member_id: memberId, assignee_name: memberName })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1.5">시작일</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-1.5">마감일</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1.5">우선순위</label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                >
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1.5">상태</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                >
                  <option value="todo">할 일</option>
                  <option value="in-progress">진행 중</option>
                  <option value="review">검토</option>
                  <option value="done">완료</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1.5">태그</label>
              <TagPicker
                projectId={projectId}
                value={formData.tags}
                onChange={tags => setFormData({ ...formData, tags })}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim() || isSubmitting}
              className="flex-1 px-4 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
