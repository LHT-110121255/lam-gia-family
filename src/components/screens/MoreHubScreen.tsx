import React from 'react';
import {
  Users,
  MessageCircle,
  CheckSquare,
  MapPin,
  Wallet,
  Vote,
  Settings,
  ChevronRight,
  UserCircle,
  ShieldCheck,
  Clock,
  Sparkles,
  Calendar,
  Image,
} from 'lucide-react';

export type SubScreen =
  | 'hub'
  | 'family'
  | 'chat'
  | 'tasks'
  | 'map'
  | 'finance'
  | 'polls'
  | 'settings'
  | 'notifications'
  | 'profile'
  | 'accounts'
  | 'calendar'
  | 'memories';

interface MoreHubScreenProps {
  onNavigateSubScreen: (screen: SubScreen) => void;
  chatUnreadCount?: number;
  pendingTasksCount?: number;
  activePollsCount?: number;
  isAdmin?: boolean;
  pendingAccountsCount?: number;
}

export const MoreHubScreen: React.FC<MoreHubScreenProps> = ({
  onNavigateSubScreen,
  chatUnreadCount = 0,
  pendingTasksCount = 0,
  activePollsCount = 0,
  isAdmin = false,
  pendingAccountsCount = 0,
}) => {
  const hubItems = [
    {
      id: 'profile' as SubScreen,
      title: 'Hồ sơ cá nhân & Y tế',
      desc: 'Ảnh đại diện, liên hệ, nhóm máu & liên hệ khẩn cấp',
      icon: UserCircle,
      color: 'bg-rose-500 text-white',
    },
    {
      id: 'family' as SubScreen,
      title: 'Cây gia phả & Thành viên',
      desc: 'Cây phả hệ 3 thế hệ, danh bạ gia đình & hồ sơ chi tiết',
      icon: Users,
      color: 'bg-indigo-600 text-white',
    },
    {
      id: 'calendar' as SubScreen,
      title: 'Lịch & Sự kiện gia đình',
      desc: 'Xem lịch chi tiết, sinh nhật, giỗ chạp & sự kiện sắp tới',
      icon: Calendar,
      color: 'bg-orange-600 text-white',
    },
    {
      id: 'memories' as SubScreen,
      title: 'Kỷ niệm & Album gia đình',
      desc: 'Bộ sưu tập album ảnh, khoảnh khắc & dòng thời gian',
      icon: Image,
      color: 'bg-pink-600 text-white',
    },
    {
      id: 'tasks' as SubScreen,
      title: 'Việc chung & Mua sắm',
      desc: 'Việc nhà, sửa chữa đồ đạc, đi chợ, cúng giỗ',
      icon: CheckSquare,
      color: 'bg-emerald-600 text-white',
      badge: pendingTasksCount > 0 ? `${pendingTasksCount} việc` : undefined,
    },
    {
      id: 'finance' as SubScreen,
      title: 'Quỹ chung & Chi tiêu',
      desc: 'Sổ quỹ minh bạch, ghi chép thu chi danh mục tùy biến & chia tiền sự kiện',
      icon: Wallet,
      color: 'bg-amber-600 text-white',
    },
    {
      id: 'polls' as SubScreen,
      title: 'Bình chọn gia đình',
      desc: 'Hỏi ý kiến cả nhà ăn gì, đi đâu cuối tuần',
      icon: Vote,
      color: 'bg-purple-600 text-white',
      badge: activePollsCount > 0 ? `${activePollsCount} mở` : undefined,
    },
    {
      id: 'settings' as SubScreen,
      title: 'Cài đặt & Trợ năng',
      desc: 'Cỡ chữ cho người lớn tuổi, âm thanh & thông báo',
      icon: Settings,
      color: 'bg-stone-600 text-white',
    },
  ];

  return (
    <div className="space-y-4 pb-20 w-full max-w-full px-4 pt-2">
      <div>
        <h2 className="text-base font-bold text-stone-900">Tiện ích gia đình</h2>
        <p className="text-[11px] text-stone-500">
          Các công cụ gắn kết và hỗ trợ cuộc sống hằng ngày của cả nhà
        </p>
      </div>

      {/* Admin Special Quick Access Card */}
      {isAdmin && (
        <button
          onClick={() => onNavigateSubScreen('accounts')}
          className="w-full p-4 bg-linear-to-r from-orange-500 to-amber-500 text-white rounded-3xl shadow-md shadow-orange-500/20 flex items-center justify-between gap-3 text-left transition active:scale-98 hover:brightness-105"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white truncate">
                  Quản lý tài khoản & Phê duyệt
                </h3>
                <span className="text-[9px] bg-white text-orange-700 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <p className="text-xs text-orange-100/90 truncate mt-0.5">
                Duyệt thành viên đăng ký mới, khóa & quản trị tài khoản
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {pendingAccountsCount > 0 ? (
              <span className="text-xs bg-rose-600 text-white font-black px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 animate-bounce">
                <Clock className="w-3.5 h-3.5" />
                <span>{pendingAccountsCount} chờ</span>
              </span>
            ) : (
              <ChevronRight className="w-5 h-5 text-white/70 shrink-0" />
            )}
          </div>
        </button>
      )}

      <div className="space-y-2.5">
        {hubItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigateSubScreen(item.id)}
              className="w-full p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs flex items-center justify-between gap-3 text-left transition hover:bg-stone-50 active:scale-99"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center shrink-0 shadow-xs`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-stone-900 truncate">{item.title}</h3>
                    {item.badge && (
                      <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap inline-flex items-center leading-none">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 truncate mt-0.5">{item.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-300 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
