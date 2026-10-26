'use client';

import { usePathname } from 'next/navigation';
import { Breadcrumbs, type Crumb } from '@/components/Breadcrumbs';

const names: Record<string, string> = { projects: 'ผลงาน', seasons: 'ฤดูกาล / กติกา', sections: 'หมวดเนื้อหา', challenges: 'โจทย์ตัวจำลอง', daily: 'ภารกิจรายวัน', users: 'สมาชิกและสิทธิ์', media: 'คลังรูป' };

/** เส้นทางหน้าของ /admin: หน้าแรก › จัดการเว็บไซต์ › หมวด › เพิ่ม/แก้ไข */
export function AdminCrumbs() {
  const seg = usePathname().split('/').filter(Boolean).slice(1); // ตัด "admin"
  const items: Crumb[] = [{ label: 'จัดการเว็บไซต์', href: seg.length ? '/admin' : undefined }];
  if (seg[0]) items.push({ label: names[seg[0]] ?? seg[0], href: seg[1] ? `/admin/${seg[0]}` : undefined });
  if (seg[1]) items.push({ label: seg[1] === 'new' ? 'เพิ่ม' : 'แก้ไข' });
  return <Breadcrumbs items={items} wrap={false} className="min-w-0" />;
}
