import React from 'react';
import {
  FamilyInfo,
  FamilyMember,
  CalendarEvent,
  SharedTaskList,
  FamilyPost,
  OnThisDayItem,
} from '../../types';
import { Avatar } from '../common/Avatar';
import { formatVietnameseDate, getLunarDisplay } from '../../utils/lunarCalendar';
import {
  Sun,
  Calendar,
  Gift,
  CheckCircle2,
  Circle,
  ArrowRight,
  Heart,
  Camera,
  Sparkles,
  MapPin,
  Clock,
} from 'lucide-react';

interface HomeScreenProps {
  familyInfo: FamilyInfo;
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  events: CalendarEvent[];
  tasks: SharedTaskList[];
  posts: FamilyPost[];
  onThisDay: OnThisDayItem;
  onNavigateTab: (tab: 'family' | 'memories' | 'calendar' | 'more') => void;
  onOpenMemberProfile: (memberId: string) => void;
  onOpenEventDetail: (event: CalendarEvent) => void;
  onToggleTaskItem: (listId: string, itemId: string) => void;
  onOpenCreatePost: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  familyInfo,
  currentMember,
  allMembers,
  events,
  tasks,
  posts,
  onThisDay,
  onNavigateTab,
  onOpenMemberProfile,
  onOpenEventDetail,
  onToggleTaskItem,
  onOpenCreatePost,
}) => {
  // Determine time-of-day greeting
  const now = new Date();
  const hour = now.getHours();
  let greetingTime = 'Sáng an lành';
  if (hour >= 11 && hour < 14) greetingTime = 'Trưa ấm áp';
  else if (hour >= 14 && hour < 18) greetingTime = 'Chiều bình yên';
  else if (hour >= 18 || hour < 5) greetingTime = 'Tối sum vầy';

  const solarDateStr = formatVietnameseDate(now.toISOString());
  const lunarInfo = getLunarDisplay(now);

  // Today's events
  const todayDateStr = now.toISOString().split('T')[0];
  const todayEvents = events.filter((e) => e.date === todayDateStr);
  const upcomingEvents = events.filter((e) => e.date > todayDateStr).slice(0, 2);

  // Next birthday: Bà Mai (20/09)
  const birthdayEvent = events.find((e) => e.type === 'birthday');

  // Pending tasks summary
  const pendingTasksList: { listId: string; item: any }[] = [];
  tasks.forEach((list) => {
    list.items
      .filter((i) => !i.completed)
      .forEach((item) => {
        if (pendingTasksList.length < 3) {
          pendingTasksList.push({ listId: list.id, item });
        }
      });
  });

  return (
    <div className="space-y-4 pb-20 w-full max-w-full px-4 pt-2">
      {/* 1. Warm Greeting & Daily Weather / Lunar Bar */}
      <section className="bg-linear-to-br from-orange-50 via-amber-50 to-stone-50 rounded-3xl p-4 border border-orange-100/90 shadow-xs relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100/80 text-orange-900 text-[11px] font-semibold">
              <Sun className="w-3.5 h-3.5 text-amber-600 animate-spin-slow" />
              Hà Nội 28°C • Trời thu dịu mát
            </span>
            <span className="text-[11px] text-stone-600 font-medium bg-white/70 px-2 py-0.5 rounded-full border border-stone-200/50">
              {lunarInfo.text.split('(')[0].trim()}
            </span>
          </div>

          <h2 className="text-xl font-bold text-stone-900 mt-2 tracking-tight">
            {greetingTime}, {currentMember.name.split(' ').slice(-1)[0]}!
          </h2>
          <p className="text-xs text-stone-600 mt-0.5 font-medium">
            {solarDateStr}
          </p>
        </div>
      </section>

      {/* 2. Birthday or Special Occasion Reminder Pill */}
      {birthdayEvent && (
        <button
          onClick={() => onOpenEventDetail(birthdayEvent)}
          className="w-full bg-linear-to-r from-rose-50 to-pink-50 border border-rose-200/80 rounded-2xl p-3 flex items-center justify-between text-left shadow-xs transition active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-rose-950">Sắp đến: {birthdayEvent.title}</span>
                <span className="text-[10px] bg-rose-200 text-rose-800 font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap inline-flex items-center leading-none">
                  5 ngày nữa
                </span>
              </div>
              <p className="text-[11px] text-rose-700">Tổ chức tại Nhà hàng Sen Tây Hồ lúc 18:00</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-rose-400 shrink-0" />
        </button>
      )}

      {/* 3. Family Members Presence Strip */}
      <section className="bg-white rounded-3xl p-4 border border-stone-200/70 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Thành viên gia đình ({allMembers.length})
          </h3>
          <button
            onClick={() => onNavigateTab('family')}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span>Cây gia phả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
          {allMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => onOpenMemberProfile(member.id)}
              className="flex flex-col items-center shrink-0 group focus:outline-hidden"
            >
              <Avatar
                src={member.avatar}
                name={member.name}
                size="md"
                online={member.onlineStatus === 'online'}
                className="group-hover:scale-105 transition-transform"
              />
              <span className="text-[11px] font-semibold text-stone-800 mt-1.5 max-w-[62px] truncate text-center">
                {member.relationship.split(' ')[0]}
              </span>
              <span className="text-[9px] text-stone-500 max-w-[62px] truncate text-center">
                {member.currentZone ? member.currentZone.split('(')[0].trim() : 'Ở nhà'}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Today's Events & Schedule */}
      <section className="bg-white rounded-3xl p-4 border border-stone-200/70 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-bold text-stone-900">
              Lịch hôm nay & Sắp tới
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('calendar')}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            Xem lịch âm dương
          </button>
        </div>

        <div className="space-y-2">
          {todayEvents.length > 0 ? (
            todayEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onOpenEventDetail(ev)}
                className="p-3 rounded-2xl bg-orange-50/70 border border-orange-100 flex items-start justify-between gap-3 cursor-pointer hover:bg-orange-100/60 transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-600" />
                    <h4 className="text-xs font-bold text-stone-900">{ev.title}</h4>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-stone-600 pl-3.5">
                    {ev.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        {ev.time}
                      </span>
                    )}
                    {ev.location && (
                      <span className="flex items-center gap-1 truncate max-w-[150px]">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        {ev.location}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-orange-800 bg-orange-200/70 px-2 py-0.5 rounded-full shrink-0">
                  Hôm nay
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-stone-500 italic py-1">Hôm nay không có lịch trình đột xuất.</p>
          )}

          {upcomingEvents.map((ev) => (
            <div
              key={ev.id}
              onClick={() => onOpenEventDetail(ev)}
              className="p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100/80 border border-stone-200/60 flex items-center justify-between text-xs cursor-pointer transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                <span className="font-medium text-stone-800 truncate">{ev.title}</span>
              </div>
              <span className="text-[11px] text-stone-500 shrink-0">
                {ev.date.split('-').slice(1).reverse().join('/')}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Shared Tasks / To-Do Summary */}
      <section className="bg-white rounded-3xl p-4 border border-stone-200/70 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-stone-900">Việc chung gia đình</h3>
          </div>
          <button
            onClick={() => onNavigateTab('more')}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            Tất cả việc
          </button>
        </div>

        <div className="space-y-2">
          {pendingTasksList.map(({ listId, item }) => (
            <div
              key={item.id}
              onClick={() => onToggleTaskItem(listId, item.id)}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200/60 transition cursor-pointer active:scale-99"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {item.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-stone-400 shrink-0" />
                )}
                <span className={`text-xs ${item.completed ? 'line-through text-stone-400' : 'font-medium text-stone-800'} truncate`}>
                  {item.title}
                </span>
              </div>
              {item.quantity && (
                <span className="text-[10px] bg-stone-200/60 text-stone-600 px-1.5 py-0.5 rounded-md shrink-0">
                  {item.quantity}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 6. On This Day / Kỷ niệm ngày này năm xưa */}
      {onThisDay && (
        <section className="bg-linear-to-br from-amber-500/10 to-orange-500/15 rounded-3xl p-4 border border-amber-200/80 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Ngày này {onThisDay.yearsAgo} năm trước
            </span>
            <button
              onClick={() => onNavigateTab('memories')}
              className="text-xs font-semibold text-orange-700 hover:text-orange-800"
            >
              Xem kỷ niệm
            </button>
          </div>

          <div className="flex items-start gap-3">
            <img
              src={onThisDay.photos[0]}
              alt={onThisDay.title}
              className="w-20 h-20 rounded-2xl object-cover shrink-0 shadow-xs"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-1 min-w-0">
              <h4 className="text-xs font-bold text-stone-900 leading-snug line-clamp-2">
                {onThisDay.title}
              </h4>
              <p className="text-[11px] text-stone-600 line-clamp-2">
                {onThisDay.description}
              </p>
              <p className="text-[10px] text-stone-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-stone-400" />
                {onThisDay.location}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
