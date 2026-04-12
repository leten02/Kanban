import { useState, useEffect } from 'react';
import { Task } from '../App';
import { memberApi, ProjectMember } from '../../lib/api';
import { Search, X } from 'lucide-react';

export interface BoardFilters {
  search: string;
  assigneeMemberId: number | null;
  priority: Task['priority'] | null;
  tag: string | null;
}

interface BoardFilterBarProps {
  projectId: number;
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
}

export function BoardFilterBar({ projectId, filters, onChange }: BoardFilterBarProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    memberApi.list(projectId).then(r => setMembers(r.data)).catch(() => {});
    memberApi.tags(projectId).then(r => setAllTags(r.data)).catch(() => {});
  }, [projectId]);

  const activeCount = [
    filters.search,
    filters.assigneeMemberId !== null,
    filters.priority,
    filters.tag,
  ].filter(Boolean).length;

  const reset = () => onChange({ search: '', assigneeMemberId: null, priority: null, tag: null });

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
        <input
          type="text"
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          placeholder="제목 검색"
          className="pl-7 pr-3 py-1.5 text-sm border border-neutral-300 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </div>

      {/* 담당자 */}
      <select
        value={filters.assigneeMemberId ?? ''}
        onChange={e => onChange({ ...filters, assigneeMemberId: e.target.value ? Number(e.target.value) : null })}
        className="px-2 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
      >
        <option value="">담당자 전체</option>
        {members.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      {/* 우선순위 */}
      <select
        value={filters.priority ?? ''}
        onChange={e => onChange({ ...filters, priority: (e.target.value as Task['priority']) || null })}
        className="px-2 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
      >
        <option value="">우선순위 전체</option>
        <option value="high">높음</option>
        <option value="medium">보통</option>
        <option value="low">낮음</option>
      </select>

      {/* 태그 */}
      {allTags.length > 0 && (
        <select
          value={filters.tag ?? ''}
          onChange={e => onChange({ ...filters, tag: e.target.value || null })}
          className="px-2 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          <option value="">태그 전체</option>
          {allTags.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      )}

      {/* 초기화 */}
      {activeCount > 0 && (
        <button
          onClick={reset}
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          필터 초기화
          <span className="ml-0.5 w-4 h-4 rounded-full bg-neutral-900 text-white text-xs flex items-center justify-center">
            {activeCount}
          </span>
        </button>
      )}
    </div>
  );
}
