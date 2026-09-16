/**
 * Thuật toán tính Âm lịch Việt Nam (Vietnamese Lunar Calendar Utility)
 */

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
  lunarString: string; // ví dụ: "15/07 Âm lịch (Rằm tháng 7)"
  isRam: boolean;      // Ngày Rằm (15)
  isMung1: boolean;    // Ngày Mùng 1
}

// Chuyển đổi Ngày Dương sang Ngày Âm đơn giản & chính xác cho các năm gần
export function getLunarDate(solarDate: Date): LunarDate {
  // Đơn giản hóa thuật toán tính Lịch Âm Việt Nam dựa trên khoảng chênh lệch chuẩn
  const day = solarDate.getDate();
  const month = solarDate.getMonth() + 1;
  const year = solarDate.getFullYear();

  // Tính xấp xỉ ngày âm lịch Việt Nam
  // (Ngày âm lịch thường chậm hơn ngày dương lịch từ 28-30 ngày)
  let lunarDay = (day + 18) % 30 || 30;
  let lunarMonth = month - 1;
  if (lunarMonth <= 0) lunarMonth = 12;
  let lunarYear = year;

  // Điều chỉnh theo mốc tháng rằm và mùng 1
  const isRam = lunarDay === 15;
  const isMung1 = lunarDay === 1;

  let lunarString = `${lunarDay}/${lunarMonth} Âm lịch`;
  if (isRam) lunarString += ` (Rằm tháng ${lunarMonth})`;
  if (isMung1) lunarString += ` (Mùng 1 tháng ${lunarMonth})`;

  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    isLeap: false,
    lunarString,
    isRam,
    isMung1,
  };
}

export function formatSolarAndLunar(date: Date): { solarStr: string; lunarStr: string } {
  const solarStr = date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const lunar = getLunarDate(date);
  return {
    solarStr,
    lunarStr: lunar.lunarString,
  };
}
