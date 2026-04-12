import { useState, useEffect } from 'react';
import { useProject, Project } from '../contexts/ProjectContext';
import { projectApi } from '../lib/api';
import { Plus, FolderOpen, Edit2, Trash2, X, Loader2 } from 'lucide-react';

export function ProjectDashboard() {
  const { setSelectedProject } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    projectApi.list()
      .then(res => setProjects(res.data))
      .catch(err => console.error('프로젝트 로드 실패:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProject = async (data: { name: string; description?: string }) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const res = await projectApi.create(data);
      setProjects(prev => [...prev, res.data]);
      setShowCreateModal(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateProject = async (id: number, data: { name?: string; description?: string }) => {
    const res = await projectApi.update(id, data);
    setProjects(prev => prev.map(p => p.id === id ? res.data : p));
    setEditingProject(null);
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('이 프로젝트를 삭제하시겠습니까? 모든 에픽, 태스크, 서브태스크가 함께 삭제됩니다.')) return;
    await projectApi.delete(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl">프로젝트</h1>
            <p className="mt-1 text-sm text-neutral-600">프로젝트를 선택하여 시작하세요</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 프로젝트
          </button>
        </div>
      </header>

      <main className="px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg text-neutral-900 mb-2">프로젝트가 없습니다</h3>
            <p className="text-neutral-600 mb-4">새 프로젝트를 만들어 시작하세요</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              프로젝트 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg border border-neutral-200 p-6 hover:border-neutral-300 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium mb-1">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-neutral-600 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingProject(project)}
                      className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-neutral-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="p-1.5 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-neutral-500 mb-4">
                  생성일: {formatDate(project.created_at)}
                </div>

                <button
                  onClick={() => setSelectedProject(project)}
                  className="w-full px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm"
                >
                  프로젝트 열기
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <ProjectFormModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProject}
        />
      )}

      {editingProject && (
        <ProjectFormModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSubmit={(data) => handleUpdateProject(editingProject.id, data)}
        />
      )}
    </div>
  );
}

interface ProjectFormModalProps {
  project?: Project;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string }) => Promise<void> | void;
}

function ProjectFormModal({ project, onClose, onSubmit }: ProjectFormModalProps) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg">{project ? '프로젝트 수정' : '새 프로젝트'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5">프로젝트 이름 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="프로젝트 이름"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1.5">설명</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                placeholder="프로젝트 설명"
                rows={3}
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
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {project ? '수정' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
