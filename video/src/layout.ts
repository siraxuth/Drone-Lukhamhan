import { useVideoConfig } from 'remotion';

/**
 * ขนาดตัวอักษรและระยะปลอดภัยตามสัดส่วนภาพ
 * 9:16 เว้นบน 220 ล่าง 380 ขวา 120 กันปุ่มและคำบรรยายของ TikTok/Reels/Shorts ทับ
 */
export function useLayout() {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  return portrait
    ? { portrait, width, height, safe: { top: 220, bottom: 380, left: 80, right: 120 }, h1: 92, h2: 46, body: 38, gap: 48 }
    : { portrait, width, height, safe: { top: 96, bottom: 96, left: 120, right: 120 }, h1: 96, h2: 44, body: 32, gap: 64 };
}
export type Layout = ReturnType<typeof useLayout>;
