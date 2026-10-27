import type { Metadata } from 'next';
import { shareMetadata } from '@/lib/og';

const title = 'เข้าสู่ระบบเรียนโดรน';
const description = 'เข้าสู่ระบบเพื่อบันทึกความคืบหน้าบทเรียนและภารกิจฝึกบิน';
export const metadata: Metadata = { title, description, robots: { index: false, follow: false }, ...shareMetadata({ title, description, path: '/login' }) };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
