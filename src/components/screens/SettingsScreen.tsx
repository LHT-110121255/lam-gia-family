import React, { useState, useEffect } from "react";
import { AppSettings, FamilyInfo, FamilyMember } from "../../types";
import { Avatar } from "../common/Avatar";
import {
  Type,
  Bell,
  MapPin,
  Shield,
  RotateCcw,
  Smartphone,
  ChevronRight,
  Check,
  Moon,
  Sun,
  Users,
  Info,
  UserCircle,
  LogOut,
  UserPlus,
  Edit3,
  Home,
  HardDrive,
  Database,
  Trash2,
  Sparkles,
  RefreshCw,
  Battery,
  Compass,
  Loader2,
  Navigation,
} from "lucide-react";
import { Modal } from "../common/Modal";
import { EditFamilyModal } from "../family/EditFamilyModal";
import { familyService } from "../../services/familyService";
import { locationSyncService } from "../../services/locationSyncService";

interface SettingsScreenProps {
  settings: AppSettings;
  familyInfo: FamilyInfo;
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetData: () => void;
  onOpenProfile?: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onUpdateFamilyInfo?: (updatedInfo: Partial<FamilyInfo>) => void;
  onNavigateAccounts?: () => void;
  pendingAccountsCount?: number;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  familyInfo,
  currentMember,
  allMembers,
  onUpdateSettings,
  onResetData,
  onOpenProfile,
  onOpenAuth,
  onLogout,
  onUpdateFamilyInfo,
  onNavigateAccounts,
  pendingAccountsCount = 0,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [showClearOfflineDataModal, setShowClearOfflineDataModal] =
    useState(false);
  const [isEditFamilyOpen, setIsEditFamilyOpen] = useState(false);
  const [isProcessingCache, setIsProcessingCache] = useState(false);
  const [cacheSuccessMsg, setCacheSuccessMsg] = useState<string | null>(null);

  // GPS & Location Testing State
  const [isTestingLocation, setIsTestingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  const handleManualLocationSync = async () => {
    setIsTestingLocation(true);
    setLocationMessage(null);
    const result = await locationSyncService.syncCurrentLocation(true);
    setIsTestingLocation(false);
    if (result.success) {
      setLocationMessage({
        text: `Đã cập nhật vị trí mới nhất: ${result.address || "Thành công"}`,
        isError: false,
      });
    } else {
      setLocationMessage({
        text: `Không thể lấy tọa độ GPS: ${result.error || "Vui lòng cấp quyền định vị"}`,
        isError: true,
      });
    }
    setTimeout(() => setLocationMessage(null), 5000);
  };

  const [storageStats, setStorageStats] = useState(() =>
    familyService.getStorageStats(),
  );

  useEffect(() => {
    setStorageStats(familyService.getStorageStats());
  }, []);

  const refreshStorageStats = () => {
    setStorageStats(familyService.getStorageStats());
  };

  const handleClearCache = async () => {
    setIsProcessingCache(true);
    await familyService.clearAppCache();
    setIsProcessingCache(false);
    setShowClearCacheModal(false);
    refreshStorageStats();
    setCacheSuccessMsg(
      "Đã dọn dẹp sạch bộ nhớ đệm hình ảnh và dữ liệu mạng tạm thời!",
    );
    setTimeout(() => setCacheSuccessMsg(null), 3500);
  };

  const handleClearOfflineData = async () => {
    setIsProcessingCache(true);
    await familyService.clearOfflineDataKeepAuth();
    setIsProcessingCache(false);
    setShowClearOfflineDataModal(false);
    refreshStorageStats();
    setCacheSuccessMsg(
      "Đã xóa dữ liệu cục bộ và đồng bộ lại mới nhất từ máy chủ thành công!",
    );
    setTimeout(() => setCacheSuccessMsg(null), 3500);
  };

  const isAdmin =
    currentMember.isAdmin ||
    currentMember.username === "lamhuetrung" ||
    currentMember.id === "member-trung";

  return (
    <div className="space-y-4 pb-20 w-full max-w-full px-4 pt-2">
      {/* Toast Alert for Cache Operations */}
      {cacheSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{cacheSuccessMsg}</span>
        </div>
      )}

      {/* 1. Profile & Active User Header */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              src={currentMember.avatar}
              name={currentMember.name}
              size="md"
              online={currentMember.onlineStatus === "online"}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-stone-900 truncate">
                  {currentMember.name}
                </h3>
                {isAdmin && (
                  <span className="bg-orange-100 text-orange-800 text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-orange-600 font-medium">
                {currentMember.relationship} • {familyInfo.name}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-1.5 pt-1 border-t border-stone-100">
          {isAdmin && onNavigateAccounts && (
            <button
              onClick={onNavigateAccounts}
              className="w-full py-2.5 px-3 bg-linear-to-r from-orange-500 to-amber-500 text-white rounded-2xl text-xs font-bold transition flex items-center justify-between shadow-xs shadow-orange-500/20 active:scale-98"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-white" />
                <span>Quản lý tài khoản & Phê duyệt</span>
              </div>
              {pendingAccountsCount > 0 ? (
                <span className="text-[10px] bg-white text-orange-800 font-black px-2 py-0.5 rounded-full animate-bounce">
                  {pendingAccountsCount} chờ duyệt
                </span>
              ) : (
                <ChevronRight className="w-4 h-4 text-white/70" />
              )}
            </button>
          )}

          {onUpdateFamilyInfo && (
            <button
              onClick={() => setIsEditFamilyOpen(true)}
              className="w-full py-2.5 px-3 bg-orange-50/80 hover:bg-orange-100/80 border border-orange-200/70 rounded-2xl text-xs font-bold text-orange-900 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-orange-600" />
                <span>Cập nhật thông tin gia đình & dòng họ</span>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-400" />
            </button>
          )}

          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="w-full py-2.5 px-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-stone-600" />
                <span>Chỉnh sửa thông tin & hồ sơ cá nhân</span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </button>
          )}
        </div>

        {isEditFamilyOpen && (
          <EditFamilyModal
            isOpen={isEditFamilyOpen}
            familyInfo={familyInfo}
            onClose={() => setIsEditFamilyOpen(false)}
            onSave={(updated) => {
              if (onUpdateFamilyInfo) onUpdateFamilyInfo(updated);
            }}
          />
        )}
      </div>

      {/* 2. Accessibility: Large Text for Seniors */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-orange-600" />
          <h3 className="text-sm font-bold text-stone-900">
            Trợ năng & Cỡ chữ (Cho người lớn tuổi)
          </h3>
        </div>
        <p className="text-xs text-stone-600">
          Chế độ "Chữ lớn" tăng kích thước phông chữ và khoảng cách bấm giúp Ông
          Bà dễ đọc và thao tác hơn:
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onUpdateSettings({ textMode: "standard" })}
            className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
              settings.textMode === "standard"
                ? "border-orange-500 bg-orange-50/70 text-orange-950 font-bold shadow-xs"
                : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
            }`}
          >
            <div>
              <span className="text-xs block font-bold">Chữ tiêu chuẩn</span>
              <span className="text-[10px] text-stone-500">
                Mặc định hệ thống
              </span>
            </div>
            {settings.textMode === "standard" && (
              <Check className="w-4 h-4 text-orange-600" />
            )}
          </button>

          <button
            onClick={() => onUpdateSettings({ textMode: "large" })}
            className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
              settings.textMode === "large"
                ? "border-orange-500 bg-orange-50/70 text-orange-950 font-bold shadow-xs"
                : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
            }`}
          >
            <div>
              <span className="text-sm block font-bold text-orange-900">
                Chữ lớn 👵👴
              </span>
              <span className="text-[10px] text-stone-500">
                Dễ nhìn cho Ông Bà
              </span>
            </div>
            {settings.textMode === "large" && (
              <Check className="w-4 h-4 text-orange-600" />
            )}
          </button>
        </div>
      </div>

      {/* 3. Notifications */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-orange-600" />
          Thông báo gia đình
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-2xl border border-stone-100">
            <div>
              <span className="font-bold text-stone-800 block">
                Thông báo nhắc giỗ & Sự kiện
              </span>
              <span className="text-[10px] text-stone-500">
                Nhắc nhở trước ngày giỗ chạp và sinh nhật
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.calendarReminders}
              onChange={(e) =>
                onUpdateSettings({ calendarReminders: e.target.checked })
              }
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-2xl border border-stone-100">
            <div>
              <span className="font-bold text-stone-800 block">
                Chuông tin nhắn gia đình
              </span>
              <span className="text-[10px] text-stone-500">
                Âm thanh khi có tin nhắn mới từ người thân
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.chatNotifications}
              onChange={(e) =>
                onUpdateSettings({ chatNotifications: e.target.checked })
              }
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* 3.5. Background GPS & Realtime Family Location Sync (Định vị GPS nền & Chu kỳ cập nhật) */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Định vị GPS & Vị trí nền
              </h3>
              <p className="text-[10px] text-stone-500">
                Tự động cập nhật vị trí cho cả nhà theo dõi
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.locationSharingAllowed}
              onChange={(e) =>
                onUpdateSettings({ locationSharingAllowed: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
          </label>
        </div>

        {settings.locationSharingAllowed ? (
          <div className="space-y-3 text-xs pt-1 border-t border-stone-100">
            {/* Cycle Selection */}
            <div>
              <label className="font-bold text-stone-800 block mb-1.5 text-xs">
                Chu kỳ tự động cập nhật vị trí nền:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    val: 5,
                    title: "5 phút / lần",
                    badge: "Chính xác cao",
                    desc: "Phù hợp khi di chuyển",
                  },
                  {
                    val: 10,
                    title: "10 phút / lần",
                    badge: "Khuyên dùng",
                    desc: "Cân bằng pin tối ưu",
                  },
                  {
                    val: 15,
                    title: "15 phút / lần",
                    badge: "Tiết kiệm pin",
                    desc: "Tối ưu pin tối đa",
                  },
                  {
                    val: 0,
                    title: "Thủ công",
                    badge: "Khi mở bản đồ",
                    desc: "Chỉ khi vào bản đồ",
                  },
                ].map((item) => {
                  const currentInterval = settings.locationSyncInterval ?? 10;
                  const isSelected = currentInterval === item.val;
                  return (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          locationSyncInterval: item.val as 0 | 5 | 10 | 15,
                        })
                      }
                      className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? "border-orange-500 bg-orange-50/70 text-orange-950 font-bold shadow-xs"
                          : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold">{item.title}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-stone-500">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Share Battery status toggle */}
            <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-2xl border border-stone-100">
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-bold text-stone-800 block">
                    Chia sẻ mức % Pin thiết bị
                  </span>
                  <span className="text-[10px] text-stone-500">
                    Hiển thị mức pin để gia đình an tâm khi bạn sắp hết pin
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.shareBatteryStatus !== false}
                onChange={(e) =>
                  onUpdateSettings({ shareBatteryStatus: e.target.checked })
                }
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
              />
            </div>

            {/* Current Stored Location Status & Manual Sync Button */}
            <div className="p-3 bg-stone-50/90 rounded-2xl border border-stone-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Vị trí gần nhất của bạn:
                </span>
                <span className="text-[10px] text-orange-600 font-medium">
                  {locationSyncService.formatLastUpdated(
                    currentMember.lastLocationUpdated,
                  )}
                </span>
              </div>
              <p className="text-xs font-semibold text-stone-800 line-clamp-2">
                {currentMember.locationAddress || "Chưa có thông tin tọa độ"}
              </p>

              {locationMessage && (
                <div
                  className={`p-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 ${
                    locationMessage.isError
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span>{locationMessage.text}</span>
                </div>
              )}

              <button
                type="button"
                disabled={isTestingLocation}
                onClick={handleManualLocationSync}
                className="w-full py-2 px-3 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl text-stone-800 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 shadow-xs disabled:opacity-50"
              >
                {isTestingLocation ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
                    <span>Đang quét GPS vệ tinh...</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-3.5 h-3.5 text-orange-600" />
                    <span>Quét & Cập nhật vị trí ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 text-stone-500 text-[11px] leading-relaxed">
            Bạn đang tắt chia sẻ vị trí. Các thành viên khác trong gia đình sẽ
            không thấy vị trí hiện tại của bạn trên bản đồ.
          </div>
        )}
      </div>

      {/* 4. Storage & Cache Management (Quản lý bộ nhớ đệm - Không xóa ứng dụng) */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-orange-600" />
            Bộ Nhớ Đệm
          </h3>
          <span className="text-[10px] font-mono bg-stone-100 text-stone-700 font-bold px-2 py-0.5 rounded-full border border-stone-200">
            {storageStats.localStorageSizeKB} KB đã dùng
          </span>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          Dọn dẹp bộ nhớ đệm (Cache) giúp ứng dụng chạy mượt mà và giải phóng
          dung lượng thiết bị mà{" "}
          <strong>không làm mất tài khoản hay gỡ bỏ ứng dụng</strong>.
        </p>

        {/* Data counts chip bar */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600 bg-stone-50/80 p-2.5 rounded-2xl border border-stone-100 font-medium">
          <div className="flex items-center gap-1.5 truncate">
            <Database className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span>{storageStats.postsCount} bài viết lưu tạm</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>{storageStats.messagesCount} tin nhắn lưu trữ</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Database className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <span>{storageStats.eventsCount} sự kiện & lịch giỗ</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{storageStats.placesCount} địa điểm đã lưu</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Button 1: Xóa bộ nhớ đệm */}
          <button
            onClick={() => setShowClearCacheModal(true)}
            className="py-2.5 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Làm mới</span>
          </button>

          {/* Button 2: Làm sạch dữ liệu cục bộ & Tải lại */}
          <button
            onClick={() => setShowClearOfflineDataModal(true)}
            className="py-2.5 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
            <span>Đồng Bộ</span>
          </button>
        </div>
      </div>

      {/* 5. Account & Auth Session Management */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-2.5">
        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
          <UserCircle className="w-3.5 h-3.5 text-orange-600" />
          Tài khoản & Phiên đăng nhập
        </h3>

        {onOpenProfile && (
          <button
            onClick={onOpenProfile}
            className="w-full p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-left flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2.5">
              <UserCircle className="w-4 h-4 text-orange-600" />
              <div>
                <span className="text-xs font-bold text-stone-900 block">
                  Quản lý hồ sơ & Y tế
                </span>
                <span className="text-[10px] text-stone-500">
                  Sửa ảnh, ngày sinh, liên hệ khẩn cấp
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>
        )}

        {onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="w-full p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-left flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2.5">
              <UserPlus className="w-4 h-4 text-stone-600" />
              <div>
                <span className="text-xs font-bold text-stone-900 block">
                  Đăng nhập tài khoản khác / Đăng ký
                </span>
                <span className="text-[10px] text-stone-500">
                  Đăng nhập bằng SĐT hoặc tạo tài khoản mới
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full p-3 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-left flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-red-600" />
              <div>
                <span className="text-xs font-bold text-red-950 block">
                  Đăng xuất
                </span>
                <span className="text-[10px] text-red-700">
                  Mở lại màn hình đăng nhập
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-red-600">Đăng xuất</span>
          </button>
        )}
      </div>

      {/* 6. System Reset & Info */}
      <div className="p-4 bg-stone-50 rounded-3xl border border-stone-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
            <Smartphone className="w-4 h-4 text-stone-500" />
            <span>
              Phiên bản v
              {typeof __APP_VERSION__ !== "undefined"
                ? __APP_VERSION__
                : "1.0.0"}
            </span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            Đã sẵn sàng Offline
          </span>
        </div>
        <div className="text-[10px] text-stone-400 flex items-center justify-between pt-1 border-t border-stone-200/60">
          <span>
            Bản dựng:{" "}
            {typeof __BUILD_TIME__ !== "undefined"
              ? new Date(__BUILD_TIME__).toLocaleString("vi-VN")
              : "Mới nhất"}
          </span>
          <span>Hệ điều hành: Web PWA</span>
        </div>
      </div>

      {/* Modal 1: Clear Cache Confirm */}
      <Modal
        isOpen={showClearCacheModal}
        onClose={() => setShowClearCacheModal(false)}
        title="Xóa bộ nhớ đệm (Cache)"
      >
        <div className="space-y-3 text-xs text-stone-700">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Hành động này sẽ giải phóng bộ nhớ đệm hình ảnh và file tạm thời
              của trình duyệt.{" "}
              <strong>
                Tài khoản và dữ liệu cá nhân của bạn hoàn toàn không bị ảnh
                hưởng.
              </strong>
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setShowClearCacheModal(false)}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl"
            >
              Hủy
            </button>
            <button
              disabled={isProcessingCache}
              onClick={handleClearCache}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center gap-1.5"
            >
              {isProcessingCache ? "Đang dọn dẹp..." : "Dọn dẹp bộ nhớ đệm"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Clear Offline Data & Resync */}
      <Modal
        isOpen={showClearOfflineDataModal}
        onClose={() => setShowClearOfflineDataModal(false)}
        title="Làm sạch dữ liệu & Đồng bộ lại"
      >
        <div className="space-y-3 text-xs text-stone-700">
          <div className="p-3 bg-stone-100 rounded-2xl border border-stone-200 text-stone-800 flex items-start gap-2">
            <RefreshCw className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <p>
              Hành động này sẽ xóa dữ liệu lưu tạm trên thiết bị và đồng bộ
              phiên bản mới nhất từ máy chủ MongoDB.{" "}
              <strong>
                Ứng dụng không bị xóa và bạn vẫn giữ nguyên trạng thái đăng
                nhập.
              </strong>
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setShowClearOfflineDataModal(false)}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl"
            >
              Hủy
            </button>
            <button
              disabled={isProcessingCache}
              onClick={handleClearOfflineData}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center gap-1.5"
            >
              {isProcessingCache ? "Đang đồng bộ..." : "Xác nhận đồng bộ lại"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 3: Reset Default Confirm Dialog */}
      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Xác nhận làm mới dữ liệu"
      >
        <div className="space-y-3 text-xs text-stone-700">
          <p>
            Hành động này sẽ làm sạch bộ nhớ tạm trình duyệt và tải lại đầy đủ
            dữ liệu mẫu chuẩn của Đại gia đình họ Lâm.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl"
            >
              Hủy
            </button>
            <button
              onClick={() => {
                onResetData();
                setShowResetConfirm(false);
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl"
            >
              Đồng ý khôi phục
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
