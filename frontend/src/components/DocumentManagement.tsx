import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Plus, X, Edit2, Trash2, FileText, Eye, Code } from 'lucide-react';

export interface Document {
  id: number;
  project_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface DocumentManagementProps {
  projectId: number;
}

export function DocumentManagement({ projectId }: DocumentManagementProps) {
  const [documents, setDocuments] = useState<Document[]>([]);

  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');

  const handleCreateDocument = (data: { title: string; content: string }) => {
    const newDoc: Document = {
      id: Date.now(),
      project_id: projectId,
      title: data.title,
      content: data.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setDocuments([...documents, newDoc]);
    setShowCreateModal(false);
    setSelectedDoc(newDoc);
  };

  const handleUpdateDocument = (id: number, data: { title?: string; content?: string }) => {
    setDocuments(
      documents.map((doc) =>
        doc.id === id
          ? { ...doc, ...data, updated_at: new Date().toISOString() }
          : doc
      )
    );
    if (selectedDoc?.id === id) {
      setSelectedDoc({ ...selectedDoc, ...data, updated_at: new Date().toISOString() });
    }
    setIsEditing(false);
  };

  const handleDeleteDocument = (id: number) => {
    if (!confirm('이 문서를 삭제하시겠습니까?')) {
      return;
    }
    setDocuments(documents.filter((doc) => doc.id !== id));
    if (selectedDoc?.id === id) {
      setSelectedDoc(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* 문서 목록 */}
      <div className="w-80 bg-white rounded-lg border border-neutral-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-neutral-600" />
            <h2 className="text-lg">문서</h2>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            title="새 문서"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-lg">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600 mb-4">문서가 없습니다</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm"
            >
              첫 문서 만들기
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => {
                  setSelectedDoc(doc);
                  setIsEditing(false);
                  setViewMode('preview');
                }}
                className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                  selectedDoc?.id === doc.id
                    ? 'border-neutral-900 bg-neutral-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-medium text-sm line-clamp-1">{doc.title}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
                <p className="text-xs text-neutral-500">
                  {formatDate(doc.updated_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 문서 뷰어/에디터 */}
      <div className="flex-1 bg-white rounded-lg border border-neutral-200 overflow-hidden flex flex-col">
        {selectedDoc ? (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={selectedDoc.title}
                    onChange={(e) =>
                      setSelectedDoc({ ...selectedDoc, title: e.target.value })
                    }
                    className="text-lg font-medium border-b-2 border-neutral-900 focus:outline-none w-full"
                  />
                ) : (
                  <h1 className="text-lg font-medium">{selectedDoc.title}</h1>
                )}
                <p className="text-xs text-neutral-500 mt-1">
                  마지막 수정: {formatDate(selectedDoc.updated_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <>
                    <button
                      onClick={() =>
                        setViewMode(viewMode === 'preview' ? 'edit' : 'preview')
                      }
                      className="flex items-center gap-2 px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-sm"
                    >
                      {viewMode === 'preview' ? (
                        <>
                          <Code className="w-4 h-4" />
                          편집
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          미리보기
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      수정
                    </button>
                  </>
                )}
                {isEditing && (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedDoc(
                          documents.find((d) => d.id === selectedDoc.id) || null
                        );
                      }}
                      className="px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-sm"
                    >
                      취소
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateDocument(selectedDoc.id, {
                          title: selectedDoc.title,
                          content: selectedDoc.content,
                        })
                      }
                      className="px-3 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm"
                    >
                      저장
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isEditing || viewMode === 'edit' ? (
                <textarea
                  value={selectedDoc.content}
                  onChange={(e) =>
                    setSelectedDoc({ ...selectedDoc, content: e.target.value })
                  }
                  className="w-full h-full min-h-[500px] p-4 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono text-sm resize-none"
                  placeholder="마크다운으로 작성하세요..."
                />
              ) : (
                <div className="prose prose-neutral max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedDoc.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-400">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4" />
              <p>문서를 선택하세요</p>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <DocumentFormModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateDocument}
        />
      )}
    </div>
  );
}

interface DocumentFormModalProps {
  onClose: () => void;
  onSubmit: (data: { title: string; content: string }) => void;
}

function DocumentFormModal({ onClose, onSubmit }: DocumentFormModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '# 새 문서\n\n여기에 내용을 작성하세요...',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg">새 문서</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5">문서 제목 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="문서 제목"
                required
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
              생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
