import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  ShieldAlert,
  MessageCircle,
  X,
  ArrowRight,
} from 'lucide-react';
import { Avatar } from './Avatar';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'sos' | 'message';
  title?: string;
  text: string;
  avatar?: string;
  senderName?: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

// Sound Synthesizer using Web Audio API (No external asset dependency)
const playNotificationSound = (type: ToastMessage['type']) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'sos') {
      // Urgent siren double tone
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'error') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      // Crisp pleasant chime for success/info/message
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // AudioContext blocked or not allowed by user interaction policy
  }
};

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  useEffect(() => {
    if (toasts.length > 0) {
      const latest = toasts[toasts.length - 1];
      playNotificationSound(latest.type);
    }
  }, [toasts.length]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[2500] flex flex-col items-center gap-2.5 pointer-events-none w-full max-w-md px-3 sm:px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const isSOS = toast.type === 'sos';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';
          const isMessage = toast.type === 'message';
          const isSuccess = toast.type === 'success';

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, scale: 0.9, filter: 'blur(4px)' }}
              transition={{ type: 'spring', damping: 22, stiffness: 350 }}
              className={`pointer-events-auto w-full rounded-3xl p-3.5 shadow-2xl backdrop-blur-xl border transition-all duration-300 relative overflow-hidden flex items-start gap-3 ${
                isSOS
                  ? 'bg-red-950/95 text-red-50 border-red-500/60 ring-4 ring-red-500/20 shadow-red-900/40'
                  : isError
                  ? 'bg-rose-950/90 text-rose-50 border-rose-700/50 shadow-rose-950/30'
                  : isWarning
                  ? 'bg-amber-950/90 text-amber-50 border-amber-600/50 shadow-amber-950/30'
                  : isMessage
                  ? 'bg-stone-900/90 text-stone-50 border-stone-700/60 shadow-black/40'
                  : isSuccess
                  ? 'bg-emerald-950/90 text-emerald-50 border-emerald-600/50 shadow-emerald-950/30'
                  : 'bg-stone-900/90 text-stone-50 border-stone-700/60 shadow-black/40'
              }`}
            >
              {/* Glowing Accent Gradient Background */}
              <div
                className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40 ${
                  isSOS
                    ? 'bg-red-500'
                    : isError
                    ? 'bg-rose-500'
                    : isWarning
                    ? 'bg-amber-500'
                    : isSuccess
                    ? 'bg-emerald-500'
                    : 'bg-orange-500'
                }`}
              />

              {/* Icon / Avatar Badge */}
              <div className="shrink-0 mt-0.5">
                {toast.avatar ? (
                  <Avatar src={toast.avatar} name={toast.senderName || 'Người thân'} size="sm" />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-inner ${
                      isSOS
                        ? 'bg-red-600 text-white animate-pulse shadow-red-500/50'
                        : isError
                        ? 'bg-rose-600/80 text-white'
                        : isWarning
                        ? 'bg-amber-500/80 text-white'
                        : isSuccess
                        ? 'bg-emerald-600/80 text-white'
                        : isMessage
                        ? 'bg-blue-600/80 text-white'
                        : 'bg-orange-600/80 text-white'
                    }`}
                  >
                    {isSOS ? (
                      <ShieldAlert className="w-5 h-5 animate-bounce" />
                    ) : isError ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : isSuccess ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isMessage ? (
                      <MessageCircle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>
                )}
              </div>

              {/* Content Box */}
              <div className="flex-1 min-w-0 pr-6">
                {toast.title && (
                  <h4
                    className={`text-xs font-extrabold tracking-tight truncate mb-0.5 ${
                      isSOS
                        ? 'text-red-300 uppercase'
                        : isError
                        ? 'text-rose-300'
                        : isWarning
                        ? 'text-amber-300'
                        : isSuccess
                        ? 'text-emerald-300'
                        : 'text-stone-200'
                    }`}
                  >
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs text-stone-200/90 font-medium leading-relaxed line-clamp-2">
                  {toast.text}
                </p>

                {/* Optional Action Button */}
                {toast.actionLabel && toast.onAction && (
                  <button
                    onClick={() => {
                      toast.onAction?.();
                      onDismiss(toast.id);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold tracking-wide transition active:scale-95"
                  >
                    <span>{toast.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(toast.id);
                }}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition"
                aria-label="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
