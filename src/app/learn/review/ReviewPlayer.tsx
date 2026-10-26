'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Quiz } from '@/learn/exercises/Quiz';
import { SHORT } from '@/learn/skills';
import { submitStep, type StepResult } from '../actions';
import type { ReviewStart } from '../skill-actions';

/** ชุดทบทวน 5 ข้อ: ตอบทีละข้อ (ผิดลองใหม่ได้) นับเฉพาะที่ถูกตั้งแต่ครั้งแรก ผลเข้าโมเดลความชำนาญเหมือนแบบฝึกปกติ */
export function ReviewPlayer({ start }: { start: ReviewStart }) {
  const [i, setI] = useState(0);
  const [passed, setPassed] = useState<Set<number>>(new Set());
  const [firstTry, setFirstTry] = useState<Map<number, boolean>>(new Map());
  const [busy, setBusy] = useState(false);

  if (!start.ok) {
    return (
      <main className="mx-auto grid max-w-xl gap-4 px-4 pb-32 pt-28 text-center sm:px-6">
        <h1 className="font-display text-3xl font-extrabold">ทบทวน 5 ข้อ</h1>
        <p className="text-lg text-muted-foreground">{start.error}</p>
        <Link href="/learn" className="mx-auto inline-flex h-12 items-center gap-2 squircle-xl bg-brand-blue px-6 text-base font-bold text-white">ไปเรียนต่อ <ArrowRight className="size-4" aria-hidden /></Link>
      </main>
    );
  }

  const items = start.items;
  const finished = i >= items.length;
  const right = [...firstTry.values()].filter(Boolean).length;
  const cur = items[i];

  async function submit(answer: unknown): Promise<StepResult> {
    setBusy(true);
    try {
      const r = await submitStep(cur.unitId, cur.index, answer);
      if (r.ok) setFirstTry((m) => (m.has(i) ? m : new Map(m).set(i, r.passed)));
      return r;
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto grid max-w-2xl gap-5 px-4 pb-32 pt-28 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/learn" aria-label="ออกจากการทบทวน" className="grid size-11 shrink-0 place-items-center squircle-xl border border-line bg-surface hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand-blue"><X className="size-5" aria-hidden /></Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">ทบทวน{finished ? ' · จบแล้ว' : ` · ข้อ ${i + 1}/${items.length}`}</p>
          <div role="progressbar" aria-label="ความคืบหน้าการทบทวน" aria-valuenow={Math.round((i / items.length) * 100)} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-2.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand-blue transition-[width] duration-300" style={{ width: `${(Math.min(i + (passed.has(i) ? 1 : 0), items.length) / items.length) * 100}%` }} /></div>
        </div>
      </div>

      {finished ? (
        <section aria-live="polite" className="grid gap-4 squircle-2xl border border-line bg-surface p-6 text-center sm:p-8">
          <span aria-hidden className="mx-auto grid size-16 place-items-center rounded-full bg-brand-blue text-white"><Check className="size-8" /></span>
          <h1 className="font-display text-3xl font-extrabold">ทบทวนเสร็จแล้ว</h1>
          <p className="text-lg text-muted-foreground">ถูกตั้งแต่ครั้งแรก {right} จาก {items.length} ข้อ ผลถูกนำไปปรับภาพความชำนาญของคุณแล้ว</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/learn/skills" className="inline-flex h-12 items-center gap-2 squircle-xl bg-brand-blue px-6 text-base font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">ดูวิเคราะห์ของฉัน</Link>
            <a href="/learn/review" className="inline-flex h-12 items-center gap-2 squircle-xl border border-line px-6 text-base font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">ทบทวนอีกชุด</a>
          </div>
        </section>
      ) : (
        <>
          <article aria-labelledby="rv" className="grid gap-4 squircle-2xl border border-line bg-surface p-5 sm:p-8">
            <p className="text-sm font-semibold text-brand-blue">จากหน่วย “{cur.unitTitle}” · ทักษะ: {cur.step.skills.map((s) => SHORT[s]).join(', ')}</p>
            <h1 id="rv" className="font-display text-2xl font-extrabold leading-snug">{cur.step.title}</h1>
            <Quiz key={i} step={cur.step} index={cur.index} passed={passed.has(i)} busy={busy} submit={submit} onResult={(r) => { if (r.ok && r.passed) setPassed((p) => new Set(p).add(i)); }} />
          </article>
          <div className="flex justify-end">
            <Button className="h-12 px-6 text-base" disabled={!passed.has(i)} onClick={() => setI(i + 1)}>{i === items.length - 1 ? 'ดูสรุป' : 'ข้อถัดไป'} <ArrowRight className="size-4" aria-hidden /></Button>
          </div>
        </>
      )}
    </main>
  );
}
