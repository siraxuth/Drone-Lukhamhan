'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, ArrowRight, BookOpen, Check, Flame, Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Inline } from '@/learn/Inline';
import type { Unit } from '@/learn/types';
import { completeUnit, type CompleteResult } from '../../actions';

type Props = {
  track: { id: string; title: string; accent: 'blue' | 'red' | 'emerald' };
  unit: Unit;
  index: number;
  total: number;
  alreadyDone: boolean;
  next: { href: string; title: string } | null;
};

/** เล่นหน่วยเรียนทีละการ์ด: แถบความคืบหน้า · ย้อนกลับ/ถัดไป · จบหน่วยแล้วรับ XP (ตัดสินที่เซิร์ฟเวอร์) */
export function UnitPlayer({ track, unit, index, total, alreadyDone, next }: Props) {
  const [i, setI] = useState(0);
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [pending, start] = useTransition();
  const card = useRef<HTMLDivElement>(null);
  const last = i === unit.steps.length - 1;
  const step = unit.steps[i];
  const pct = result?.ok ? 100 : Math.round((i / unit.steps.length) * 100);

  useEffect(() => { card.current?.focus({ preventScroll: true }); }, [i]);
  useEffect(() => {
    if (result?.ok && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void confetti({ particleCount: 120, spread: 80, origin: { y: 0.65 } });
    }
  }, [result]);

  const finish = () => start(async () => setResult(await completeUnit(unit.id)));

  return (
    <main className="mx-auto grid max-w-2xl gap-5 px-4 pb-32 pt-28 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/learn" aria-label="กลับไปเส้นทางเรียน" className="grid size-11 shrink-0 place-items-center squircle-xl border border-line bg-surface hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand-blue"><X className="size-5" aria-hidden /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{track.title} · หน่วยที่ {index + 1}/{total}</p>
          <div role="progressbar" aria-label="ความคืบหน้าในหน่วยนี้" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-2.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand-blue transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      {result?.ok ? (
        <section aria-live="polite" className="grid gap-4 squircle-2xl border border-line bg-surface p-6 text-center sm:p-8">
          <span aria-hidden className="mx-auto grid size-16 place-items-center rounded-full bg-brand-blue text-white"><Check className="size-8" /></span>
          <h1 className="font-display text-3xl font-extrabold leading-tight">จบหน่วย “{unit.title}”</h1>
          <p className="text-lg text-muted-foreground">{result.firstTime ? `ได้รับ +${result.xpGained} XP` : 'ทบทวนซ้ำ ไม่ได้ XP เพิ่ม (รับเฉพาะครั้งแรกที่จบ)'}</p>
          <div className="flex flex-wrap justify-center gap-3 text-base">
            <span className="squircle-xl bg-surface-2 px-3 py-1.5 font-semibold">รวม {result.xp} XP · ระดับ {result.level}</span>
            <span className="inline-flex items-center gap-1.5 squircle-xl bg-surface-2 px-3 py-1.5 font-semibold"><Flame className="size-4 text-orange-500" aria-hidden /> เรียนต่อเนื่อง {result.streak} วัน</span>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {next && <Link href={next.href} className="inline-flex h-12 items-center gap-2 squircle-xl bg-brand-blue px-6 text-base font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">หน่วยถัดไป: {next.title} <ArrowRight className="size-4" aria-hidden /></Link>}
            <Link href="/learn" className="inline-flex h-12 items-center gap-2 squircle-xl border border-line px-6 text-base font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">กลับเส้นทางเรียน</Link>
          </div>
        </section>
      ) : (
        <>
          <article ref={card} tabIndex={-1} aria-labelledby="step-title" className="grid gap-4 squircle-2xl border border-line bg-surface p-5 outline-none sm:p-8">
            <p className="text-sm font-semibold text-brand-blue">{unit.title} · การ์ด {i + 1}/{unit.steps.length}</p>
            <h1 id="step-title" className="font-display text-2xl font-extrabold leading-snug sm:text-3xl">{step.title}</h1>
            {step.body.map((p, k) => <p key={k} className="text-lg leading-8"><Inline text={p} /></p>)}
            {step.code && <pre className="overflow-x-auto squircle-xl border border-line bg-[#fbfbfd] p-4 font-mono text-sm leading-6 dark:bg-[#10131a]"><code>{step.code}</code></pre>}
            {step.tip && <p className="flex items-start gap-2 squircle-xl bg-amber-500/10 px-3 py-2 text-base leading-7"><Lightbulb className="mt-1 size-4 shrink-0 text-amber-600" aria-hidden /> <span><Inline text={step.tip} /></span></p>}
          </article>

          {result && !result.ok && <p role="alert" className="squircle-xl border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-brand-red">{result.error}</p>}

          <div className="flex items-center gap-3">
            <Button variant="ghost" className="h-12 px-4 text-base" disabled={i === 0 || pending} onClick={() => setI(i - 1)}><ArrowLeft className="size-4" aria-hidden /> ย้อนกลับ</Button>
            <div className="ml-auto">
              {last
                ? <Button className="h-12 px-6 text-base" disabled={pending} onClick={finish}>{pending ? 'กำลังบันทึก…' : alreadyDone ? 'จบหน่วย (ทบทวน)' : `จบหน่วย +${unit.xp} XP`}</Button>
                : <Button className="h-12 px-6 text-base" onClick={() => setI(i + 1)}>ถัดไป <ArrowRight className="size-4" aria-hidden /></Button>}
            </div>
          </div>
        </>
      )}

      {unit.docs && unit.docs.length > 0 && (
        <aside aria-label="อ่านเพิ่มเติม" className="grid gap-2 squircle-xl border border-line bg-surface-2/50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold"><BookOpen className="size-4" aria-hidden /> อ่านเพิ่มเติม</p>
          <ul className="grid gap-1.5">{unit.docs.map((d) => <li key={d.href}><Link href={d.href} className="text-base font-semibold text-brand-blue underline underline-offset-4">{d.label}</Link></li>)}</ul>
        </aside>
      )}
    </main>
  );
}
