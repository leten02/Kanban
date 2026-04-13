import { Task } from '../App';
import { Epic } from '../../lib/api';
import { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { getAvatarColor } from '../../lib/avatarUtils';

interface TimelineViewProps {
  tasks: Task[];
  epics: Epic[];
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
}

const STATUS_COLOR: Record<Task['status'], string> = {
  'done':        'bg-green-500',
  'in-progress': 'bg-blue-500',
  'review':      'bg-amber-500',
  'todo':        'bg-neutral-400',
};

const STATUS_LABEL: Record<Task['status'], string> = {
  'done':        '완료',
  'in-progress': '진행 중',
  'review':      '리뷰 중',
  'todo':        '할 일',
};

const EPIC_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-amber-500',  'bg-rose-500', 'bg-cyan-500',
];

const DAY_W = 40; // px per day

function getDateRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end   = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

function getMonthHeaders(days: Date[]) {
  const map = new Map<string, number>();
  days.forEach(d => {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([key, count]) => {
    const month = parseInt(key.split('-')[1]) + 1;
    return { label: `${month}월`, days: count };
  });
}

function barPosition(startStr: string | undefined, dueStr: string, firstDay: Date) {
  if (!startStr || !dueStr) return null;
  const s = new Date(startStr);
  const e = new Date(dueStr);
  const offset = Math.max(0, Math.floor((s.getTime() - firstDay.getTime()) / 86400000));
  const duration = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1);
  return { left: offset * DAY_W, width: duration * DAY_W };
}

function epicBarPosition(epic: Epic, firstDay: Date) {
  if (!epic.start_date || !epic.end_date) return null;
  return barPosition(epic.start_date, epic.end_date, firstDay);
}

export function TimelineView({ tasks, epics, updateTask, deleteTask }: TimelineViewProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const dateRange = getDateRange();
  const monthHeaders = getMonthHeaders(dateRange);
  const firstDay = dateRange[0];
  const today = new Date();
  const todayOffset = Math.floor((today.getTime() - firstDay.getTime()) / 86400000);

  const toggle = (epicId: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(epicId) ? next.delete(epicId) : next.add(epicId);
      return next;
    });
  };

  // 에픽에 속하지 않는 태스크 (orphan)
  const epicIds = new Set(epics.map(e => e.id));
  const orphanTasks = tasks.filter(t => !epicIds.has(t.epic_id));

  // 전체 행 목록 (에픽 헤더 + 태스크 행) 구성 — 간트 차트 행 높이 통일을 위해
  type Row =
    | { kind: 'epic';    epic: Epic;          idx: number }
    | { kind: 'task';    task: Task;          epicIdx: number }
    | { kind: 'orphan';  task: Task }
    | { kind: 'nodate';  task: Task;          epicIdx: number };

  const rows: Row[] = [];
  epics.forEach((epic, idx) => {
    rows.push({ kind: 'epic', epic, idx });
    if (!collapsed.has(epic.id)) {
      const epicTasks = tasks.filter(t => t.epic_id === epic.id);
      epicTasks.forEach(task => {
        if (task.startDate || task.dueDate) {
          rows.push({ kind: 'task', task, epicIdx: idx });
        } else {
          rows.push({ kind: 'nodate', task, epicIdx: idx });
        }
      });
    }
  });
  orphanTasks.forEach(task => rows.push({ kind: 'orphan', task }));

  const ROW_H = 52; // px

  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
      <div className="flex">

        {/* ── 왼쪽 레이블 패널 ── */}
        <div className="w-[420px] shrink-0 border-r border-neutral-200">
          {/* 헤더 */}
          <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-3 flex items-center gap-4 text-xs text-neutral-500">
            <div className="w-6" />
            <div className="flex-1">작업 / 에픽</div>
            <div className="w-16 text-right">진행률</div>
            <div className="w-20 text-right">담당자</div>
          </div>

          {/* 행 */}
          <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
            {rows.map((row, i) => {
              if (row.kind === 'epic') {
                const color = EPIC_COLORS[row.idx % EPIC_COLORS.length];
                const isOpen = !collapsed.has(row.epic.id);
                return (
                  <div
                    key={`epic-${row.epic.id}`}
                    style={{ height: ROW_H }}
                    className="flex items-center gap-2 px-3 border-b border-neutral-100 bg-neutral-50 cursor-pointer hover:bg-neutral-100 transition-colors"
                    onClick={() => toggle(row.epic.id)}
                  >
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                    }
                    <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${color}`} />
                    <span className="flex-1 text-sm font-medium truncate">{row.epic.title}</span>
                    <span className="w-16 text-right text-xs text-neutral-500">{row.epic.progress}%</span>
                    <div className="w-20" />
                  </div>
                );
              }

              if (row.kind === 'task' || row.kind === 'nodate') {
                const color = EPIC_COLORS[row.epicIdx % EPIC_COLORS.length];
                return (
                  <div
                    key={`task-${row.task.id}`}
                    style={{ height: ROW_H }}
                    className="flex items-center gap-2 pl-8 pr-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-neutral-500 truncate">{STATUS_LABEL[row.task.status]}</div>
                      <div className="text-sm truncate">{row.task.title}</div>
                    </div>
                    <div className="w-16" />
                    <div className="w-20 flex justify-end">
                      {row.task.assignee_name ? (
                        <div
                          className={`w-7 h-7 rounded-full ${getAvatarColor(row.task.assignee_name)} flex items-center justify-center text-xs text-white`}
                          title={row.task.assignee_name}
                        >
                          {row.task.assignee_name.charAt(0)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              }

              // orphan
              return (
                <div
                  key={`orphan-${row.task.id}`}
                  style={{ height: ROW_H }}
                  className="flex items-center gap-2 px-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                >
                  <div className="w-4" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-neutral-400 truncate">에픽 미지정</div>
                    <div className="text-sm truncate">{row.task.title}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 오른쪽 간트 패널 ── */}
        <div className="flex-1 overflow-x-auto">
          {/* 월/일 헤더 */}
          <div className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
            <div className="flex">
              {monthHeaders.map((m, i) => (
                <div
                  key={i}
                  className="border-r border-neutral-200 px-3 py-2 text-xs text-neutral-600 font-medium"
                  style={{ width: m.days * DAY_W }}
                >
                  {m.label}
                </div>
              ))}
            </div>
            <div className="flex border-t border-neutral-200">
              {dateRange.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={i}
                    style={{ width: DAY_W }}
                    className={`border-r border-neutral-100 py-1.5 text-center text-xs shrink-0
                      ${isToday ? 'bg-blue-50 text-blue-600 font-bold' : isWeekend ? 'text-neutral-400' : 'text-neutral-500'}`}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 간트 바 영역 */}
          <div
            className="relative overflow-y-auto max-h-[calc(100vh-280px)]"
            style={{ minWidth: dateRange.length * DAY_W }}
          >
            {/* 오늘 세로선 */}
            {todayOffset >= 0 && todayOffset < dateRange.length && (
              <div
                className="absolute top-0 bottom-0 w-px bg-blue-400 z-10 pointer-events-none"
                style={{ left: todayOffset * DAY_W + DAY_W / 2 }}
              />
            )}

            {/* 주말 음영 */}
            {dateRange.map((d, i) => {
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return isWeekend ? (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 bg-neutral-50 pointer-events-none"
                  style={{ left: i * DAY_W, width: DAY_W }}
                />
              ) : null;
            })}

            {/* 행별 간트 바 */}
            {rows.map((row) => {
              if (row.kind === 'epic') {
                const color = EPIC_COLORS[row.idx % EPIC_COLORS.length];
                const pos = epicBarPosition(row.epic, firstDay);
                return (
                  <div
                    key={`epic-${row.epic.id}`}
                    style={{ height: ROW_H }}
                    className="relative border-b border-neutral-100 bg-neutral-50"
                  >
                    {pos && (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 h-4 rounded ${color} opacity-40`}
                        style={{ left: pos.left, width: pos.width }}
                        title={`${row.epic.title} (${row.epic.start_date} ~ ${row.epic.end_date})`}
                      >
                        {/* 진행률 오버레이 */}
                        <div
                          className={`h-full rounded ${color} opacity-100`}
                          style={{ width: `${row.epic.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              }

              if (row.kind === 'task') {
                const pos = barPosition(row.task.startDate, row.task.dueDate, firstDay);
                const color = STATUS_COLOR[row.task.status];
                return (
                  <div
                    key={`task-${row.task.id}`}
                    style={{ height: ROW_H }}
                    className="relative border-b border-neutral-100"
                  >
                    {pos && (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 h-7 rounded ${color} flex items-center px-2 cursor-pointer group hover:opacity-90 transition-opacity`}
                        style={{ left: pos.left, width: pos.width }}
                        title={`${row.task.title}\n${row.task.startDate} ~ ${row.task.dueDate}`}
                      >
                        <span className="text-xs text-white truncate flex-1">{row.task.title}</span>
                        <button
                          onClick={() => deleteTask(row.task.id)}
                          className="shrink-0 p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/20 rounded transition-opacity"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              // nodate / orphan → 빈 행
              return (
                <div
                  key={`empty-${row.kind === 'orphan' ? 'o' : 'n'}-${row.task.id}`}
                  style={{ height: ROW_H }}
                  className="relative border-b border-neutral-100"
                >
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-300">
                    날짜 없음
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
