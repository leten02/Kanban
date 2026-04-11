import { useState, useEffect, useRef } from 'react';
import { memberApi, ProjectMember } from '../../lib/api';
import { ChevronDown, X } from 'lucide-react';

interface AssigneePickerProps {
  projectId: number;
  value: number | null;
  onChange: (memberId: number | null, memberName: string | null) => void;
}

const AVATAR_COLORS = [
  'bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400',
  'bg-purple-400', 'bg-pink-400', 'bg-indigo-400', 'bg-orange-400',
  'bg-teal-400', 'bg-cyan-400',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ member, size = 'sm' }: { member: ProjectMember; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
  if (member.picture) {
    return (
      <img
        src={member.picture}
        alt={member.name}
        className={`${cls} rounded-full object-cover`}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className={`${cls} rounded-full ${getAvatarColor(member.name)} flex items-center justify-center text-white font-medium`}>
      {member.name.charAt(0)}
    </div>
  );
}

export function AssigneePicker({ projectId, value, onChange }: AssigneePickerProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    memberApi.list(projectId)
      .then(res => setMembers(res.data))
      .catch(() => setMembers([]));
  }, [projectId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selected = members.find(m => m.id === value) ?? null;
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 border border-neutral-300 rounded-lg text-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
      >
        {selected ? (
          <>
            <Avatar member={selected} />
            <span className="flex-1 text-left truncate">{selected.name}</span>
            <X
              className="w-3.5 h-3.5 text-neutral-400 hover:text-neutral-700 flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); onChange(null, null); }}
            />
          </>
        ) : (
          <>
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-neutral-300 flex-shrink-0" />
            <span className="flex-1 text-left text-neutral-400">담당자 없음</span>
            <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-neutral-100">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름 또는 이메일 검색"
              className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-900"
              autoFocus
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => { onChange(null, null); setOpen(false); setSearch(''); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50"
              >
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-neutral-300 flex-shrink-0" />
                담당자 없음
              </button>
            </li>
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-neutral-400 text-center">멤버가 없습니다</li>
            )}
            {filtered.map(m => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => { onChange(m.id, m.name); setOpen(false); setSearch(''); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 ${m.id === value ? 'bg-neutral-50 font-medium' : ''}`}
                >
                  <Avatar member={m} />
                  <div className="flex-1 text-left min-w-0">
                    <div className="truncate">{m.name}</div>
                    <div className="text-xs text-neutral-400 truncate">{m.email}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
