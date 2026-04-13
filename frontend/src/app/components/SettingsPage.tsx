import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { memberApi, projectApi, schoolApi, ProjectMember } from '../../lib/api';
import { RefreshCw, Trash2, AlertTriangle, CheckCircle2, Link, Eye, EyeOff } from 'lucide-react';
import { getAvatarColor } from '../../lib/avatarUtils';
import { useAuth } from '../../contexts/AuthContext';

interface SettingsPageProps {
  projectId: number;
  projectName: string;
  projectDescription: string | null;
  onDeleteProject: () => void;
}

function MemberAvatar({ member }: { member: ProjectMember }) {
  if (member.picture) {
    return (
      <img
        src={member.picture}
        alt={member.name}
        className="w-9 h-9 rounded-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className={`w-9 h-9 rounded-full ${getAvatarColor(member.name)} flex items-center justify-center text-white font-medium text-sm`}>
      {member.name.charAt(0)}
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  member: '멤버',
  viewer: '뷰어',
};

export function SettingsPage({ projectId, projectName, projectDescription, onDeleteProject }: SettingsPageProps) {
  const { user, refreshUser } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 1000school 토큰 연동
  const [schoolToken, setSchoolToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    memberApi.list(projectId)
      .then(res => setMembers(res.data))
      .catch(console.error);
  }, [projectId]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await memberApi.sync(projectId);
      setMembers(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '동기화 실패';
      setSyncError(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleRoleChange = async (memberId: number, role: string) => {
    try {
      await memberApi.updateRole(projectId, memberId, role);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    try {
      await memberApi.remove(projectId, memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '멤버 제거에 실패했습니다';
      toast.error(msg);
    }
  };

  const handleLinkSchool = async () => {
    if (!schoolToken.trim()) return;
    setLinking(true);
    try {
      await schoolApi.linkAccount(schoolToken.trim());
      await refreshUser();
      setSchoolToken('');
      toast.success('1000school 계정이 연결되었습니다.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '토큰 연결에 실패했습니다.';
      toast.error(msg);
    } finally {
      setLinking(false);
    }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      await projectApi.delete(projectId);
      onDeleteProject();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '프로젝트 삭제에 실패했습니다';
      toast.error(msg);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      {/* Project Info */}
      <section>
        <h2 className="text-base font-medium mb-4 text-neutral-900">프로젝트 정보</h2>
        <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">프로젝트 이름</p>
            <p className="text-sm">{projectName}</p>
          </div>
          {projectDescription && (
            <div>
              <p className="text-xs text-neutral-500 mb-0.5">설명</p>
              <p className="text-sm text-neutral-700">{projectDescription}</p>
            </div>
          )}
        </div>
      </section>

      {/* 1000school 계정 연동 */}
      <section>
        <h2 className="text-base font-medium mb-4 text-neutral-900">1000school 계정 연동</h2>
        <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-4">
          {/* 연결 상태 */}
          <div className="flex items-center gap-2">
            {user?.has_school_token ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-green-700">계정 연결됨 — 본인 명의로 회의실 예약 가능</span>
              </>
            ) : (
              <>
                <Link className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <span className="text-sm text-neutral-500">미연결 — 회의실 예약 시 공용 토큰이 사용됩니다</span>
              </>
            )}
          </div>

          {/* 토큰 입력 */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-500">
              {user?.has_school_token ? '새 토큰으로 교체' : '개인 API 토큰 입력'}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={schoolToken}
                  onChange={e => setSchoolToken(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLinkSchool()}
                  placeholder="1000school API 토큰"
                  className="w-full px-3 py-2 pr-10 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleLinkSchool}
                disabled={linking || !schoolToken.trim()}
                className="px-4 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {linking ? '확인 중...' : '연결'}
              </button>
            </div>
            <p className="text-xs text-neutral-400">
              api.1000.school → 개인 설정에서 토큰 발급 후 입력하세요.
            </p>
          </div>
        </div>
      </section>

      {/* Team Members */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-neutral-900">팀 멤버</h2>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            1000school 동기화
          </button>
        </div>

        {syncError && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {syncError}
          </div>
        )}

        {members.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center text-sm text-neutral-400">
            멤버가 없습니다. 1000school 동기화 버튼을 눌러 팀원을 불러오세요.
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100">
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                <MemberAvatar member={member} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{member.name}</p>
                  <p className="text-xs text-neutral-400 truncate">{member.email}</p>
                </div>
                <select
                  value={member.role}
                  onChange={e => handleRoleChange(member.id, e.target.value)}
                  className="text-xs px-2 py-1 border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="admin">관리자</option>
                  <option value="member">멤버</option>
                  <option value="viewer">뷰어</option>
                </select>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="멤버 제거"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="text-base font-medium text-red-600 mb-4">위험 구역</h2>
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900 mb-0.5">프로젝트 삭제</p>
              <p className="text-xs text-neutral-500 mb-3">
                이 프로젝트와 관련된 모든 데이터(에픽, 작업 등)가 영구적으로 삭제됩니다.
              </p>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
                >
                  프로젝트 삭제
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-red-600 font-medium">정말 삭제하시겠습니까?</p>
                  <button
                    onClick={handleDeleteProject}
                    disabled={deleting}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleting ? '삭제 중...' : '확인'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
