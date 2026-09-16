import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share2, X, Smartphone } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  return (
    <>
      {(isInstallable || isIOS) && (
        <div className="mx-4 my-2 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-200/80 shadow-xs flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-10 h-10 rounded-xl object-contain shrink-0 drop-shadow-xs"
            />
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-stone-900 truncate">Cài đặt ứng dụng Lâm Gia</h4>
              <p className="text-[11px] text-stone-600 truncate">Mở nhanh trên màn hình chính, xem offline</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Cài đặt</span>
              </button>
            )}

            {isIOS && !isInstallable && (
              <button
                onClick={() => setShowIOSGuide(true)}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Thêm Home</span>
              </button>
            )}

            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg"
              aria-label="Bỏ qua"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Guided Install Sheet */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#FFFBF7] p-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-3">
              <h3 className="text-base font-bold text-stone-900">Cài đặt trên iPhone / iPad</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-stone-700">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p>Chạm vào biểu tượng <strong>Chia sẻ (Share)</strong> ở thanh dưới cùng Safari.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p>Kéo xuống và chọn <strong>Thêm vào MH chính (Add to Home Screen)</strong>.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p>Nhấn <strong>Thêm (Add)</strong> ở góc trên bên phải để hoàn tất.</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
};
