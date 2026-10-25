import Link from 'next/link';
import { Box, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldPlan2D } from '@/field/FieldPlan2D';
import { currentSeason } from '@/rules';

/** โชว์สนามจริง 10×10 ม. และทางเข้าตัวจำลอง — ไม่อธิบายกติกา (อยู่ในหน้า /field) */
export function Field() {
  const ev = currentSeason.events[0];
  return (
    <section id="field" data-pose="field" className="mx-auto max-w-[84rem] px-4 py-24 sm:px-6 xl:px-10 sm:py-32">
      <div data-reveal-group className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 data-reveal-item className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">ซ้อมในสนามจำลอง</h2>
          <div data-reveal-item className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="h-12 px-6 text-base" render={<Link href="/simulator" />} nativeButton={false}><Plane className="size-5" aria-hidden /> ลองบินจำลอง</Button>
            <Button size="lg" variant="outline" className="h-12 px-6 text-base" render={<Link href="/field" />} nativeButton={false}><Box className="size-5" aria-hidden /> ดูสนาม 3 มิติ</Button>
          </div>
        </div>
        <div data-reveal-item className="squircle-3xl border border-line bg-surface p-3" aria-hidden>
          <FieldPlan2D event={ev} interactive={false} className="w-full" />
        </div>
      </div>
    </section>
  );
}
