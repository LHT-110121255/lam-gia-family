import React, { useState, useEffect } from 'react';
import { SafetyCheckIn, FamilyMember, LocationShareState } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  ShieldCheck,
  MapPin,
  Clock,
  AlertOctagon,
  CheckCircle2,
  Navigation,
  Battery,
  PhoneCall,
  Home,
  GraduationCap,
  Briefcase,
  Hospital,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { VietbandoMap } from '../common/VietbandoMap';
import { pushService } from '../../services/pushService';
import { BellRing } from 'lucide-react';

interface SafetyScreenProps {
  checkIns: SafetyCheckIn[];
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  locationShare: LocationShareState;
  onCheckIn: (zoneName: string, message: string) => void;
  onStartLocationShare: (durationMinutes: number) => void;
  onStopLocationShare: () => void;
  onTriggerSOS: () => void;
  isSOSModalOpen?: boolean;
  onCloseSOSModal?: () => void;
}

const SAFE_ZONES = [
  { name: 'Nhà chính (Đội Cấn)', desc: '128 Đội Cấn, Ba Đình', icon: Home },
  { name: 'Trường THCS Thăng Long', desc: 'Kim Mã, Ba Đình', icon: GraduationCap },
  { name: 'Văn phòng Viettel (Bố Dũng)', desc: 'Trần Hữu Dực, Nam Từ Liêm', icon: Briefcase },
  { name: 'Bệnh viện Lão khoa Trung Ương', desc: 'Phương Mai, Đống Đa', icon: Hospital },
];

export const SafetyScreen: React.FC<SafetyScreenProps> = ({
  checkIns,
  currentMember,
  allMembers,
  locationShare,
  onCheckIn,
  onStartLocationShare,
  onStopLocationShare,
  onTriggerSOS,
  isSOSModalOpen = false,
  onCloseSOSModal,
}) => {
  const [showSOSDialog, setShowSOSDialog] = useState(isSOSModalOpen);
  const [sosCountdown, setSosCountdown] = useState(3);
  const [sosActive, setSosActive] = useState(false);
  const [sosHolding, setSosHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  // Sync external prop if passed
  useEffect(() => {
    if (isSOSModalOpen) {
      setShowSOSDialog(true);
    }
  }, [isSOSModalOpen]);

  // Handle SOS button hold logic (3 seconds)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sosHolding) {
      interval = setInterval(() => {
        setHoldProgress((p) => {
          if (p >= 100) {
            clearInterval(interval);
            setSosHolding(false);
            setSosActive(true);
            onTriggerSOS();
            return 100;
          }
          return p + 5; // 20 steps * 150ms = 3000ms
        });
      }, 150);
    } else {
      setHoldProgress(0);
    }
    return () => clearInterval(interval);
  }, [sosHolding, onTriggerSOS]);

  const getMember = (id: string) => allMembers.find((m) => m.id === id);

  return (
    <div className="space-y-4 pb-20 w-full max-w-full px-4 pt-2">
      {/* 1. Header & Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-stone-900">An toàn & Định vị gia đình</h2>
          <p className="text-[11px] text-stone-500">Giữ kết nối yêu thương và an tâm mọi lúc</p>
        </div>
        <button
          onClick={() => setShowSOSDialog(true)}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5"
        >
          <AlertOctagon className="w-4 h-4" />
          <span>SOS Khẩn cấp</span>
        </button>
      </div>

      {/* 2. Quick Check-In Card: "Báo Tôi Đã Đến Nơi" */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold text-stone-900">Báo an toàn tức thì</h3>
          </div>
          <span className="text-[10px] text-stone-400">Chỉ 1 chạm gửi cả nhà</span>
        </div>

        <p className="text-xs text-stone-600">
          Chọn vị trí an toàn bạn vừa đến để cả gia đình nhận thông báo an tâm:
        </p>

        <div className="grid grid-cols-2 gap-2">
          {SAFE_ZONES.map((zone, i) => {
            const Icon = zone.icon;
            return (
              <button
                key={i}
                onClick={() => onCheckIn(zone.name, `Đã đến ${zone.name} an toàn.`)}
                className="p-3 rounded-2xl bg-stone-50 hover:bg-teal-50 border border-stone-200 hover:border-teal-300 text-left transition active:scale-98"
              >
                <Icon className="w-4 h-4 text-teal-600 mb-1" />
                <h4 className="text-xs font-bold text-stone-900 truncate">{zone.name.split('(')[0]}</h4>
                <p className="text-[10px] text-stone-500 truncate">{zone.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Web Push Notification Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-3xl p-3.5 text-white shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white/20 backdrop-blur-xs rounded-2xl">
            <BellRing className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-xs font-bold">Thông báo màn hình khóa PWA</h4>
            <p className="text-[10px] text-orange-100">Nhận tin nhắn SOS & tin khẩn ngay trên màn hình ngoài di động</p>
          </div>
        </div>
        <button
          onClick={() => pushService.subscribeUser(currentMember.id)}
          className="px-3 py-1.5 bg-white text-orange-700 text-xs font-bold rounded-xl shadow-xs hover:bg-orange-50 active:scale-95 shrink-0"
        >
          Bật ngay
        </button>
      </div>

      {/* 3. Real-time Vietbando Map */}
      <div className="bg-white rounded-3xl p-3.5 border border-stone-200/80 shadow-xs space-y-2">
        <h3 className="text-xs font-bold text-stone-900">Bản đồ Vietbando gia đình</h3>
        <VietbandoMap members={allMembers} />
      </div>

      {/* 4. Real-time Family Members Location & Battery Status */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900">Trạng thái thành viên</h3>
          <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
            ● GPS Cập nhật 2 phút trước
          </span>
        </div>

        <div className="space-y-2.5">
          {allMembers.map((m) => (
            <div
              key={m.id}
              className="p-3 bg-stone-50 rounded-2xl flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  src={m.avatar}
                  name={m.name}
                  size="sm"
                  online={m.onlineStatus === 'online'}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-900 truncate">{m.name}</span>
                    <span className="text-[10px] bg-white text-stone-600 px-1.5 py-0.2 rounded-md border border-stone-200">
                      {m.relationship}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                    {m.currentZone || 'Đang ở nhà'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {m.batteryLevel !== undefined && (
                  <div className="flex items-center gap-1 text-[11px] font-mono text-stone-500">
                    <Battery className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{m.batteryLevel}%</span>
                  </div>
                )}
                <a
                  href={`tel:${m.phone.replace(/\s+/g, '')}`}
                  className="p-1.5 rounded-full bg-stone-200 text-stone-700 hover:bg-emerald-600 hover:text-white transition"
                  title="Gọi nhanh"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Location Sharing Timer Widget */}
      <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-3xl p-4 border border-blue-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-blue-950">Chia sẻ vị trí trực tiếp</h3>
          </div>
          {locationShare.isSharing && (
            <span className="text-[10px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full animate-pulse">
              ĐANG CHIA SẺ
            </span>
          )}
        </div>

        <p className="text-xs text-blue-900/80">
          Khi con đi học về muộn hoặc ông bà đi tập thể dục, bật chia sẻ vị trí có giới hạn thời gian:
        </p>

        {locationShare.isSharing ? (
          <div className="p-3 bg-white rounded-2xl border border-blue-200 flex items-center justify-between">
            <div className="text-xs">
              <span className="font-bold text-stone-900 block">Vị trí của bạn đang hiển thị</span>
              <span className="text-stone-500">Tự động kết thúc sau: 45 phút</span>
            </div>
            <button
              onClick={onStopLocationShare}
              className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-xl transition"
            >
              Dừng chia sẻ
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStartLocationShare(30)}
              className="flex-1 py-2 bg-white hover:bg-blue-100 text-blue-900 text-xs font-bold rounded-xl border border-blue-200 transition"
            >
              30 Phút
            </button>
            <button
              onClick={() => onStartLocationShare(60)}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              1 Giờ
            </button>
            <button
              onClick={() => onStartLocationShare(120)}
              className="flex-1 py-2 bg-white hover:bg-blue-100 text-blue-900 text-xs font-bold rounded-xl border border-blue-200 transition"
            >
              2 Giờ
            </button>
          </div>
        )}
      </div>

      {/* 5. Recent Check-in Logs */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-stone-900">Nhật ký an toàn gần đây</h3>
        <div className="space-y-2 text-xs">
          {checkIns.map((item) => {
            const member = getMember(item.memberId);
            return (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="text-stone-700 truncate">
                    <strong>{member?.name}</strong> {item.message}
                  </span>
                </div>
                <span className="text-[10px] text-stone-400 shrink-0">{item.timestamp}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SOS Trigger & Confirmation Modal */}
      <Modal
        isOpen={showSOSDialog}
        onClose={() => {
          setShowSOSDialog(false);
          setSosActive(false);
          setHoldProgress(0);
          if (onCloseSOSModal) onCloseSOSModal();
        }}
        title="Tín hiệu SOS Khẩn cấp"
      >
        <div className="space-y-4 text-center py-2">
          {sosActive ? (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto animate-bounce">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-red-600">ĐÃ PHÁT TÍN HIỆU SOS!</h4>
              <p className="text-xs text-stone-600">
                Toàn bộ thành viên trong gia đình và liên hệ khẩn cấp đã nhận được chuông cảnh báo
                và toạ độ vị trí hiện tại của bạn.
              </p>
              <div className="p-3 bg-red-50 rounded-2xl text-xs text-red-950 text-left space-y-1">
                <p>📍 Vị trí gửi: 128 Đội Cấn, Ba Đình, Hà Nội</p>
                <p>📞 Đang kết nối cuộc gọi ưu tiên tới: Bố Dũng (0912 345 678)</p>
              </div>
              <button
                onClick={() => {
                  setSosActive(false);
                  setShowSOSDialog(false);
                  if (onCloseSOSModal) onCloseSOSModal();
                }}
                className="w-full py-2.5 bg-stone-200 text-stone-800 text-xs font-bold rounded-xl hover:bg-stone-300"
              >
                Huỷ báo động (Tôi đã an toàn)
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-stone-600">
                Nhấn và giữ nút SOS trong <strong>3 giây</strong> để tránh chạm nhầm. Cảnh báo sẽ ngay
                lập tức gửi chuông báo ưu tiên đến điện thoại tất cả người thân.
              </p>

              {/* Big Hold-to-trigger SOS Button */}
              <div className="flex flex-col items-center justify-center py-4">
                <button
                  onMouseDown={() => setSosHolding(true)}
                  onMouseUp={() => setSosHolding(false)}
                  onTouchStart={() => setSosHolding(true)}
                  onTouchEnd={() => setSosHolding(false)}
                  className="relative w-28 h-28 rounded-full bg-red-600 text-white font-black text-xl shadow-xl flex items-center justify-center select-none active:scale-95 transition-transform"
                >
                  {/* Circular hold progress overlay */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="50"
                      stroke="#fecaca"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray="314"
                      strokeDashoffset={314 - (314 * holdProgress) / 100}
                      className="transition-all duration-100"
                    />
                  </svg>
                  <span className="relative z-10">SOS</span>
                </button>
                <span className="text-[11px] text-stone-500 mt-3 font-medium">
                  {sosHolding ? `Đang kích hoạt... ${holdProgress}%` : 'Chạm & Giữ 3 giây'}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
