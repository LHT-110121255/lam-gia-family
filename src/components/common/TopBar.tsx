import React from "react";
import { FamilyInfo, FamilyMember, AppNotification } from "../../types";
import { Avatar } from "./Avatar";
import { Bell, Heart } from "lucide-react";
import { SeniorModeToggle } from "./SeniorModeToggle";

interface TopBarProps {
  familyInfo: FamilyInfo;
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  notifications: AppNotification[];
  onOpenNotifications: () => void;
  onNavigateHome: () => void;
  onOpenProfile?: () => void;
  onOpenAuth?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  familyInfo,
  currentMember,
  allMembers,
  notifications,
  onOpenNotifications,
  onNavigateHome,
  onOpenProfile,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="shrink-0 z-30 bg-[#FFFBF7]/95 backdrop-blur-md border-b border-stone-200/70 pt-safe px-4 py-2 transition-colors w-full">
      <div className="flex items-center justify-between gap-3 w-full mx-auto">
        {/* Family Logo */}
        <button
          onClick={onNavigateHome}
          className="flex items-center text-left group transition active:scale-95"
          title="Trang chủ Lâm Gia"
        >
          <img
            src="/logo.png"
            alt="Lâm Gia Logo"
            className="h-9.5 w-auto object-contain drop-shadow-2xs group-hover:brightness-105 transition-transform"
          />
        </button>

        {/* Right Actions: Senior Mode Toggle, Notifications & Current User Profile */}
        <div className="flex items-center gap-1.5">
          {/* <SeniorModeToggle /> */}

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200/70 text-stone-700 flex items-center justify-center transition active:scale-95"
            aria-label="Thông báo gia đình"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-[#FFFBF7]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Current Member Profile Avatar Capsule */}
          <button
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
            }}
            className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200/80 p-1 pl-1.5 pr-2.5 rounded-full transition active:scale-95 border border-stone-200/60"
            title="Hồ sơ cá nhân"
          >
            <Avatar
              src={currentMember.avatar}
              name={currentMember.name}
              size="xs"
              online={currentMember.onlineStatus === "online"}
            />
            <span className="text-xs font-bold text-stone-800 max-w-[90px] truncate">
              {currentMember.name.split(" ").slice(-1)[0]}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
