import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/sections/Header';
import { SiteFooter } from '@/sections/SiteFooter';
import { SimulatorApp } from '@/flight/SimulatorApp';
import { getScenarios } from '@/lib/scenario-data';
import { JsonLd } from '@/components/JsonLd';
import { simulatorSchema } from '@/lib/schema';
import { shareMetadata } from '@/lib/og';

export const revalidate = 60;
const title = 'ตัวจำลองการบินโดรน 3 มิติ';
const description = 'เขียนโค้ดสั่งโดรนและทดลองบินในสนามจำลอง 3 มิติขนาดจริง พร้อมโจทย์กริด 5×5 เมตร ห่วง จุดผ่าน และภารกิจแข่ง';
export const metadata: Metadata = { title, alternates: { canonical: '/simulator' }, description, ...shareMetadata({ title, description, path: '/simulator' }) };

export default async function Page() {
  const scenarios = await getScenarios();
  return (
    <>
      <Header />
      <JsonLd data={simulatorSchema()} />
      <Suspense fallback={<div className="p-24 text-center text-muted-foreground">กำลังโหลด…</div>}>
        <SimulatorApp scenarios={scenarios} />
      </Suspense>
      <SiteFooter />
    </>
  );
}
