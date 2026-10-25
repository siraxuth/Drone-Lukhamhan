import Link from 'next/link';
import { Button } from '@/components/ui/button';

const steps = [
  { t: 'อ่านบทแรก', d: 'เริ่มจากโดรนลอยได้ยังไง ใช้เวลาไม่กี่นาที', href: '/docs' },
  { t: 'ลองบินในจอ', d: 'พิมพ์คำสั่งแล้วดูโดรนบินในสนามจำลอง', href: '/simulator' },
  { t: 'ซ้อมวางตำแหน่ง', d: 'ลากโดรนไปวางในสนาม 3 มิติ ฝึกเล็งเป้า', href: '/field' },
  { t: 'ลงสนามจริง', d: 'มาซ้อมกับพี่ๆ ชมรม แล้วไปแข่งด้วยกัน', href: '/login' },
];

export function Steps() {
  return (
    <section id="join" data-pose="simulator" className="mx-auto max-w-[84rem] px-4 py-24 sm:px-6 xl:px-10 sm:py-32">
      <div data-reveal-group className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div>
          <h2 data-reveal-item className="font-display text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">อยากเข้าร่วม เริ่มได้เลย</h2>
          <div data-reveal-item className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="h-12 px-7 text-base" render={<Link href="/docs" />} nativeButton={false}>เริ่มเรียนเลย</Button>
          </div>
        </div>
        <ol className="grid gap-3">
          {steps.map((s, i) => (
            <li key={s.t} data-reveal-item>
              <Link href={s.href} className="group flex items-center gap-5 squircle-3xl border border-line bg-surface p-5 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
                <span className="grid size-14 shrink-0 place-items-center squircle-xl bg-foreground font-display text-2xl font-extrabold text-background">{i + 1}</span>
                <span><span className="block font-display text-2xl font-bold">{s.t}</span><span className="block text-lg text-muted-foreground">{s.d}</span></span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
