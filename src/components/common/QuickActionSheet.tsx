import React from 'react';
import { BottomSheet } from './BottomSheet';
import {
  Camera,
  CalendarPlus,
  CheckSquare,
  ShieldCheck,
  Receipt,
  Vote,
  Sparkles,
} from 'lucide-react';

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (
    action: 'new_post' | 'new_event' | 'new_task' | 'check_in' | 'new_expense' | 'new_poll'
  ) => void;
}

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const actions = [
    {
      id: 'new_post' as const,
      title: 'Chia sẻ khoảnh khắc',
      desc: 'Đăng ảnh, lời nhắn yêu thương cho cả nhà',
      icon: Camera,
      color: 'bg-orange-500 text-white',
    },
    {
      id: 'new_event' as const,
      title: 'Thêm sự kiện & ngày lễ',
      desc: 'Sinh nhật, giỗ chạp, lịch khám bệnh',
      icon: CalendarPlus,
      color: 'bg-emerald-500 text-white',
    },
    {
      id: 'new_task' as const,
      title: 'Tạo việc chung & mua sắm',
      desc: 'Sắm đồ lễ, chợ, chăm sóc ông bà',
      icon: CheckSquare,
      color: 'bg-blue-500 text-white',
    },
    {
      id: 'check_in' as const,
      title: 'Báo an toàn (Check-in)',
      desc: 'Báo cho gia đình "Tôi đã đến nơi an toàn"',
      icon: ShieldCheck,
      color: 'bg-teal-500 text-white',
    },
    {
      id: 'new_expense' as const,
      title: 'Ghi chi tiêu quỹ gia đình',
      desc: 'Khoản chi chợ, điện nước, thuốc men',
      icon: Receipt,
      color: 'bg-amber-500 text-white',
    },
    {
      id: 'new_poll' as const,
      title: 'Tạo bình chọn gia đình',
      desc: 'Hỏi ý kiến đi chơi cuối tuần, ăn gì',
      icon: Vote,
      color: 'bg-purple-500 text-white',
    },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Tạo mới nhanh" subtitle="Hành động tức thì cho cả gia đình">
      <div className="grid grid-cols-1 gap-2.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={() => {
                onClose();
                onSelectAction(act.id);
              }}
              className="flex items-center gap-3.5 p-3 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/70 shadow-xs transition active:scale-98 text-left"
            >
              <div className={`w-11 h-11 rounded-xl ${act.color} flex items-center justify-center shrink-0 shadow-xs`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-stone-900 truncate">{act.title}</h4>
                <p className="text-xs text-stone-500 truncate">{act.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
};
