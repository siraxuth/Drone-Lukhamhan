import { ogImage, OG_SIZE } from '@/lib/og';
import { SITE } from '@/lib/site';

export const runtime = 'nodejs';
export const alt = SITE.fullName;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return ogImage({ title: 'เรียนโดรนจากศูนย์ ถึงลงสนามแข่ง', sub: 'บทเรียนภาษาไทย เขียนโค้ดสั่งโดรน และตัวจำลองการบิน 3 มิติ' });
}
