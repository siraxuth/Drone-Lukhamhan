import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Header } from '@/sections/Header';
import { SiteFooter } from '@/sections/SiteFooter';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'เรียนแบบทีละขั้น', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** ทุกหน้าใต้ /learn ต้องล็อกอิน (ด่านแรกอยู่ที่ src/proxy.ts ด่านนี้ตรวจจริง) */
export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  if (!session) redirect('/login?next=/learn');
  return (
    <>
      <Header />
      {children}
      <SiteFooter />
    </>
  );
}
