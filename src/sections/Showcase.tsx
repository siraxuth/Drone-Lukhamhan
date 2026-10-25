import Link from 'next/link';
import { getWorks, type Work } from '@/lib/works';
import { ShowcaseRail } from './ShowcaseRail';
import { ShowcaseCard } from './ShowcaseCard';

const when = (w: Work) => (w.sample ? 'ตัวอย่าง' : w.year ? `ปี ${w.year}` : '');

export async function Showcase() {
  const works = await getWorks(12);
  return (
    <section id="showcase" data-pose="showcase" className="py-24 sm:py-32">
      {/* container ครอบทั้งส่วน: หัวข้อ + แถวการ์ด · การ์ดเลื่อนอยู่ในกรอบ และเลือนหายที่ขอบซ้าย-ขวาของกรอบ */}
      <div className="mx-auto max-w-[100rem] px-4 sm:px-6 xl:px-10">
        <div data-reveal-group className="overflow-hidden squircle-3xl border border-line bg-surface-2 p-5 sm:p-10">
          <div className="flex items-end justify-between gap-4">
            <div data-reveal-item>
              <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">ผลงานที่ผ่านมา</h2>
              <p className="mt-2 text-lg text-muted-foreground">กดที่ผลงานเพื่อดูรายละเอียด รูป และสถานที่</p>
            </div>
            <Link data-reveal-item href="/works" className="inline-flex min-h-11 shrink-0 items-center px-1 text-base font-semibold text-brand-blue hover:underline">ดูทั้งหมด</Link>
          </div>
          <div data-reveal-item className="mt-8">
            <ShowcaseRail>
              {works.map((w, i) => <ShowcaseCard key={w.id} id={w.id} title={w.title} summary={w.summary} image={w.image} year={when(w)} location={w.location} n={i + 1} />)}
            </ShowcaseRail>
          </div>
        </div>
      </div>
    </section>
  );
}
