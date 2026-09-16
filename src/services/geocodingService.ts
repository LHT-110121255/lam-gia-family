/**
 * Geocoding & Address Autocomplete Service for Vietbando Map
 */

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
}

// Danh mục địa điểm phổ biến của gia đình / Việt Nam làm fallback nhanh
const POPULAR_VIETNAM_PLACES: GeocodeResult[] = [
  { displayName: 'Cù Lao Long Trị (Cồn Long Trị), Long Đức, TP. Trà Vinh', lat: 9.9880, lng: 106.3530 },
  { displayName: 'Nhà Chính (Tiểu Cần, Trà Vinh / Vĩnh Long)', lat: 9.8189, lng: 106.2081 },
  { displayName: 'Thành phố Trà Vinh, Tỉnh Trà Vinh', lat: 9.9347, lng: 106.3456 },
  { displayName: 'Chợ Tiểu Cần, Huyện Tiểu Cần, Trà Vinh', lat: 9.8195, lng: 106.2065 },
  { displayName: 'Nhà Thờ Tổ / Quê Quán, Phú Cần, Tiểu Cần', lat: 9.8321, lng: 106.2215 },
  { displayName: 'Cầu Cổ Chiên, Trà Vinh - Bến Tre', lat: 10.0215, lng: 106.3812 },
  { displayName: 'Thành phố Vĩnh Long, Tỉnh Vĩnh Long', lat: 10.2537, lng: 105.9722 },
  { displayName: 'Cầu Cần Thơ, Ninh Kiều, Cần Thơ', lat: 10.0342, lng: 105.7876 },
  { displayName: 'Quận 1, Thành phố Hồ Chí Minh', lat: 10.7769, lng: 106.7009 },
  { displayName: 'Số 28 Ngõ 195 Phố Đội Cấn, Ba Đình, Hà Nội', lat: 21.0345, lng: 105.8211 },
];

export const geocodingService = {
  /**
   * Tìm kiếm gợi ý địa chỉ khi người dùng nhập chữ bằng tay
   */
  async searchAddress(query: string): Promise<GeocodeResult[]> {
    if (!query || query.trim().length < 2) return [];

    const cleanQuery = query.trim();

    try {
      // 1. Thử tìm qua Nominatim OSM API (hỗ trợ tiếng Việt và countrycode vn)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        cleanQuery
      )}&countrycodes=vn&addressdetails=1&limit=6`;

      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'vi,en;q=0.9',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => ({
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            type: item.type,
          }));
        }
      }
    } catch {
      // Ignore network / CORS errors and fallback to secondary source
    }

    try {
      // 2. Thử tìm qua Photon Komoot API
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=5&lang=vi`;
      const res = await fetch(photonUrl);
      if (res.ok) {
        const pData = await res.json();
        if (pData?.features?.length > 0) {
          return pData.features.map((f: any) => {
            const props = f.properties;
            const name = [props.name, props.street, props.city || props.district, props.state || props.country]
              .filter(Boolean)
              .join(', ');
            return {
              displayName: name || props.name || cleanQuery,
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
            };
          });
        }
      }
    } catch {
      // Fallback
    }

    // 3. Fallback tìm kiếm trong danh sách địa điểm nội bộ
    const lower = cleanQuery.toLowerCase();
    return POPULAR_VIETNAM_PLACES.filter((p) =>
      p.displayName.toLowerCase().includes(lower)
    );
  },

  /**
   * Lấy tên địa chỉ từ toạ độ click trên bản đồ (Reverse Geocoding)
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    // 1. Thử BigDataCloud Client API (siêu nhanh, hỗ trợ tiếng Việt chuẩn cấp phường/xã/quận/tỉnh)
    try {
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`;
      const res = await fetch(bdcUrl);
      if (res.ok) {
        const data = await res.json();
        const parts = [
          data.locality || data.localityInfo?.administrative?.[3]?.name,
          data.city || data.localityInfo?.administrative?.[2]?.name,
          data.principalSubdivision || data.localityInfo?.administrative?.[1]?.name,
          data.countryName || 'Việt Nam',
        ].filter(Boolean);

        const uniqueParts = Array.from(new Set(parts));
        if (uniqueParts.length > 0) {
          return uniqueParts.join(', ');
        }
      }
    } catch {
      // ignore & fallback
    }

    // 2. Thử Nominatim OpenStreetMap API
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'vi,en;q=0.9',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          return data.display_name;
        }
      }
    } catch {
      // Fallback
    }

    // Tọa độ định dạng đẹp nếu không có mạng
    return `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  },

  /**
   * Lấy vị trí hiện tại chính xác 100% từ phần cứng GPS / Wi-Fi Geolocation của thiết bị
   * Tuyệt đối không dùng IP Geolocation (tránh bị lệch về trạm mạng ISP tại TP.HCM)
   */
  async getCurrentPosition(): Promise<{
    lat: number;
    lng: number;
    source: 'gps' | 'network';
    address?: string;
  }> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Trình duyệt của bạn không hỗ trợ định vị Geolocation.');
    }

    return new Promise<{ lat: number; lng: number; source: 'gps' | 'network' }>((resolve, reject) => {
      // 1. Thử độ chính xác cao nhất (High Accuracy GPS) với timeout 15 giây
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            source: 'gps',
          });
        },
        (highErr) => {
          console.warn('GPS High Accuracy failed, trying standard location...', highErr);

          // 2. Thử chế độ mạng tiêu chuẩn (Cell/Wi-Fi triangulation)
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                source: 'network',
              });
            },
            (lowErr) => {
              let msg = 'Không thể xác định vị trí.';
              if (lowErr.code === lowErr.PERMISSION_DENIED) {
                msg = 'Quyền truy cập vị trí bị từ chối. Vui lòng cho phép quyền vị trí trên trình duyệt.';
              } else if (lowErr.code === lowErr.POSITION_UNAVAILABLE) {
                msg = 'Tín hiệu GPS/Vị trí không khả dụng trên thiết bị này.';
              } else if (lowErr.code === lowErr.TIMEOUT) {
                msg = 'Quá thời gian chờ phản hồi GPS.';
              }
              reject(new Error(msg));
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  },
};
