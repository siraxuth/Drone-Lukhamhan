import pkg from '../../package.json';

/** ข้อมูลเว็บจุดเดียว: ใช้ใน metadata, sitemap, JSON-LD, OG image */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://drone.dekgp.com').replace(/\/$/, '');
export const SITE = {
  url: SITE_URL,
  name: 'ชมรมโดรน ลือคำหาญฯ',
  fullName: 'ชมรมโดรน โรงเรียนลือคำหาญวารินชำราบ',
  school: 'โรงเรียนลือคำหาญวารินชำราบ',
  description: 'เรียนโดรนจากศูนย์ ตั้งแต่หลักการบิน ฟิสิกส์ Arduino และเขียนโค้ดสั่งโดรน RCSA EDU ไปจนถึงลงสนามแข่ง พร้อมตัวจำลองการบิน 3 มิติขนาดสนามจริง ของชมรมโดรน โรงเรียนลือคำหาญวารินชำราบ อุบลราชธานี',
  keywords: [
    'ชมรมโดรน', 'โรงเรียนลือคำหาญวารินชำราบ', 'เรียนโดรน', 'โดรนเบื้องต้น', 'เขียนโค้ดสั่งโดรน', 'Arduino โดรน', 'RCSA EDU',
    'หนูน้อยจ้าวเวหา', 'แข่งโดรน', 'ตัวจำลองโดรน', 'drone simulator', 'ฟิสิกส์โดรน', 'โดรนอัตโนมัติ', 'C++ Arduino ภาษาไทย', 'ชมรมโดรน ลือคำหาญ',  'drone dekgp'
  ],
  locale: 'th_TH',
  version: pkg.version as string,
  /** ก้อน deploy ที่ไม่ใช่ production (preview/dev) ไม่ควรถูกจัดอันดับ */
  isProduction: process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : process.env.NODE_ENV === 'production',
} as const;

/** สร้าง URL เต็มจากพาธ */
export const abs = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/** ภาพแชร์ (Open Graph) ของทั้งเว็บ: public/brand/og.jpg ย่อจาก public/brand/ชมรมโดรน.jpg */
export const OG_IMAGE = { url: '/brand/og.jpg', width: 1200, height: 675, alt: 'ชมรมโดรน โรงเรียนลือคำหาญวารินชำราบ · drone.dekgp.com' };
