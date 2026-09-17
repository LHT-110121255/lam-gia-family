import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Phone, MapPin, X, Navigation } from 'lucide-react';

export interface SOSAlertData {
  userId?: string;
  userName?: string;
  userAvatar?: string;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
}

interface SOSAlertModalProps {
  isOpen: boolean;
  alertData: SOSAlertData | null;
  onClose: () => void;
  onOpenMap?: () => void;
}

export const SOSAlertModal: React.FC<SOSAlertModalProps> = ({
  isOpen,
  alertData,
  onClose,
  onOpenMap,
}) => {
  if (!isOpen || !alertData) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
        {/* Animated Pulsing Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-red-950/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Pulsing Aura */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: 'easeInOut',
          }}
          className="absolute w-80 h-80 rounded-full bg-red-600/30 blur-3xl pointer-events-none"
        />

        {/* Alert Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border-2 border-red-500/80 p-6 z-10 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            {/* Siren Icon with Ring Pulsing */}
            <div className="relative mb-4">
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-full bg-red-500/30 blur-md"
              />
              <div className="relative w-18 h-18 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-500/40 ring-8 ring-red-100 animate-pulse">
                <ShieldAlert className="w-9 h-9" />
              </div>
            </div>

            {/* Badge */}
            <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-black uppercase tracking-wider mb-2">
              🚨 Tín Hiệu Khẩn Cấp SOS
            </span>

            {/* Title */}
            <h3 className="text-xl font-black text-stone-900 tracking-tight mb-1">
              {alertData.userName || 'Thành viên gia đình'}
            </h3>
            <p className="text-xs text-red-600 font-bold mb-4">
              Vừa kích hoạt nút phát cảnh báo cứu trợ!
            </p>

            {/* Location & Details Card */}
            <div className="w-full bg-stone-50 rounded-2xl p-3.5 border border-stone-200/80 space-y-2 text-left text-xs mb-5">
              {alertData.address && (
                <div className="flex items-start gap-2 text-stone-700">
                  <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="font-medium line-clamp-2">{alertData.address}</span>
                </div>
              )}
              {alertData.timestamp && (
                <div className="flex items-center gap-2 text-stone-500 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>Thời gian: {alertData.timestamp}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 w-full">
              {alertData.phone && (
                <a
                  href={`tel:${alertData.phone}`}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-98"
                >
                  <Phone className="w-4 h-4" />
                  <span>Gọi điện khẩn cấp ({alertData.phone})</span>
                </a>
              )}

              {onOpenMap && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenMap();
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition active:scale-98"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Xem vị trí trực tiếp trên bản đồ</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition active:scale-98"
              >
                Đã hiểu & Đóng thông báo
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
