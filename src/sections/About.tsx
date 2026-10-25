import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BookOpen, Code2, Flag, Plane, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** สิ่งที่ทำได้ในเว็บนี้ เรียงตามลำดับที่คนใหม่ควรทำ: เรียน → ลงมือ → ซ้อม → ดูสนาม → ดูผลงาน */
const items = [
  { n: '1', title: 'เรียนโดรนจากศูนย์', text: 'บทเรียนภาษาไทยกว่า 50 บท ตั้งแต่โดรนบินได้ยังไง ไปจนถึงฟิสิกส์', href: '/docs/start/how-a-drone-flies', cta: 'เปิดบทเรียน', Icon: BookOpen },
  { n: '2', title: 'เขียนโค้ดสั่งโดรน', text: 'สอนทีละขั้น พร้อมภาพ 3 มิติ และโค้ดตัวอย่างให้ดาวน์โหลด', href: '/docs/code/connect', cta: 'เริ่มเขียนโค้ด', Icon: Code2 },
  { n: '3', title: 'ซ้อมบินในสนามจำลอง', text: 'ลองคำสั่งบนสนามขนาดจริง พังในจอ ไม่เสียโดรน', href: '/simulator', cta: 'ลองบินจำลอง', Icon: Plane },
  { n: '4', title: 'ดูสนามและกติกาแข่ง', text: 'ภารกิจ การนับคะแนน และแผนที่สนามของแต่ละปี', href: '/field', cta: 'ดูสนามแข่ง', Icon: Flag },
  { n: '5', title: 'ดูผลงานรุ่นพี่', text: 'ผลงานและวิดีโอที่ชมรมเคยส่งแข่ง', href: '/works', cta: 'ดูผลงาน', Icon: Trophy },
] as const;

/**
 * ภาพรวมของเว็บ: ซ้าย = หัวข้อ + ปุ่มเริ่ม (ติดตามตอนเลื่อน) · ขวา = รายการ 5 ข้อเรียงตามลำดับ
 * อ่านซ้ายไปขวา บนลงล่าง ทุกข้อรูปแบบเดียวกัน (เลข · หัวข้อ · คำอธิบายบรรทัดเดียว · ภาพเล็ก)
 */
export function About() {
  return (
    <section id="about" data-pose="faq" className="mx-auto max-w-[84rem] px-4 py-24 sm:px-6 sm:py-32 xl:px-10">
      <div data-reveal-group>
        <div data-reveal-item className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-lg font-medium text-brand-blue">เว็บนี้ทำอะไรได้บ้าง</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:whitespace-nowrap">
              จากไม่เคยจับโดรน ถึงลงสนามแข่ง
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">ทำตามลำดับ 1 ถึง 5 ได้เลย ไม่ต้องมีพื้นฐานมาก่อน</p>
          </div>
          <Button size="lg" className="h-12 w-fit px-6 text-base" render={<Link href="/docs/start/how-a-drone-flies" />} nativeButton={false}>
            เริ่มจากข้อ 1 <ArrowRight className="size-5" aria-hidden />
          </Button>
        </div>

        <ol className="mt-10 grid gap-3">
          {items.map((p) => (
            <li key={p.n} data-reveal-item>
              <Link href={p.href} className="group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 squircle-3xl border border-line bg-surface p-4 transition-colors hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:grid-cols-[auto_minmax(0,1fr)_7.5rem] sm:gap-5 lg:grid-cols-[auto_minmax(0,1fr)_auto_9rem] lg:gap-6">
                <span className="grid size-11 place-items-center squircle-xl bg-foreground font-display text-xl font-extrabold text-background">{p.n}</span>
                <div className="min-w-0">
                  <h3 className="font-display text-2xl font-extrabold leading-tight sm:text-[1.7rem]">{p.title}</h3>
                  <p className="mt-1.5 text-base leading-7 text-muted-foreground sm:text-lg">{p.text}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-base font-semibold text-brand-blue lg:hidden">{p.cta} <ArrowUpRight className="size-4" aria-hidden /></span>
                </div>
                <span className="hidden items-center gap-1.5 whitespace-nowrap text-base font-semibold text-brand-blue lg:inline-flex">{p.cta} <ArrowUpRight className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></span>
                <div aria-hidden className={`hidden aspect-[4/3] place-items-center squircle-2xl sm:grid ${Number(p.n) % 2 ? 'bg-brand-blue/10 text-brand-blue' : 'bg-brand-red/10 text-brand-red'}`}>
                  <p.Icon className="size-11 transition-transform duration-500 group-hover:scale-110" strokeWidth={1.6} />
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
