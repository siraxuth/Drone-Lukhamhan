import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnimatedSpan, Terminal, TypingAnimation } from '@/components/ui/terminal';
import { quotes } from './content';

export function CodeSection() {
  return (
    <section id="code" data-pose="code" className="mx-auto max-w-6xl px-4 py-28">
      <div data-reveal-group className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p data-reveal-item className="text-sm font-medium text-brand-blue">โค้ดจริงของชมรม</p>
          <h2 data-reveal-item className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">จากความเข้าใจ สู่โค้ดจริง</h2>
          <p data-reveal-item className="quote mt-3 text-muted-foreground">“{quotes.code}”</p>
          <p data-reveal-item className="mt-6 max-w-md leading-relaxed text-muted-foreground">
            คำสั่งสั้นเหมือนพูด เช่น <code className="font-mono text-foreground">fw(250)</code> แปลว่าบินไปข้างหน้า 250 ซม. โดรนกะระยะจากเวลา (บินนานเท่าไร ไปไกลเท่านั้น) เหมือนเราเดินนับก้าว
          </p>
          <ul data-reveal-item className="mt-4 grid max-w-md gap-2 text-sm text-muted-foreground">
            <li>• <b className="text-foreground">calibration()</b> ตั้งศูนย์ก่อนบิน วางโดรนนิ่งๆ ห้ามจับ</li>
            <li>• <b className="text-foreground">sh(110)</b> บินที่ความสูง 110 ซม.</li>
            <li>• <b className="text-foreground">open_pair_ch1_ch4()</b> เปิดประตูปล่อยบอล</li>
          </ul>
          <div data-reveal-item className="mt-8 flex gap-3">
            <Button render={<Link href="/docs" />} nativeButton={false}>อ่านบทเขียนโค้ด</Button>
            <Button variant="outline" render={<Link href="/simulator" />} nativeButton={false}>ลองในตัวจำลอง</Button>
          </div>
        </div>
        <div data-reveal-item className="min-w-0">
          <Terminal className="squircle-2xl max-w-none">
            <TypingAnimation>{'> ภารกิจ KEY 1 : บินซ้ายแล้วปล่อยลูกบอล'}</TypingAnimation>
            <AnimatedSpan className="text-brand-blue">✔ calibration();   // ตั้งศูนย์ รอ 3 วินาที</AnimatedSpan>
            <AnimatedSpan className="text-brand-blue">✔ takeOff();       // ขึ้นบิน</AnimatedSpan>
            <AnimatedSpan className="text-brand-blue">✔ sh(110);         // บินสูง 110 ซม.</AnimatedSpan>
            <AnimatedSpan className="text-brand-blue">✔ fw(250);         // ไปข้างหน้า 250 ซม.</AnimatedSpan>
            <AnimatedSpan className="text-brand-blue">✔ ml(255);         // เลื่อนซ้าย 255 ซม.</AnimatedSpan>
            <AnimatedSpan className="text-brand-red">● open_pair_ch1_ch4();  // ปล่อยบอล!</AnimatedSpan>
            <AnimatedSpan className="text-brand-blue">✔ autoLand();      // ลงจอด</AnimatedSpan>
            <TypingAnimation>{'> ภารกิจสำเร็จ'}</TypingAnimation>
          </Terminal>
        </div>
      </div>
    </section>
  );
}
