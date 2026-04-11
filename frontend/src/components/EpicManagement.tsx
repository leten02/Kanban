import { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, Target, Loader2 } from 'lucide-react';
import { epicApi, Epic as ApiEpic } from '../lib/api';

export type Epic = ApiEpic & { created_at?: string };

interface EpicManagementProps {
  projectId: number;
}

export function EpicManagement({ projectId }: EpicManagementProps) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);

  useEffect(() => {
    setIsLoading(true);
    epicApi.list(projectId).then(res => setEpics(res.data)).finally(() => setIsLoading(false));
  }, [projectId]);

  const handleCreateEpic = async (data: { title: string; end_date?: string }) => {
    const res = await epicApi.create(projectId, data);
    setEpics(prev => [...prev, res.data]);
    setShowCreateModal(false);
  };

  const handleUpdateEpic = async (id: number, data: { title?: string; end_date?: string }) => {
    const res = await epicApi.update(id, data);
    setEpics(prev => prev.map(e => e.id === id ? res.data : e));
    setEditingEpic(null);
  };

  const handleDeleteEpic = async (id: number) => {
    if (!confirm('이 에픽을 삭제하시겠습니까? 모든 태스크와 서브태스크가 함께 삭제됩니다.')) return;
    await epicApi.delete(id);
    setEpics(prev => prev.filter(e => e.id !== id));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-neutral-600" />
          <h2 className="text-lg">에픽 관리</h2>
          <span className="text-sm text-neutral-500">WBS Level 1</span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          에픽 추가
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      ) : epics.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-lg">
          <Target className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-600 mb-4">에픽이 없습니다</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm"
          >
            첫 에픽 만들기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {epics.map((epic) => (
            <div
              key={epic.id}
              className="border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{epic.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span>마감: {formatDate(epic.end_date)}</span>
                    <span>생성: {formatDate(epic.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingEpic(epic)}
                    className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-neutral-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteEpic(epic.id)}
                    className="p-1.5 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-neutral-600">진행률</span>
                    <span className="font-medium">{epic.progress}%</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${epic.progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-2xl font-medium text-neutral-900">
                  {epic.progress}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <EpicFormModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateEpic}
        />
      )}

      {editingEpic && (
        <EpicFormModal
          epic={editingEpic}
          onClose={() => setEditingEpic(null)}
          onSubmit={(data) => handleUpdateEpic(editingEpic.id, data)}
        />
      )}
    </div>
  );
}

interface EpicFormModalProps {
  epic?: Epic;
  onClose: () => void;
  onSubmit: (data: { title: string; end_date?: string }) => void;
}

function EpicFormModal({ epic, onClose, onSubmit }: EpicFormModalProps) {
  const [formData, setFormData] = useState({
    title: epic?.title || '',
    end_date: epic?.end_date || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSubmit({
      title: formData.title,
      end_date: formData.end_date || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg">{epic ? '에픽 수정' : '새 에픽'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5">에픽 제목 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="에픽 제목"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1.5">마감일</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
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
              className="flex-1 px-4 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              {epic ? '수정' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
