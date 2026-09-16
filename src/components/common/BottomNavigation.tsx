import React from 'react';
import { Home, Image as ImageIcon, Calendar, MoreHorizontal, Plus } from 'lucide-react';

export type MainTab = 'home' | 'memories' | 'calendar' | 'more';

interface BottomNavigationProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onOpenQuickAction: () => void;
  chatUnreadCount?: number;
  hidden?: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange,
  onOpenQuickAction,
  chatUnreadCount = 0,
  hidden = false,
}) => {
  if (hidden) return null;

  // 4 main tabs with (+) quick action button in the center
  const tabs = [
    { id: 'home' as MainTab, label: 'Trang chủ', icon: Home },
    { id: 'memories' as MainTab, label: 'Kỷ niệm', icon: ImageIcon },
    { id: 'calendar' as MainTab, label: 'Lịch', icon: Calendar },
    { id: 'more' as MainTab, label: 'Thêm', icon: MoreHorizontal, badge: chatUnreadCount },
  ];

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-40 bg-[#FFFBF7]/95 backdrop-blur-md border-t border-stone-200/80 pb-safe transition-all shadow-lg w-full">
      <div className="w-full flex items-center justify-around px-2 py-1 relative">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          // Insert the Quick Action button right in the middle (between tab index 1 'memories' and index 2 'calendar')
          return (
            <React.Fragment key={tab.id}>
              {idx === 2 && (
                <div className="flex items-center justify-center -mt-6 shrink-0 px-1">
                  <button
                    onClick={onOpenQuickAction}
                    className="w-12 h-12 rounded-full bg-linear-to-tr from-orange-600 to-amber-500 text-white shadow-lg flex items-center justify-center transition transform active:scale-90 hover:brightness-105 border-3 border-[#FFFBF7]"
                    aria-label="Tạo mới nhanh"
                  >
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </button>
                </div>
              )}

              <button
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl transition-all relative ${
                  isActive ? 'text-orange-600 font-bold' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                    }`}
                  />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-1 ring-white" />
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight truncate select-none whitespace-nowrap">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0.5 w-4 h-0.5 bg-orange-600 rounded-full" />
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
