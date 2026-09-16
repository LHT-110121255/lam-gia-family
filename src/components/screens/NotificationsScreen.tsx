import React from 'react';
import { AppNotification } from '../../types';
import {
  Bell,
  CheckCheck,
  Calendar,
  MessageCircle,
  CheckSquare,
  ShieldAlert,
  Heart,
  ChevronRight,
} from 'lucide-react';

interface NotificationsScreenProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigateTo: (targetType: string) => void;
}

const TYPE_ICONS: Record<string, { icon: any; color: string }> = {
  event: { icon: Calendar, color: 'bg-orange-100 text-orange-600' },
  message: { icon: MessageCircle, color: 'bg-blue-100 text-blue-600' },
  task: { icon: CheckSquare, color: 'bg-emerald-100 text-emerald-600' },
  safety: { icon: ShieldAlert, color: 'bg-red-100 text-red-600' },
  family: { icon: Heart, color: 'bg-rose-100 text-rose-600' },
};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateTo,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4 pb-20 w-full max-w-full px-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-stone-900">Thông báo gia đình</h2>
          <p className="text-[11px] text-stone-500">
            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã xem hết thông báo'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Đọc tất cả</span>
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {notifications.map((item) => {
          const cfg = TYPE_ICONS[item.type] || TYPE_ICONS.family;
          const Icon = cfg.icon;

          return (
            <div
              key={item.id}
              onClick={() => {
                onMarkAsRead(item.id);
                onNavigateTo(item.type);
              }}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 relative ${
                item.read
                  ? 'bg-white border-stone-200/70 opacity-80'
                  : 'bg-orange-50/50 border-orange-200 shadow-xs'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl ${cfg.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-stone-900 truncate">{item.title}</h4>
                  <span className="text-[10px] text-stone-400 shrink-0">{item.timestamp}</span>
                </div>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{item.content}</p>
              </div>

              {!item.read && (
                <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0 mt-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
