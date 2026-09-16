import { api } from './api';

// Helper Chuyển đổi VAPID Key URL Safe Base64 sang Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushService = {
  // Xin quyền & Đăng ký Push Notification cho thiết bị di động
  async subscribeUser(userId: string): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Thiết bị hoặc trình duyệt không hỗ trợ Push Notifications.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Quyền thông báo bị từ chối.');
        return false;
      }

      // Đăng ký hoặc lấy Service Worker hiện tại
      const registration = await navigator.serviceWorker.ready;
      
      // Lấy VAPID public key từ backend server
      const publicKey = await api.getVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // Đăng ký Push Manager
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // Gửi PushSubscription object về MongoDB server
      await api.registerPushSubscription(userId, subscription);
      console.log('✅ Đã kích hoạt thông báo Push thành công cho thiết bị di động!');
      return true;
    } catch (err) {
      console.error('Lỗi khi đăng ký Web Push:', err);
      return false;
    }
  },
};
