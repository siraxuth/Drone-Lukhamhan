import { NumberTicker } from '@/components/ui/number-ticker';

const items = [
  { v: 3, s: '', l: 'ประเภทการแข่งขัน' },
  { v: 10, s: ' ม.', l: 'ด้านของสนามจำลอง เท่าของจริง' },
  { v: 100, s: ' คะแนน', l: 'เต็มในภารกิจตัวอย่าง' },
  { v: 7, s: '', l: 'เรื่องพื้นฐานการบิน' },
];

export function Numbers() {
  return (
    <section aria-label="ตัวเลขของเรา" className="mx-auto max-w-[84rem] px-4 py-12 sm:px-6 xl:px-10">
      <dl data-reveal-group className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.l} data-reveal-item className="squircle-3xl border border-line bg-surface p-6">
            <dd className="font-display text-5xl font-extrabold text-brand-blue sm:text-6xl"><NumberTicker value={i.v} />{i.s}</dd>
            <dt className="mt-2 text-lg text-muted-foreground">{i.l}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
