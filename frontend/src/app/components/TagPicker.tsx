import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { memberApi } from '../../lib/api';
import { X } from 'lucide-react';

interface TagPickerProps {
  projectId: number;
  value: string[];
  onChange: (tags: string[]) => void;
}

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-red-100 text-red-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function TagPicker({ projectId, value, onChange }: TagPickerProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    memberApi.tags(projectId)
      .then(res => setSuggestions(res.data))
      .catch(() => setSuggestions([]));
  }, [projectId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
    setShowDropdown(false);
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const filtered = suggestions.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  );

  return (
    <div ref={ref} className="relative">
      <div className="min-h-[38px] w-full flex flex-wrap gap-1.5 px-3 py-2 border border-neutral-300 rounded-lg focus-within:ring-2 focus-within:ring-neutral-900 focus-within:border-transparent">
        {value.map(tag => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium ${getTagColor(tag)}`}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:opacity-70"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          placeholder={value.length === 0 ? '태그 입력 후 Enter' : ''}
          className="flex-1 min-w-[80px] text-sm outline-none bg-transparent"
        />
      </div>

      {showDropdown && (filtered.length > 0 || input.trim()) && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg">
          <ul className="max-h-40 overflow-y-auto py-1">
            {input.trim() && !suggestions.includes(input.trim()) && (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addTag(input); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 text-neutral-600"
                >
                  <span className="text-neutral-400">추가:</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${getTagColor(input.trim())}`}>
                    {input.trim()}
                  </span>
                </button>
              </li>
            )}
            {filtered.map(tag => (
              <li key={tag}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addTag(tag); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50"
                >
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${getTagColor(tag)}`}>
                    {tag}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
