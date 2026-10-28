import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clapperboard, Palette, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const media = `${process.env.R2_PUBLIC_URL ?? 'https://cdn.dekgp.com'}/drone_lukhamhan/lessons/lettering`;

const points = [
  { icon: Clapperboard, title: 'มีคลิปทุกขั้น', body: 'บทเรียน 12 บท เรียงตามลำดับงานจริง ตั้งแต่ลง Blender จนส่งไฟล์' },
  { icon: Palette, title: 'วางจุด ลงสี ไล่สี', body: 'โดรน 1 ลำคือ 1 จุดแสง วางตามภาพต้นแบบแล้วให้แต่ละลำเปลี่ยนสีเอง' },
  { icon: ShieldCheck, title: 'ตรวจก่อนบินจริง', body: 'โปรแกรมเตือนเมื่อโดรนใกล้กันเกิน สูงเกิน หรือเร็วเกินกว่าที่ตั้งไว้' },
] as const;

/** ทางเข้าบทเรียนชุดโดรนแปรอักษร (แยกจากชุดโดรนมิชชั่น) */
export function Lettering() {
  return (
    <section id="lettering" data-pose="lettering" className="mx-auto max-w-[84rem] px-4 py-24 sm:px-6 xl:px-10 sm:py-32">
      <div data-reveal-group className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p data-reveal-item className="text-lg font-semibold text-brand-blue">บทเรียนอีกชุด</p>
          <h2 data-reveal-item className="mt-2 font-display text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">โดรนแปรอักษร</h2>
          <p data-reveal-item className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
            โดรนหลายสิบลำบินพร้อมกันแล้วเรียงเป็นตัวอักษรหรือรูปหัวใจบนท้องฟ้า งานนี้ออกแบบในโปรแกรม Blender 4.5 LTS ไม่ต้องเขียนโค้ดสั่งบินทีละลำ
          </p>
          <ul data-reveal-item className="mt-8 grid gap-4">
            {points.map((p) => (
              <li key={p.title} className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center squircle-xl bg-surface-2 text-brand-blue"><p.icon className="size-5" aria-hidden /></span>
                <span>
                  <span className="block text-lg font-bold">{p.title}</span>
                  <span className="block text-base leading-7 text-muted-foreground">{p.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <div data-reveal-item className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="h-12 px-6 text-base" render={<Link href="/docs/lettering" />} nativeButton={false}>เริ่มเรียนโดรนแปรอักษร <ArrowRight className="size-5" aria-hidden /></Button>
            <Button size="lg" variant="outline" className="h-12 px-6 text-base" render={<Link href="/docs/lettering/heart-demo" />} nativeButton={false}>ดูตัวอย่างรูปหัวใจ</Button>
          </div>
        </div>
        <Link href="/docs/lettering" data-reveal-item aria-label="เปิดบทเรียนโดรนแปรอักษร" className="group block overflow-hidden squircle-3xl border border-line bg-surface p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
          <div className="relative aspect-[16/10] overflow-hidden squircle-2xl bg-surface-2">
            <Image src={`${media}/demo-result.webp`} alt="ตัวอย่างงานโดรนแปรอักษรใน Blender: ลายสิงโตกับข้อความ 2569 ประกอบจากจุดโดรน" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]" />
          </div>
          <p className="px-2 pb-1 pt-3 text-base leading-7 text-muted-foreground">ตัวอย่างที่ออกแบบใน Blender: โดรนเป็นร้อยลำเรียงเป็นลายสิงโตและข้อความ</p>
        </Link>
      </div>
    </section>
  );
}
