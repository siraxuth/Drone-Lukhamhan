import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, ExternalLink, MapPin, Ruler } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Header } from '@/sections/Header';
import { SiteFooter } from '@/sections/SiteFooter';
import { Tour } from '@/components/Tour';
import { fieldTour } from '@/lib/tours';
import { FieldExplorer } from '@/field/FieldExplorer';
import { currentSeason as s } from '@/rules';
import { shareMetadata } from '@/lib/og';

const title = `สนามและกติกาการแข่งขัน ${s.year}`;
const description = `กติกาการแข่งขัน ${s.title} พร้อมสนามจำลอง 3 มิติขนาดจริง 10×10 เมตร ดูภารกิจ จุดผ่าน และวิธีเก็บคะแนนก่อนลงสนาม`;

export const metadata: Metadata = {
  title,
  alternates: { canonical: '/field' },
  description,
  ...shareMetadata({ title, description, path: '/field' }),
};

const facts = [
  { Icon: CalendarDays, text: s.dates },
  { Icon: MapPin, text: s.venue },
  { Icon: Ruler, text: 'สนามขนาด 10 × 10 เมตร' },
];

export default function FieldPage() {
  return (
    <>
      <Header />
      <Tour id="field" steps={fieldTour} />
      <Breadcrumbs items={[{ label: 'สนามและกติกา' }]} />
      <main className="mx-auto grid max-w-[84rem] gap-16 px-4 pb-32 pt-4 sm:px-6 xl:px-10">
        <header className="grid max-w-4xl gap-4">
          <p className="text-lg font-medium text-brand-blue">{s.title}</p>
          <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-balance sm:text-6xl">สนามและกติกาการแข่งขัน</h1>
          <p className="text-lg leading-8 text-muted-foreground">เลือกประเภท แล้วดูโดรนบินในสนามขนาดจริง พร้อมอ่านว่าต้องทำอะไรและได้คะแนนยังไง</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {facts.map(({ Icon, text }) => (
              <li key={text} className="inline-flex items-center gap-2 squircle-xl border border-line bg-surface px-3 py-1.5 text-base"><Icon className="size-4 text-muted-foreground" aria-hidden /> {text}</li>
            ))}
          </ul>
        </header>

        <div data-tour="field-explorer">
        <Suspense fallback={<div className="h-96 animate-pulse squircle-3xl bg-surface-2" />}>
          <FieldExplorer season={s} />
        </Suspense>
        </div>

        <section aria-labelledby="more" className="grid gap-4">
          <h2 id="more" className="font-display text-2xl font-extrabold sm:text-3xl">ข้อมูลอื่นที่ควรรู้</h2>
          <Accordion className="max-w-4xl">
            <AccordionItem value="common">
              <AccordionTrigger className="text-lg">กติกาที่ใช้ร่วมกันทุกประเภท</AccordionTrigger>
              <AccordionContent><ul className="grid gap-2 text-base leading-7">{s.common.map((c) => <li key={c}>• {c}</li>)}</ul></AccordionContent>
            </AccordionItem>
            <AccordionItem value="entry">
              <AccordionTrigger className="text-lg">การสมัครและการเข้ารอบ</AccordionTrigger>
              <AccordionContent><ul className="grid gap-2 text-base leading-7">{s.entry.map((c) => <li key={c}>• {c}</li>)}</ul></AccordionContent>
            </AccordionItem>
            <AccordionItem value="prizes">
              <AccordionTrigger className="text-lg">รางวัล</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-5">
                  {s.prizes.map((p) => (
                    <div key={p.stage}>
                      <p className="text-base font-bold">{p.stage}</p>
                      <ul className="mt-2 grid gap-1.5">{p.rows.map((r) => <li key={r.rank} className="flex flex-wrap justify-between gap-2 text-base"><span className="font-medium">{r.rank}</span><span className="text-muted-foreground">{r.prize}</span></li>)}</ul>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="approx">
              <AccordionTrigger className="text-lg">ค่าไหนระบุในกติกา ค่าไหนประมาณ</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 text-base leading-7 text-muted-foreground">
                  <p><b className="text-foreground">ระบุในกติกา:</b> สนาม 10×10 ม., แท่นทิ้งสัมภาระ Ø1 ม. สูง 20 ซม. อยู่ที่ ±2.5 ม. จากกลางสนาม, แท่น Takeoff 1.5×1.5 ม. สูง 20 ซม., ห่วง 1×1 ม. สูง 1.2 ม., เสาลูกโป่งรวมลูกโป่งสูง 1.6 ม., เป้า Ø1 ม. กึ่งกลางสูง 1.4 ม., ห่างเป้าอย่างน้อย 1 ม. ก่อนยิง</p>
                  <p><b className="text-foreground">ประมาณจากภาพ (กติกาไม่ได้ระบุเป็นตัวเลข):</b> ความสูงฝาครอบใสรอบแท่น, ขนาดหน้าตัดเสาลูกโป่งและระยะห่างระหว่างเสา, ความสูงป้ายและเสาด้านข้าง, ขนาดโต๊ะผู้แข่งขัน</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <a href={s.source.url} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-base text-brand-blue hover:underline"><ExternalLink className="size-4" aria-hidden /> {s.source.label} (PDF)</a>
        </section>

        <section className="grid items-center gap-5 squircle-3xl border border-line bg-surface p-6 sm:grid-cols-[1fr_auto] sm:p-8">
          <div>
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">อยากลองสั่งโดรนเอง?</h2>
            <p className="mt-1.5 text-lg text-muted-foreground">เขียนโค้ดแล้วดูโดรนบินในสนามเดียวกันนี้ พร้อมคะแนนตามกติกา</p>
          </div>
          <Button size="lg" className="h-12 px-6 text-base" render={<Link href="/simulator" />} nativeButton={false}>เปิดตัวจำลอง <ArrowRight className="size-5" aria-hidden /></Button>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
