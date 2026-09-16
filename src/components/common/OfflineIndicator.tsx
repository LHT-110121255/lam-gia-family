import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg animate-fade-in backdrop-blur-xs">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Đang ngoại tuyến — Sử dụng dữ liệu lưu sẵn</span>
    </div>
  );
};
