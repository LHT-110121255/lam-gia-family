import React, { useState } from 'react';
import { CalendarEvent, EventType, FamilyMember } from '../../types';
import { getLunarDisplay, formatVietnameseDate } from '../../utils/lunarCalendar';
import { Avatar } from '../common/Avatar';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Trash2,
  Tag,
  Bell,
  Sparkles,
  Repeat,
} from 'lucide-react';
import { BottomSheet } from '../common/BottomSheet';
import { LocationInput } from '../common/LocationInput';

interface CalendarScreenProps {
  events: CalendarEvent[];
  allMembers: FamilyMember[];
  currentMember?: FamilyMember;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onDeleteEvent: (eventId: string) => void;
  onOpenEventDetailDirect?: CalendarEvent | null;
  onCloseEventDetailDirect?: () => void;
}

const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  birthday: { label: 'Sinh nhật', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  anniversary: { label: 'Giỗ / Tưởng nhớ', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-600' },
  health: { label: 'Khám bệnh', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-600' },
  study: { label: 'Học tập', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  chore: { label: 'Việc gia đình', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  trip: { label: 'Du lịch / Nghỉ ngơi', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
  holiday: { label: 'Lễ Tết', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  other: { label: 'Khác', bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200', dot: 'bg-stone-500' },
};

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  events,
  allMembers,
  currentMember,
  onAddEvent,
  onDeleteEvent,
  onOpenEventDetailDirect,
  onCloseEventDetailDirect,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Auto open detail if requested from outside
  React.useEffect(() => {
    if (onOpenEventDetailDirect) {
      setSelectedEvent(onOpenEventDetailDirect);
    }
  }, [onOpenEventDetailDirect]);

  // Form State for new event
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<EventType>('chore');
  const [formDate, setFormDate] = useState(selectedDayStr);
  const [formTime, setFormTime] = useState('18:00');
  const [formLocation, setFormLocation] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formParticipants, setFormParticipants] = useState<string[]>(['member-trung', 'member-tri', 'member-gam']);
  const [formIsAnnualRecurring, setFormIsAnnualRecurring] = useState(false);
  const [formCreatedById, setFormCreatedById] = useState<string>(
    currentMember?.id || allMembers[0]?.id || 'member-trung'
  );

  // Sync creator when currentMember changes
  React.useEffect(() => {
    if (currentMember?.id) {
      setFormCreatedById(currentMember.id);
    }
  }, [currentMember]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  // Days in month calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  // Adjust for Monday-first: Monday = 0, Sunday = 6
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Helper function to check if event matches a specific date (including yearly recurring)
  const isEventOnDate = (e: CalendarEvent, dateStr: string) => {
    if (e.date === dateStr) return true;
    if (e.isAnnualRecurring) {
      // Compare Month-Day
      const eMonthDay = e.date.substring(5); // MM-DD
      const targetMonthDay = dateStr.substring(5); // MM-DD
      return eMonthDay === targetMonthDay;
    }
    return false;
  };

  const selectedDayEvents = events.filter((e) => isEventOnDate(e, selectedDayStr));

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const lunar = getLunarDisplay(new Date(formDate));
    const creator = allMembers.find((m) => m.id === formCreatedById) || currentMember;

    onAddEvent({
      title: formTitle,
      type: formType,
      date: formDate,
      lunarDateText: `${lunar.day < 10 ? '0' + lunar.day : lunar.day}/${lunar.month} Âm lịch`,
      time: formTime,
      location: formLocation,
      participantIds: formParticipants,
      note: formNote,
      isAnnualRecurring: formIsAnnualRecurring,
      createdById: creator?.id,
      createdByName: creator?.name,
      createdByAvatar: creator?.avatar,
    });

    setShowCreateSheet(false);
    setFormTitle('');
    setFormLocation('');
    setFormNote('');
    setFormIsAnnualRecurring(false);
  };

  return (
    <div className="space-y-4 pb-20 w-full max-w-full px-4 pt-2">
      {/* 1. Month Header & Navigation */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Tháng {month + 1}, {year}
            </h2>
            <p className="text-[11px] text-stone-500 font-medium">
              Năm Bính Ngọ • Lịch Âm Dương Song Hành
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 transition"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const today = new Date();
                setCurrentDate(today);
                setSelectedDayStr(today.toISOString().split('T')[0]);
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition"
            >
              Hôm nay
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 transition"
              aria-label="Tháng sau"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center text-[11px] font-bold text-stone-500 mb-2">
          <span>T2</span>
          <span>T3</span>
          <span>T4</span>
          <span>T5</span>
          <span>T6</span>
          <span>T7</span>
          <span className="text-orange-600">CN</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {/* Empty cells before start */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12" />
          ))}

          {/* Month Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateObj = new Date(year, month, dayNum);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isSelected = dateStr === selectedDayStr;
            const isToday = dateStr === '2026-09-15';
            const lunar = getLunarDisplay(dateObj);
            const dayEvents = events.filter((e) => e.date === dateStr);

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDayStr(dateStr)}
                className={`h-12 rounded-xl flex flex-col items-center justify-center p-0.5 relative transition active:scale-95 ${
                  isSelected
                    ? 'bg-orange-600 text-white font-bold shadow-xs'
                    : isToday
                    ? 'bg-orange-50 text-orange-950 font-bold border border-orange-200'
                    : 'hover:bg-stone-50 text-stone-800'
                }`}
              >
                {/* Solar day number */}
                <span className="text-xs leading-none">{dayNum}</span>

                {/* Lunar day representation */}
                <span
                  className={`text-[9px] mt-0.5 leading-none ${
                    isSelected
                      ? 'text-orange-100'
                      : lunar.isAuspicious
                      ? 'text-red-500 font-bold'
                      : 'text-stone-600'
                  }`}
                >
                  {lunar.day === 1 ? `${lunar.day}/${lunar.month}` : lunar.day}
                </span>

                {/* Event dots */}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className={`w-1 h-1 rounded-full ${
                          isSelected ? 'bg-white' : EVENT_TYPE_CONFIG[ev.type].dot
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selected Day Agenda & Events */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              {formatVietnameseDate(selectedDayStr)}
            </h3>
            <p className="text-[11px] text-stone-500">
              {getLunarDisplay(new Date(selectedDayStr)).text}
            </p>
          </div>
          <button
            onClick={() => {
              setFormDate(selectedDayStr);
              setShowCreateSheet(true);
            }}
            className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm việc</span>
          </button>
        </div>

        {selectedDayEvents.length > 0 ? (
          <div className="space-y-2.5">
            {selectedDayEvents.map((ev) => {
              const cfg = EVENT_TYPE_CONFIG[ev.type];
              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className={`p-3.5 rounded-2xl bg-white border ${cfg.border} shadow-xs cursor-pointer hover:bg-stone-50/80 transition active:scale-99`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text}`}
                        >
                          {cfg.label}
                        </span>
                        {ev.isAnnualRecurring && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                            <Repeat className="w-3 h-3 text-amber-700" />
                            Lặp lại hàng năm
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-stone-900">{ev.title}</h4>
                    </div>
                    {ev.time && (
                      <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md shrink-0">
                        {ev.time}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2.5 pt-2 border-t border-stone-100">
                    <div className="flex items-center gap-3">
                      {ev.location && (
                        <span className="flex items-center gap-1 truncate max-w-[140px]">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          {ev.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-stone-400" />
                        {ev.participantIds.length} người
                      </span>
                    </div>

                    {ev.createdByName && (
                      <div className="flex items-center gap-1 text-[10px] text-orange-950 font-medium bg-orange-50/80 px-2 py-0.5 rounded-md border border-orange-200/60">
                        <span>Tạo bởi:</span>
                        <span className="font-bold text-orange-700">{ev.createdByName}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-white rounded-3xl border border-stone-200/70 text-center space-y-1">
            <p className="text-xs text-stone-500">Ngày này chưa có lịch trình hay sự kiện nào.</p>
            <button
              onClick={() => {
                setFormDate(selectedDayStr);
                setShowCreateSheet(true);
              }}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 pt-1"
            >
              + Thêm sự kiện hoặc giỗ chạp
            </button>
          </div>
        )}
      </div>

      {/* 3. Event Detail BottomSheet */}
      <BottomSheet
        isOpen={!!selectedEvent}
        onClose={() => {
          setSelectedEvent(null);
          if (onCloseEventDetailDirect) onCloseEventDetailDirect();
        }}
        title="Chi tiết sự kiện gia đình"
      >
        {selectedEvent && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      EVENT_TYPE_CONFIG[selectedEvent.type].bg
                    } ${EVENT_TYPE_CONFIG[selectedEvent.type].text}`}
                  >
                    {EVENT_TYPE_CONFIG[selectedEvent.type].label}
                  </span>
                  {selectedEvent.isAnnualRecurring && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                      <Repeat className="w-3 h-3 text-amber-700" />
                      Lặp lại hàng năm
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => {
                  onDeleteEvent(selectedEvent.id);
                  setSelectedEvent(null);
                  if (onCloseEventDetailDirect) onCloseEventDetailDirect();
                }}
                className="p-2 text-stone-400 hover:text-red-600 rounded-lg"
                title="Xoá sự kiện"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Event Creator Info Box */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar
                  src={selectedEvent.createdByAvatar || ''}
                  name={selectedEvent.createdByName || 'Thành viên'}
                  size="sm"
                />
                <div>
                  <span className="text-[10px] text-stone-500 font-medium block">Người tạo lịch trình:</span>
                  <span className="font-bold text-stone-900 text-xs">
                    {selectedEvent.createdByName || 'Thành viên gia đình'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200/60">
                Chủ trì
              </span>
            </div>

            <div className="space-y-2.5 text-stone-700">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-orange-600" />
                <span className="font-semibold">{formatVietnameseDate(selectedEvent.date)}</span>
                <span className="text-stone-500">({selectedEvent.lunarDateText})</span>
              </div>

              {selectedEvent.time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-stone-400" />
                  <span>Thời gian: {selectedEvent.time}</span>
                </div>
              )}

              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-stone-400" />
                  <span>Địa điểm: {selectedEvent.location}</span>
                </div>
              )}
            </div>

            {selectedEvent.note && (
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100 space-y-1">
                <span className="font-bold text-amber-900 block">Lời dặn gia đình:</span>
                <p className="text-stone-700 leading-relaxed">{selectedEvent.note}</p>
              </div>
            )}

            {/* Participants */}
            <div>
              <span className="font-bold text-stone-900 block mb-2">Thành viên tham gia:</span>
              <div className="flex flex-wrap gap-2">
                {selectedEvent.participantIds.map((id) => {
                  const m = allMembers.find((mem) => mem.id === id);
                  return m ? (
                    <div
                      key={id}
                      className="flex items-center gap-1.5 bg-stone-100 px-2 py-1 rounded-full text-stone-800"
                    >
                      <Avatar src={m.avatar} name={m.name} size="xs" />
                      <span className="text-[11px] font-medium">{m.name}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 4. Create Event BottomSheet */}
      <BottomSheet
        isOpen={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        title="Thêm sự kiện hoặc giỗ chạp"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
          {/* Creator Selection Dropdown */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
            <label className="font-bold text-stone-800 block mb-1.5">
              Người tạo sự kiện *
            </label>
            <select
              value={formCreatedById}
              onChange={(e) => setFormCreatedById(e.target.value)}
              className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-stone-800 text-xs font-medium focus:border-orange-500 shadow-2xs"
            >
              {allMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.relationship})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Tên sự kiện / Lịch trình *</label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="VD: Ngày giỗ Cụ Cố, Cơm sum họp cuối tuần..."
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-orange-500 focus:bg-white text-stone-900 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-stone-800 block mb-1">Loại sự kiện</label>
              <select
                value={formType}
                onChange={(e) => {
                  const val = e.target.value as EventType;
                  setFormType(val);
                  if (val === 'anniversary' || val === 'birthday' || val === 'holiday') {
                    setFormIsAnnualRecurring(true);
                  }
                }}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-xs"
              >
                <option value="anniversary">Giỗ chạp / Tưởng nhớ</option>
                <option value="birthday">Sinh nhật thành viên</option>
                <option value="holiday">Lễ Tết / Cúng rằm / Mùng 1</option>
                <option value="chore">Việc nhà / Gia đình</option>
                <option value="health">Khám bệnh & Sức khỏe</option>
                <option value="trip">Du lịch & Sum vầy</option>
                <option value="study">Học tập & Công việc</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-stone-800 block mb-1">Giờ (tuỳ chọn)</label>
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Ngày diễn ra (Dương lịch)</label>
            <input
              type="date"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-xs font-mono"
            />
            <p className="text-[10px] text-stone-500 mt-1">
              Âm lịch tương ứng: {getLunarDisplay(new Date(formDate)).text}
            </p>
          </div>

          {/* Turn ON/OFF Recurring Yearly */}
          <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                <Repeat className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-stone-900 block text-xs">Lặp lại hàng năm</span>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  Tự động nhắc lại vào ngày này qua các năm (thích hợp cho ngày giỗ, ngày sinh, lễ tưởng nhớ).
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={formIsAnnualRecurring}
                onChange={(e) => setFormIsAnnualRecurring(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          {/* Event Location with Map & Autocomplete */}
          <LocationInput
            label="Địa điểm diễn ra"
            value={formLocation}
            onChange={(val) => setFormLocation(val)}
            placeholder="VD: Nhà chính Tiểu Cần, Nhà thờ Tổ..."
          />

          <div>
            <label className="font-bold text-stone-800 block mb-1">Ghi chú dặn dò</label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Chuẩn bị lễ vật, mâm cúng, phân công người mua đồ..."
              rows={2}
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Lưu sự kiện gia đình</span>
          </button>
        </form>
      </BottomSheet>
    </div>
  );
};
