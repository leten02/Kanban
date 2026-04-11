import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, X, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { schoolApi, SchoolRoom, SchoolReservation } from '../../lib/api';

export function RoomReservation() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [rooms, setRooms] = useState<SchoolRoom[]>([]);
  const [reservations, setReservations] = useState<SchoolReservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<SchoolReservation | null>(null);

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

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const handleAddReservation = async (data: { roomId: number; start_at: string; end_at: string; purpose: string }) => {
    try {
      await schoolApi.createReservation(data.roomId, {
        start_at: data.start_at,
        end_at: data.end_at,
        purpose: data.purpose,
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

  const START_HOUR = 9;
  const END_HOUR = 24;
  const timeSlots = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

  const getReservationsForRoom = (roomId: number) =>
    reservations.filter(r => r.meeting_room_id === roomId && r.start_at.startsWith(selectedDate));

  const getPosition = (start_at: string, end_at: string) => {
    const s = new Date(start_at);
    const e = new Date(end_at);
    const startPos = (s.getHours() - START_HOUR) * 120 + (s.getMinutes() / 60) * 120;
    const endPos = (e.getHours() - START_HOUR) * 120 + (e.getMinutes() / 60) * 120;
    return { left: startPos, width: endPos - startPos };
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };


  return (
    <div className="bg-white rounded-lg border border-neutral-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center gap-4">
          <h2 className="text-lg">회의실 예약</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="px-3 py-1.5 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
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
        <div className="overflow-x-auto">
          <div className="flex">
            <div className="w-48 border-r border-neutral-200 flex-shrink-0">
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
                  <div key={room.id} className="h-24 border-b border-neutral-200 relative">
                    {timeSlots.map(hour => (
                      <div key={hour} className="absolute w-[120px] h-full border-r border-neutral-100" style={{ left: `${(hour - START_HOUR) * 120}px` }} />
                    ))}
                    {roomReservations.map(res => {
                      const pos = getPosition(res.start_at, res.end_at);
                      return (
                        <div
                          key={res.id}
                          className="absolute top-2 bottom-2 bg-blue-500 rounded px-2 py-1 cursor-pointer hover:bg-blue-600 transition-colors"
                          style={{ left: `${pos.left}px`, width: `${Math.max(pos.width, 40)}px` }}
                          onClick={() => setSelectedReservation(res)}
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
          onClose={() => setShowAddModal(false)}
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
    </div>
  );
}

interface AddReservationModalProps {
  rooms: SchoolRoom[];
  selectedDate: string;
  onClose: () => void;
  onAdd: (data: { roomId: number; start_at: string; end_at: string; purpose: string }) => Promise<void>;
}

function AddReservationModal({ rooms, selectedDate, onClose, onAdd }: AddReservationModalProps) {
  const [formData, setFormData] = useState({
    roomId: rooms[0]?.id ?? 0,
    purpose: '',
    startTime: '09:00',
    endTime: '10:00',
    date: selectedDate,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.purpose) return;
    setIsLoading(true);
    try {
      await onAdd({
        roomId: formData.roomId,
        start_at: `${formData.date}T${formData.startTime}:00`,
        end_at: `${formData.date}T${formData.endTime}:00`,
        purpose: formData.purpose,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
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
