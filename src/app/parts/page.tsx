import type { Metadata } from 'next';
import { PartsLab } from '@/parts/PartsLab';
import { Header } from '@/sections/Header';
import { shareMetadata } from '@/lib/og';

const title = 'ชิ้นส่วนโดรนและโต๊ะฝึกประกอบ RCSA EDU';
const description = 'หมุนโมเดลโดรน 3 มิติ สำรวจมอเตอร์ ใบพัด เซ็นเซอร์ แบตเตอรี่ และลองประกอบคาน น็อต และสายไฟตามคู่มือ RCSA EDU ทีละขั้น';

export const metadata: Metadata = { title, description, alternates: { canonical: '/parts' }, ...shareMetadata({ title, description, path: '/parts' }) };

export default function PartsPage() {
  return <><Header autoHide /><main className="h-dvh overflow-hidden"><PartsLab /></main></>;
}
