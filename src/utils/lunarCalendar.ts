/**
 * Vietnamese Lunar Calendar Calculation Helper
 * Supports approximate lunar day/month calculation and lunar event formatting for Vietnamese culture.
 */

// Vietnamese Heavenly Stems & Earthly Branches for Zodiac/Year
const CAN = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
const CHI = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'];

export function getCanChiYear(year: number): string {
  const can = CAN[year % 10];
  const chi = CHI[year % 12];
  return `${can} ${chi}`;
}

/**
 * Approximate lunar date converter from solar date
 * (Used for friendly multi-generational display: mùng 1, rằm 15, ngày âm)
 */
export function getLunarDisplay(solarDate: Date): { day: number; month: number; year: number; text: string; isAuspicious?: boolean } {
  // Approximate offset algorithm calibrated for 2024-2026
  const baseSolar = new Date(2024, 0, 1).getTime();
  const currentSolar = solarDate.getTime();
  const diffDays = Math.floor((currentSolar - baseSolar) / (1000 * 60 * 60 * 24));
  
  // Lunar cycle is ~29.530588 days
  const lunarCycle = 29.530588;
  const cycleIndex = (diffDays - 41) / lunarCycle;
  const rawDay = Math.floor((cycleIndex % 1) * lunarCycle) + 1;
  const day = Math.min(30, Math.max(1, rawDay));

  // Determine approximate lunar month
  const solarMonth = solarDate.getMonth() + 1; // 1-12
  let lunarMonth = solarMonth - 1;
  if (lunarMonth <= 0) lunarMonth += 12;

  const year = solarDate.getFullYear();
  const lunarYearStr = getCanChiYear(year);

  const text = `${day < 10 ? 'Mùng ' + day : day}/${lunarMonth} Âm lịch (${lunarYearStr})`;
  const isAuspicious = day === 1 || day === 15;

  return { day, month: lunarMonth, year, text, isAuspicious };
}

export function formatVietnameseDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][d.getDay()];
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${dayOfWeek}, ${day} tháng ${month}, ${year}`;
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}
