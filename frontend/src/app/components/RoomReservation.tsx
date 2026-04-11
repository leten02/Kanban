import { useState } from 'react';
import { Room, Reservation } from '../App';
import { Plus, Users, Monitor, X, Trash2 } from 'lucide-react';

interface RoomReservationProps {
  rooms: Room[];
  reservations: Reservation[];
  onAddReservation: (reservation: Omit<Reservation, 'id'>) => void;
  onDeleteReservation: (reservationId: string) => void;
}

export function RoomReservation({ rooms, reservations, onAddReservation, onDeleteReservation }: RoomReservationProps) {
  const [selectedDate, setSelectedDate] = useState('2026-04-11');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const timeSlots = Array.from({ length: 10 }, (_, i) => i + 9);

  const getReservationsForRoom = (roomId: string, date: string) => {
    return reservations.filter(res => res.roomId === roomId && res.date === date);
  };

  const getReservationPosition = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startPos = (startHour - 9) * 120 + (startMin / 60) * 120;
    const endPos = (endHour - 9) * 120 + (endMin / 60) * 120;

    return {
      left: startPos,
      width: endPos - startPos
    };
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-amber-500',
      'bg-cyan-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name.charAt(0);
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center gap-4">
          <h2 className="text-lg">회의실 예약</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded text-sm hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          예약 추가
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="flex">
          <div className="w-48 border-r border-neutral-200 flex-shrink-0">
            <div className="h-12 border-b border-neutral-200 flex items-center px-4 bg-neutral-50">
              <span className="text-xs text-neutral-600 font-medium">회의실</span>
            </div>
            {rooms.map(room => (
              <div key={room.id} className="h-24 border-b border-neutral-200 px-4 py-3">
                <div className="font-medium text-sm mb-1">{room.name}</div>
                <div className="flex items-center gap-1 text-xs text-neutral-500 mb-1">
                  <Users className="w-3 h-3" />
                  <span>{room.capacity}명</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {room.equipment.slice(0, 2).map(eq => (
                    <span key={eq} className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                      {eq}
                    </span>
                  ))}
                </div>
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
              const roomReservations = getReservationsForRoom(room.id, selectedDate);
              return (
                <div key={room.id} className="h-24 border-b border-neutral-200 relative">
                  {timeSlots.map(hour => (
                    <div key={hour} className="absolute w-[120px] h-full border-r border-neutral-100" style={{ left: `${(hour - 9) * 120}px` }} />
                  ))}

                  {roomReservations.map(reservation => {
                    const position = getReservationPosition(reservation.startTime, reservation.endTime);
                    return (
                      <div
                        key={reservation.id}
                        className="absolute top-2 bottom-2 bg-blue-500 rounded px-2 py-1 cursor-pointer hover:bg-blue-600 transition-colors group"
                        style={{
                          left: `${position.left}px`,
                          width: `${position.width}px`
                        }}
                        onClick={() => setSelectedReservation(reservation)}
                      >
                        <div className="text-xs text-white font-medium truncate">{reservation.title}</div>
                        <div className="text-xs text-blue-100 truncate">{reservation.startTime} - {reservation.endTime}</div>
                        <div className="flex gap-0.5 mt-1">
                          {reservation.attendees.slice(0, 3).map((attendee, idx) => (
                            <div
                              key={idx}
                              className={`w-4 h-4 rounded-full ${getAvatarColor(attendee)} flex items-center justify-center text-[9px] text-white`}
                              title={attendee}
                            >
                              {getInitials(attendee)}
                            </div>
                          ))}
                          {reservation.attendees.length > 3 && (
                            <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[9px] text-white">
                              +{reservation.attendees.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddReservationModal
          rooms={rooms}
          selectedDate={selectedDate}
          onClose={() => setShowAddModal(false)}
          onAdd={onAddReservation}
        />
      )}

      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          room={rooms.find(r => r.id === selectedReservation.roomId)!}
          onClose={() => setSelectedReservation(null)}
          onDelete={() => {
            onDeleteReservation(selectedReservation.id);
            setSelectedReservation(null);
          }}
        />
      )}
    </div>
  );
}

interface AddReservationModalProps {
  rooms: Room[];
  selectedDate: string;
  onClose: () => void;
  onAdd: (reservation: Omit<Reservation, 'id'>) => void;
}

function AddReservationModal({ rooms, selectedDate, onClose, onAdd }: AddReservationModalProps) {
  const [formData, setFormData] = useState({
    roomId: rooms[0].id,
    title: '',
    organizer: '',
    attendees: '',
    startTime: '09:00',
    endTime: '10:00',
    date: selectedDate
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.organizer) return;

    onAdd({
      roomId: formData.roomId,
      title: formData.title,
      organizer: formData.organizer,
      attendees: formData.attendees.split(',').map(a => a.trim()).filter(a => a),
      startTime: formData.startTime,
      endTime: formData.endTime,
      date: formData.date
    });

    onClose();
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
              <label className="block text-sm mb-1.5">회의 제목 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="회의 제목"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1.5">회의실 *</label>
              <select
                value={formData.roomId}
                onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1.5">주최자 *</label>
              <input
                type="text"
                value={formData.organizer}
                onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="주최자 이름"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1.5">참석자</label>
              <input
                type="text"
                value={formData.attendees}
                onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="쉼표로 구분 (예: 김개발, 이디자인)"
              />
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
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ReservationDetailModalProps {
  reservation: Reservation;
  room: Room;
  onClose: () => void;
  onDelete: () => void;
}

function ReservationDetailModal({ reservation, room, onClose, onDelete }: ReservationDetailModalProps) {
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-amber-500',
      'bg-cyan-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name.charAt(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg">{reservation.title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-neutral-600 mb-1">회의실</label>
            <div className="text-sm font-medium">{room.name}</div>
            <div className="flex items-center gap-1 text-xs text-neutral-500 mt-1">
              <Users className="w-3 h-3" />
              <span>{room.capacity}명</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1">일시</label>
            <div className="text-sm">{reservation.date}</div>
            <div className="text-sm text-neutral-500">{reservation.startTime} - {reservation.endTime}</div>
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1">주최자</label>
            <div className="text-sm">{reservation.organizer}</div>
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-2">참석자 ({reservation.attendees.length})</label>
            <div className="space-y-2">
              {reservation.attendees.map((attendee, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${getAvatarColor(attendee)} flex items-center justify-center text-xs text-white`}>
                    {getInitials(attendee)}
                  </div>
                  <span className="text-sm">{attendee}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1">장비</label>
            <div className="flex flex-wrap gap-1">
              {room.equipment.map(eq => (
                <span key={eq} className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded">
                  {eq}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 flex gap-3">
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
