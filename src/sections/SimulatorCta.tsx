import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { quotes } from './content';

export function SimulatorCta() {
  return (
    <section id="simulator" data-pose="simulator" className="py-28">
      <div data-reveal-group className="mx-auto max-w-5xl px-4 text-center">
        <h2 data-reveal-item className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">ลองบินในจอก่อน</h2>
        <p data-reveal-item className="quote mt-3 text-muted-foreground">“{quotes.simulator}”</p>
        <div data-reveal-item className="mt-8"><Button size="lg" variant="outline" render={<Link href="/simulator" />} nativeButton={false}>เปิดตัวจำลองการบิน</Button></div>
        <div data-reveal-item className="squircle-2xl mx-auto mt-12 grid aspect-video max-w-3xl place-items-center border border-dashed border-line text-muted-foreground">
          <p>พื้นที่สำหรับวิดีโอโดรนแปรอักษร (Blender) — เร็วๆ นี้</p>
        </div>
      </div>
    </section>
  );
}
