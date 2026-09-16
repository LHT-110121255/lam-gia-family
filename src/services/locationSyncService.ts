/**
 * Location Sync Service for Private Family Hub
 * Quản lý định vị GPS nền tự động chu kỳ 5 / 10 / 15 phút và phát tán Realtime qua Socket.IO / MongoDB
 */

import { familyService } from './familyService';
import { socketService } from './socket';
import { geocodingService } from './geocodingService';

class LocationSyncService {
  private syncTimer: number | null = null;
  private isSyncing = false;
  private lastSyncTimestamp: Date | null = null;
  private initialized = false;
  private unsubscribeSocket: (() => void) | null = null;

  /**
   * Khởi tạo dịch vụ đồng bộ vị trí
   */
  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Kết nối Socket và lắng nghe sự kiện cập nhật vị trí từ các thành viên khác
    socketService.connect();
    this.unsubscribeSocket = socketService.onLocationUpdated((data: any) => {
      if (!data || !data.userId) return;
      const currentMember = familyService.getCurrentMember();
      
      // Không cần cập nhật lại chính mình nếu nhận từ echo socket
      if (currentMember && currentMember.id === data.userId) {
        return;
      }

      familyService.updateMember(data.userId, {
        latitude: data.latitude,
        longitude: data.longitude,
        locationAddress: data.address || undefined,
        batteryLevel: data.batteryLevel !== undefined ? data.batteryLevel : undefined,
        lastLocationUpdated: data.updatedAt || new Date().toISOString(),
        lastSeen: 'Vừa xong',
        onlineStatus: 'online',
      });
    });

    // 2. Lắng nghe thay đổi cài đặt (khi người dùng đổi chu kỳ 5/10/15p hoặc tắt/bật chia sẻ)
    familyService.subscribe(() => {
      this.restartSyncSchedule();
    });

    // 3. Khởi động chu kỳ ban đầu
    this.restartSyncSchedule();

    // 4. Lắng nghe khi tab quay lại active (Visibility Change) để sync nhẹ
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          const settings = familyService.getSettings();
          if (settings.locationSharingAllowed && (settings.locationSyncInterval ?? 10) > 0) {
            // Nếu đã quá 3 phút kể từ lần sync cuối thì sync lại
            if (!this.lastSyncTimestamp || Date.now() - this.lastSyncTimestamp.getTime() > 3 * 60 * 1000) {
              this.syncCurrentLocation(false);
            }
          }
        }
      });
    }
  }

  /**
   * Đặt lại lịch đồng bộ dựa trên cài đặt hiện tại
   */
  public restartSyncSchedule(): void {
    if (this.syncTimer) {
      window.clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    const settings = familyService.getSettings();
    if (!settings.locationSharingAllowed) {
      return;
    }

    const intervalMinutes = settings.locationSyncInterval ?? 10;
    if (intervalMinutes <= 0) {
      // Chế độ 0: Chỉ đồng bộ thủ công khi vào bản đồ
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;

    // Thực hiện 1 lần sync đầu tiên nếu chưa có
    if (!this.lastSyncTimestamp) {
      this.syncCurrentLocation(false);
    }

    // Đặt vòng lặp định kỳ 5/10/15 phút
    this.syncTimer = window.setInterval(() => {
      this.syncCurrentLocation(false);
    }, intervalMs);
  }

  /**
   * Lấy % Pin của thiết bị (nếu trình duyệt hỗ trợ Battery API)
   */
  public async getBatteryLevel(): Promise<number | undefined> {
    try {
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        const battery: any = await (navigator as any).getBattery();
        if (battery && typeof battery.level === 'number') {
          return Math.round(battery.level * 100);
        }
      }
    } catch {
      // Browser doesn't support or permission blocked
    }
    return undefined;
  }

  /**
   * Đồng bộ vị trí hiện tại của người dùng đang đăng nhập lên MongoDB & Socket
   */
  public async syncCurrentLocation(isHighAccuracy = false): Promise<{
    success: boolean;
    lat?: number;
    lng?: number;
    address?: string;
    batteryLevel?: number;
    error?: string;
  }> {
    if (this.isSyncing) {
      return { success: false, error: 'Đang trong tiến trình định vị...' };
    }

    const currentMember = familyService.getCurrentMember();
    if (!currentMember || !currentMember.id) {
      return { success: false, error: 'Chưa xác định được thành viên hiện tại' };
    }

    this.isSyncing = true;

    try {
      // 1. Lấy tọa độ GPS / Network / IP qua bộ phân giải đa tầng
      const posResult = await geocodingService.getCurrentPosition();
      const lat = posResult.lat;
      const lng = posResult.lng;

      // 2. Lấy mức pin thiết bị
      const battery = await this.getBatteryLevel();

      // 3. Phân giải địa chỉ tiếng Việt chi tiết (BigDataCloud / OSM)
      let address = posResult.address || '';
      try {
        address = await geocodingService.reverseGeocode(lat, lng);
      } catch {
        address = `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }

      const finalLat = lat;
      const finalLng = lng;
      const finalAddress = address;

      const nowIso = new Date().toISOString();
      this.lastSyncTimestamp = new Date();

      // 4. Lưu cục bộ cho người dùng
      familyService.updateMember(currentMember.id, {
        latitude: finalLat,
        longitude: finalLng,
        locationAddress: finalAddress,
        batteryLevel: battery !== undefined ? battery : currentMember.batteryLevel,
        lastLocationUpdated: nowIso,
        lastSeen: 'Vừa xong',
        onlineStatus: 'online',
      });

      // 5. Gửi qua Socket.IO Realtime tới toàn gia đình & Lưu MongoDB
      socketService.updateLocation(currentMember.id, finalLat, finalLng, finalAddress);

      return {
        success: true,
        lat: finalLat,
        lng: finalLng,
        address: finalAddress,
        batteryLevel: battery,
      };
    } catch (err: any) {
      console.warn('Location Sync Note:', err?.message || err);
      return {
        success: false,
        error: err?.message || 'Không thể lấy định vị GPS hiện tại',
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Format thời gian cập nhật vị trí sang dạng dễ đọc ("Vừa xong", "5 phút trước", "14:30 hôm nay")
   */
  public formatLastUpdated(isoStringOrTimestamp?: string): string {
    if (!isoStringOrTimestamp) return 'Chưa cập nhật';
    
    try {
      const date = new Date(isoStringOrTimestamp);
      if (isNaN(date.getTime())) return isoStringOrTimestamp;

      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Vừa cập nhật';
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;

      return date.toLocaleDateString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return isoStringOrTimestamp;
    }
  }

  public getLastSyncTime(): Date | null {
    return this.lastSyncTimestamp;
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  public destroy(): void {
    if (this.syncTimer) {
      window.clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.unsubscribeSocket) {
      this.unsubscribeSocket();
      this.unsubscribeSocket = null;
    }
    this.initialized = false;
  }
}

export const locationSyncService = new LocationSyncService();
