import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  options: ConfirmDialogOptions | null;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  options,
  onClose,
}) => {
  if (!isOpen || !options) return null;

  const type = options.type || 'danger';
  const confirmText = options.confirmText || (type === 'danger' ? 'Xóa vĩnh viễn' : 'Xác nhận');
  const cancelText = options.cancelText || 'Hủy bỏ';

  const handleConfirm = () => {
    if (options.onConfirm) options.onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (options.onCancel) options.onCancel();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCancel}
          className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200/80 p-5 z-10 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center text-center pt-2">
            {/* Icon Header */}
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${
                type === 'danger'
                  ? 'bg-rose-100 text-rose-600 ring-8 ring-rose-50'
                  : type === 'warning'
                  ? 'bg-amber-100 text-amber-600 ring-8 ring-amber-50'
                  : 'bg-blue-100 text-blue-600 ring-8 ring-blue-50'
              }`}
            >
              {type === 'danger' ? (
                <Trash2 className="w-7 h-7" />
              ) : type === 'warning' ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <Info className="w-7 h-7" />
              )}
            </div>

            {/* Title & Message */}
            <h3 className="text-base font-extrabold text-stone-900 tracking-tight mb-1.5">
              {options.title}
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed max-w-xs mb-6 font-medium">
              {options.message}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 w-full">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition active:scale-98"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`flex-1 py-2.5 px-4 rounded-2xl text-white text-xs font-bold shadow-md transition active:scale-98 ${
                  type === 'danger'
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-600/25'
                    : type === 'warning'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-600/25'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
