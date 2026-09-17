import { ToastMessage } from '../components/common/Toast';
import { ConfirmDialogOptions } from '../components/common/ConfirmDialog';
import { SOSAlertData } from '../components/common/SOSAlertModal';

type ToastInput =
  | string
  | {
      title?: string;
      text: string;
      type?: ToastMessage['type'];
      avatar?: string;
      senderName?: string;
      actionLabel?: string;
      onAction?: () => void;
      duration?: number;
    };

export const toast = {
  show(input: ToastInput, type: ToastMessage['type'] = 'info') {
    if (typeof window === 'undefined') return;
    const detail =
      typeof input === 'string'
        ? { text: input, type }
        : { type: input.type || type, ...input };

    window.dispatchEvent(
      new CustomEvent('family_toast_show', {
        detail: {
          id: 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          ...detail,
        },
      })
    );
  },

  success(text: string, title?: string, actionLabel?: string, onAction?: () => void) {
    this.show({ text, title, type: 'success', actionLabel, onAction });
  },

  error(text: string, title?: string) {
    this.show({ text, title, type: 'error' });
  },

  warning(text: string, title?: string) {
    this.show({ text, title, type: 'warning' });
  },

  info(text: string, title?: string) {
    this.show({ text, title, type: 'info' });
  },

  message(text: string, senderName?: string, avatar?: string, onAction?: () => void) {
    this.show({
      text,
      title: senderName ? `Tin nhắn từ ${senderName}` : 'Tin nhắn mới',
      avatar,
      senderName,
      type: 'message',
      actionLabel: 'Xem ngay',
      onAction,
    });
  },

  sos(userName: string, address?: string, onAction?: () => void) {
    this.show({
      title: '🚨 CẢNH BÁO SOS KHẨN CẤP!',
      text: `${userName} vừa phát tín hiệu SOS${address ? ` tại ${address}` : ''}!`,
      type: 'sos',
      actionLabel: 'Xem bản đồ',
      onAction,
      duration: 8000,
    });
  },
};

export const confirmModal = (options: ConfirmDialogOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    const originalOnConfirm = options.onConfirm;
    const originalOnCancel = options.onCancel;

    window.dispatchEvent(
      new CustomEvent('family_confirm_show', {
        detail: {
          ...options,
          onConfirm: () => {
            if (originalOnConfirm) originalOnConfirm();
            resolve(true);
          },
          onCancel: () => {
            if (originalOnCancel) originalOnCancel();
            resolve(false);
          },
        },
      })
    );
  });
};

export const triggerSOSModal = (data: SOSAlertData) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('family_sos_modal_show', {
      detail: data,
    })
  );
};
