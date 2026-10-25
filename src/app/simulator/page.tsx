import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/sections/Header';
import { SiteFooter } from '@/sections/SiteFooter';
import { SimulatorApp } from '@/flight/SimulatorApp';
import { getScenarios } from '@/lib/scenario-data';
import { JsonLd } from '@/components/JsonLd';
import { simulatorSchema } from '@/lib/schema';

export const revalidate = 60;
export const metadata: Metadata = { title: 'ตัวจำลองการบิน', alternates: { canonical: '/simulator' }, description: 'เขียนโค้ดสั่งโดรนแล้วดูบินในสนาม 3 มิติขนาดจริง มีโจทย์ฝึกบนสนามกริด 5×5 เมตร ห่วง จุดผ่าน และต้นแบบภารกิจแข่ง' };

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
