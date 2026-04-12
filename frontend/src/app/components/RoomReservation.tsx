import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Users, X, Trash2, AlertCircle, Loader2, CalendarCheck } from 'lucide-react';
import { schoolApi, SchoolRoom, SchoolReservation, memberApi, ProjectMember } from '../../lib/api';

type RoomTab = 'timetable' | 'my';

export function RoomReservation({ projectId }: { projectId?: number }) {
  const [activeTab, setActiveTab] = useState<RoomTab>('timetable');
  const [myReservations, setMyReservations] = useState<SchoolReservation[]>([]);
  const [myResLoading, setMyResLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [rooms, setRooms] = useState<SchoolRoom[]>([]);
  const [reservations, setReservations] = useState<SchoolReservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<SchoolReservation | null>(null);
  const [preselect, setPreselect] = useState<{ roomId: number; startTime: string; endTime: string } | null>(null);
  const [hoverSlot, setHoverSlot] = useState<{ roomId: number; hour: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const dragMoved = useRef(false);

  const onDragStart = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragMoved.current = false;
    dragStartX.current = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
    dragScrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
  };
  const onDragMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const moved = Math.abs(x - dragStartX.current);
    if (moved > 4) dragMoved.current = true;
    scrollRef.current.scrollLeft = dragScrollLeft.current - (x - dragStartX.current);
  };
  const onDragEnd = () => { isDragging.current = false; };

  const HOUR_WIDTH = 120;
  const START_HOUR = 9;
  const END_HOUR = 24;

  const loadData = useCallback(async (date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const roomsRes = await schoolApi.listRooms();
      setRooms(roomsRes.data);
      const all = await Promise.all(
        roomsRes.data.map(r =>
          schoolApi.listReservations(r.id, date).then(res => res.data).catch(() => [] as SchoolReservation[])
        )
      );
      setReservations(all.flat());
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || '데이터 로드 실패');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  useEffect(() => {
    if (activeTab !== 'my') return;
    setMyResLoading(true);
    schoolApi.myReservations()
      .then(r => setMyReservations(r.data))
      .catch(() => setMyReservations([]))
      .finally(() => setMyResLoading(false));
  }, [activeTab]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const handleAddReservation = async (data: { roomId: number; start_at: string; end_at: string; purpose: string; attendee_emails: string[] }) => {
    try {
      const room = rooms.find(r => r.id === data.roomId);
      await schoolApi.createReservation(data.roomId, {
        start_at: data.start_at,
        end_at: data.end_at,
        purpose: data.purpose,
        attendee_emails: data.attendee_emails,
        room_name: room?.name,
        room_location: room?.location,
      });
      await loadData(selectedDate);
      setShowAddModal(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      alert(err?.response?.data?.detail || '예약 실패');
    }
  };

  const handleDeleteReservation = async (reservation: SchoolReservation) => {
    if (!reservation.can_cancel) {
      alert('본인이 예약한 건만 취소할 수 있습니다.');
      return;
    }
    try {
      await schoolApi.deleteReservation(reservation.id);
      await loadData(selectedDate);
      setSelectedReservation(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      alert(err?.response?.data?.detail || '예약 취소 실패');
    }
  };

  const handleCancelReservation = async (reservation: SchoolReservation) => {
    if (!window.confirm('예약을 취소하시겠습니까?')) return;
    try {
      await schoolApi.deleteReservation(reservation.id);
      setMyReservations(prev => prev.filter(r => r.id !== reservation.id));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      alert(err?.response?.data?.detail || '예약 취소 실패');
    }
  };

  const timeSlots = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

  const getReservationsForRoom = (roomId: number) =>
    reservations.filter(r => r.meeting_room_id === roomId && r.start_at.startsWith(selectedDate));

  const getPosition = (start_at: string, end_at: string) => {
    const s = new Date(start_at);
    const e = new Date(end_at);
    const startPos = (s.getHours() - START_HOUR) * HOUR_WIDTH + (s.getMinutes() / 60) * HOUR_WIDTH;
    const endPos = (e.getHours() - START_HOUR) * HOUR_WIDTH + (e.getMinutes() / 60) * HOUR_WIDTH;
    return { left: startPos, width: endPos - startPos };
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleTimeSlotClick = (e: React.MouseEvent<HTMLDivElement>, room: SchoolRoom) => {
    if (dragMoved.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
    const x = e.clientX - rect.left + scrollLeft;
    const clickedHour = Math.floor(x / HOUR_WIDTH) + START_HOUR;
    const startH = Math.min(Math.max(clickedHour, START_HOUR), END_HOUR - 1);
    const endH = Math.min(startH + 1, END_HOUR);
    setPreselect({
      roomId: room.id,
      startTime: `${String(startH).padStart(2, '0')}:00`,
      endTime: `${String(endH).padStart(2, '0')}:00`,
    });
    setShowAddModal(true);
  };


  return (
    <div className="bg-white rounded-lg border border-neutral-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center gap-4">
          <h2 className="text-lg">회의실 예약</h2>
          {/* 탭 */}
          <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('timetable')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'timetable' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              타임테이블
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'my' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              내 예약
            </button>
          </div>
          {activeTab === 'timetable' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-1.5 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          )}
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={rooms.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded text-sm hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          예약 추가
        </button>
      </div>

      {/* 내 예약 탭 */}
      {activeTab === 'my' && (
        <div className="p-6">
          {myResLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
          ) : myReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <CalendarCheck className="w-10 h-10 mb-3 text-neutral-300" />
              <p className="text-sm">예정된 예약이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myReservations.map(r => {
                const start = new Date(r.start_at);
                const end = new Date(r.end_at);
                const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                const dateStr = start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
                return (
                  <div key={r.id} className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{dateStr}</p>
                      <p className="text-sm text-neutral-600">{fmt(start)} – {fmt(end)}</p>
                      {r.purpose && <p className="text-xs text-neutral-500 mt-0.5">{r.purpose}</p>}
                    </div>
                    {r.can_cancel && (
                      <button
                        onClick={() => handleCancelReservation(r)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        취소
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'timetable' && (<>

      {error && (
        <div className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 text-sm border-b border-red-100">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {rooms.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <p className="text-sm">회의실 정보를 불러오는 중...</p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="overflow-x-auto cursor-grab active:cursor-grabbing select-none"
          onMouseDown={onDragStart}
          onMouseMove={onDragMove}
          onMouseUp={onDragEnd}
          onMouseLeave={onDragEnd}
        >
          <div className="flex">
            <div className="w-48 border-r border-neutral-200 flex-shrink-0 sticky left-0 z-10 bg-white">
              <div className="h-12 border-b border-neutral-200 flex items-center px-4 bg-neutral-50">
                <span className="text-xs text-neutral-600 font-medium">회의실</span>
              </div>
              {rooms.map(room => (
                <div key={room.id} className="h-24 border-b border-neutral-200 px-4 py-3">
                  <div className="font-medium text-sm mb-1">{room.name}</div>
                  {room.location && (
                    <div className="flex items-center gap-1 text-xs text-neutral-500 mb-1">
                      <Users className="w-3 h-3" />
                      <span>{room.location}</span>
                    </div>
                  )}
                  {room.description && (
                    <div className="text-xs text-neutral-400 truncate">{room.description}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex-1 relative">
              <div className="flex border-b border-neutral-200 bg-neutral-50">
                {timeSlots.map(hour => (
                  <div key={hour} className="w-[120px] h-12 border-r border-neutral-200 flex items-center justify-center text-xs text-neutral-600">
                    {hour}:00
                  </div>
                ))}
              </div>

              {rooms.map(room => {
                const roomReservations = getReservationsForRoom(room.id);
                return (
                  <div key={room.id} className="h-24 border-b border-neutral-200 relative cursor-pointer"
                    onClick={(e) => handleTimeSlotClick(e, room)}
                    onMouseMove={(e) => {
                      if (dragMoved.current || isDragging.current) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
                      const hour = Math.floor(x / HOUR_WIDTH) + START_HOUR;
                      setHoverSlot({ roomId: room.id, hour: Math.min(Math.max(hour, START_HOUR), END_HOUR - 1) });
                    }}
                    onMouseLeave={() => setHoverSlot(null)}
                  >
                    {timeSlots.map(hour => (
                      <div key={hour} className="absolute w-[120px] h-full border-r border-neutral-100" style={{ left: `${(hour - START_HOUR) * HOUR_WIDTH}px` }} />
                    ))}
                    {hoverSlot?.roomId === room.id && (
                      <div
                        className="absolute top-0 h-full bg-blue-100/60 pointer-events-none transition-[left] duration-75"
                        style={{ left: `${(hoverSlot.hour - START_HOUR) * HOUR_WIDTH}px`, width: `${HOUR_WIDTH}px` }}
                      />
                    )}
                    {roomReservations.map(res => {
                      const pos = getPosition(res.start_at, res.end_at);
                      return (
                        <div
                          key={res.id}
                          className="absolute top-2 bottom-2 bg-blue-500 rounded px-2 py-1 cursor-pointer hover:bg-blue-600 transition-colors"
                          style={{ left: `${pos.left}px`, width: `${Math.max(pos.width, 40)}px` }}
                          onClick={(e) => { e.stopPropagation(); setSelectedReservation(res); }}
                        >
                          <div className="text-xs text-white font-medium truncate">{res.purpose || '회의'}</div>
                          <div className="text-xs text-blue-100 truncate">{formatTime(res.start_at)} - {formatTime(res.end_at)}</div>
                          <div className="text-xs text-blue-200 truncate">{res.reserved_by_name}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showAddModal && rooms.length > 0 && (
        <AddReservationModal
          rooms={rooms}
          selectedDate={selectedDate}
          projectId={projectId}
          initialRoomId={preselect?.roomId}
          initialStartTime={preselect?.startTime}
          initialEndTime={preselect?.endTime}
          onClose={() => { setShowAddModal(false); setPreselect(null); }}
          onAdd={handleAddReservation}
        />
      )}

      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          room={rooms.find(r => r.id === selectedReservation.meeting_room_id)!}
          onClose={() => setSelectedReservation(null)}
          onDelete={() => handleDeleteReservation(selectedReservation)}
          formatTime={formatTime}
        />
      )}

    </>)}
    </div>
  );
}

interface AddReservationModalProps {
  rooms: SchoolRoom[];
  selectedDate: string;
  projectId?: number;
  initialRoomId?: number;
  initialStartTime?: string;
  initialEndTime?: string;
  onClose: () => void;
  onAdd: (data: { roomId: number; start_at: string; end_at: string; purpose: string; attendee_emails: string[] }) => Promise<void>;
}

const AVATAR_COLORS = [
  'bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400',
  'bg-purple-400', 'bg-pink-400', 'bg-indigo-400', 'bg-orange-400',
];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AddReservationModal({ rooms, selectedDate, projectId, initialRoomId, initialStartTime, initialEndTime, onClose, onAdd }: AddReservationModalProps) {
  const [formData, setFormData] = useState({
    roomId: initialRoomId ?? rooms[0]?.id ?? 0,
    purpose: '',
    startTime: initialStartTime ?? '09:00',
    endTime: initialEndTime ?? '10:00',
    date: selectedDate,
  });
  const [attendeeInput, setAttendeeInput] = useState('');
  const [attendees, setAttendees] = useState<string[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const attendeeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId) return;
    memberApi.list(projectId)
      .then(res => setMembers(res.data))
      .catch(() => setMembers([]));
  }, [projectId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (attendeeRef.current && !attendeeRef.current.contains(e.target as Node)) {
        setShowMemberDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const addAttendeeEmail = (email: string) => {
    const trimmed = email.trim();
    if (trimmed && !attendees.includes(trimmed)) {
      setAttendees(prev => [...prev, trimmed]);
    }
    setAttendeeInput('');
    setShowMemberDropdown(false);
  };

  const handleAttendeeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.nativeEvent as InputEvent).isComposing) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (attendeeInput.trim()) addAttendeeEmail(attendeeInput);
    }
  };

  const filteredMembers = members.filter(
    m => !attendees.includes(m.email) &&
      (m.name.includes(attendeeInput) || m.email.includes(attendeeInput))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.purpose) return;
    if (formData.startTime >= formData.endTime) {
      alert('종료 시간은 시작 시간보다 뒤여야 합니다.');
      return;
    }
    setIsLoading(true);
    try {
      await onAdd({
        roomId: formData.roomId,
        start_at: `${formData.date}T${formData.startTime}:00+09:00`,
        end_at: `${formData.date}T${formData.endTime}:00+09:00`,
        purpose: formData.purpose,
        attendee_emails: attendees,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg">예약 추가</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5">회의 목적 *</label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="회의 목적"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">회의실 *</label>
              <select
                value={formData.roomId}
                onChange={(e) => setFormData({ ...formData, roomId: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.name}{room.location ? ` (${room.location})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5">날짜 *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1.5">시작 시간 *</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5">종료 시간 *</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  required
                />
              </div>
            </div>
            <div ref={attendeeRef} className="relative">
              <label className="block text-sm mb-1.5">
                참석자
                <span className="text-neutral-400 font-normal ml-1">(이름 검색 또는 이메일 입력)</span>
              </label>
              {attendees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {attendees.map(email => {
                    const m = members.find(mb => mb.email === email);
                    return (
                      <span key={email} className="flex items-center gap-1 px-2 py-0.5 bg-neutral-100 rounded-full text-xs text-neutral-700">
                        {m?.picture
                          ? <img src={m.picture} alt="" className="w-4 h-4 rounded-full object-cover" />
                          : m
                            ? <span className={`w-4 h-4 rounded-full ${getAvatarColor(m.name)} flex items-center justify-center text-white text-[9px]`}>{m.name.charAt(0)}</span>
                            : null
                        }
                        {m?.name ?? email}
                        <button type="button" onClick={() => setAttendees(prev => prev.filter(e => e !== email))} className="text-neutral-400 hover:text-neutral-700">×</button>
                      </span>
                    );
                  })}
                </div>
              )}
              <input
                type="text"
                value={attendeeInput}
                onChange={(e) => { setAttendeeInput(e.target.value); setShowMemberDropdown(true); }}
                onFocus={() => setShowMemberDropdown(true)}
                onKeyDown={handleAttendeeKeyDown}
                onBlur={() => { if (attendeeInput.trim() && attendeeInput.includes('@')) addAttendeeEmail(attendeeInput); }}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="이름 검색 또는 이메일 입력"
              />
              {showMemberDropdown && filteredMembers.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg">
                  <ul className="max-h-40 overflow-y-auto py-1">
                    {filteredMembers.map(m => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); addAttendeeEmail(m.email); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50"
                        >
                          {m.picture
                            ? <img src={m.picture} alt={m.name} className="w-6 h-6 rounded-full object-cover" />
                            : <div className={`w-6 h-6 rounded-full ${getAvatarColor(m.name)} flex items-center justify-center text-white text-xs`}>{m.name.charAt(0)}</div>
                          }
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
              <p className="text-xs text-neutral-400 mt-1">구글 캘린더에 참석자 초대가 자동으로 전송됩니다.</p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-neutral-300 rounded hover:bg-neutral-50 transition-colors">
              취소
            </button>
            <button type="submit" disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-50">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ReservationDetailModalProps {
  reservation: SchoolReservation;
  room: SchoolRoom | undefined;
  onClose: () => void;
  onDelete: () => void;
  formatTime: (iso: string) => string;
}

function ReservationDetailModal({ reservation, room, onClose, onDelete, formatTime }: ReservationDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg">{reservation.purpose || '회의'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {room && (
            <div>
              <label className="block text-sm text-neutral-600 mb-1">회의실</label>
              <div className="text-sm font-medium">{room.name}</div>
              {room.location && <div className="text-xs text-neutral-500 mt-0.5">{room.location}</div>}
            </div>
          )}
          <div>
            <label className="block text-sm text-neutral-600 mb-1">일시</label>
            <div className="text-sm">{reservation.start_at.split('T')[0]}</div>
            <div className="text-sm text-neutral-500">{formatTime(reservation.start_at)} - {formatTime(reservation.end_at)}</div>
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">예약자</label>
            <div className="text-sm">{reservation.reserved_by_name}</div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-neutral-200 flex gap-3">
          {reservation.can_cancel && (
            <button
              onClick={onDelete}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              취소
            </button>
          )}
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
