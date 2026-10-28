'use client';

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useTransition } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, ArrowRight, BookOpen, Check, ExternalLink, Flame, Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Inline } from '@/learn/Inline';
import { Arrange } from '@/learn/exercises/Arrange';
import { Fill } from '@/learn/exercises/Fill';
import { Quiz } from '@/learn/exercises/Quiz';
import { Write } from '@/learn/exercises/Write';
import type { PublicStep, Unit } from '@/learn/types';
import { completeUnit, submitStep, type CompleteResult, type StepResult } from '../../actions';

const LearnSim = dynamic(() => import('@/learn/exercises/LearnSim'), { ssr: false, loading: () => <div className="grid h-56 place-items-center squircle-xl border border-line bg-surface-2 text-muted-foreground">กำลังเตรียมสนามจำลอง…</div> });

type PublicUnit = Omit<Unit, 'steps'> & { steps: PublicStep[] };
type Props = {
  track: { id: string; title: string; accent: 'blue' | 'red' | 'emerald' | 'amber' };
  unit: PublicUnit;
  index: number;
  total: number;
  alreadyDone: boolean;
  initialPassed: number[];
  next: { href: string; title: string } | null;
};

const KIND_LABEL: Record<string, string> = { quiz: 'ตอบคำถาม', fill: 'เติมโค้ด', arrange: 'ลาก-วางเรียงคำสั่ง', write: 'เขียนโค้ดเอง' };

/** เล่นหน่วยเรียนทีละการ์ด: อ่าน → ทำแบบฝึก (ต้องผ่านถึงไปต่อ) → จบหน่วยรับ XP · ทุกอย่างตัดสินที่เซิร์ฟเวอร์ */
export function UnitPlayer({ track, unit, index, total, alreadyDone, initialPassed, next }: Props) {
  const [i, setI] = useState(0);
  const [passed, setPassed] = useState<Set<number>>(() => new Set(initialPassed));
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const card = useRef<HTMLElement>(null);
  const last = i === unit.steps.length - 1;
  const step = unit.steps[i];
  const interactive = step.kind !== 'read';
  const canGo = !interactive || passed.has(i);
  const pct = result?.ok ? 100 : Math.round(((i + (canGo ? 1 : 0)) / unit.steps.length) * 100);
  const exercises = unit.steps.filter((s) => s.kind !== 'read').length;

  useEffect(() => { card.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [i]);
  useEffect(() => {
    if (result?.ok && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) void confetti({ particleCount: 120, spread: 80, origin: { y: 0.65 } });
  }, [result]);

  async function submit(answer: unknown): Promise<StepResult> {
    setBusy(true);
    try { return await submitStep(unit.id, i, answer); } finally { setBusy(false); }
  }
  const onResult = (r: StepResult) => { if (r.ok && r.passed) setPassed((p) => new Set(p).add(i)); };
  const finish = () => start(async () => setResult(await completeUnit(unit.id)));
  const exProps = { index: i, passed: passed.has(i), onResult, submit, busy };

  return (
    <main className="mx-auto grid max-w-3xl gap-5 px-4 pb-32 pt-28 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/learn" aria-label="กลับไปเส้นทางเรียน" className="grid size-11 shrink-0 place-items-center squircle-xl border border-line bg-surface hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand-blue"><X className="size-5" aria-hidden /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{track.title} · หน่วยที่ {index + 1}/{total}{exercises ? ` · แบบฝึก ${[...passed].filter((k) => unit.steps[k] && unit.steps[k].kind !== 'read').length}/${exercises}` : ''}</p>
          <div role="progressbar" aria-label="ความคืบหน้าในหน่วยนี้" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-2.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand-blue transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      {result?.ok ? (
        <section aria-live="polite" className="grid gap-4 squircle-2xl border border-line bg-surface p-6 text-center sm:p-8">
          <span aria-hidden className="mx-auto grid size-16 place-items-center rounded-full bg-brand-blue text-background"><Check className="size-8" /></span>
          <h1 className="font-display text-3xl font-extrabold leading-tight">จบหน่วย “{unit.title}”</h1>
          <p className="text-lg text-muted-foreground">{result.firstTime ? `ได้รับ +${result.xpGained} XP` : 'ทบทวนซ้ำ ไม่ได้ XP เพิ่ม (รับเฉพาะครั้งแรกที่จบ)'}</p>
          <div className="flex flex-wrap justify-center gap-3 text-base">
            <span className="squircle-xl bg-surface-2 px-3 py-1.5 font-semibold">รวม {result.xp} XP · ระดับ {result.level}</span>
            {exercises > 0 && <span className="squircle-xl bg-surface-2 px-3 py-1.5 font-semibold">ถูกตั้งแต่ครั้งแรก {result.accuracy}%</span>}
            <span className="inline-flex items-center gap-1.5 squircle-xl bg-surface-2 px-3 py-1.5 font-semibold"><Flame className="size-4 text-orange-500" aria-hidden /> เรียนต่อเนื่อง {result.streak} วัน</span>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {next && <Link href={next.href} className="inline-flex h-12 items-center gap-2 squircle-xl bg-brand-blue px-6 text-base font-bold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">หน่วยถัดไป: {next.title} <ArrowRight className="size-4" aria-hidden /></Link>}
            <Link href="/learn" className="inline-flex h-12 items-center gap-2 squircle-xl border border-line px-6 text-base font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">กลับเส้นทางเรียน</Link>
          </div>
        </section>
      ) : (
        <>
          <article ref={card} tabIndex={-1} aria-labelledby="step-title" className="grid gap-4 squircle-2xl border border-line bg-surface p-5 outline-none sm:p-8">
            <p className="text-sm font-semibold text-brand-blue">{unit.title} · การ์ด {i + 1}/{unit.steps.length}{interactive ? ` · ${KIND_LABEL[step.kind]}` : ''}</p>
            <h1 id="step-title" className="font-display text-2xl font-extrabold leading-snug sm:text-3xl">{step.title}</h1>
            {step.kind === 'read' && (
              <>
                {step.body.map((p, k) => <p key={k} className="text-lg leading-8"><Inline text={p} /></p>)}
                {step.images && step.images.length > 0 && (
                  <div className="grid gap-4">
                    {step.images.map((image) => (
                      <figure key={image.src} className="overflow-hidden squircle-xl border border-line bg-surface-2">
                        <a href={image.href} target="_blank" rel="noreferrer" className="group relative block aspect-video focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-brand-blue" aria-label={`${image.caption} เปิดแหล่งอ้างอิงในแท็บใหม่`}>
                          <Image src={image.src} alt={image.alt} fill unoptimized sizes="(max-width: 768px) 100vw, 720px" className="object-contain transition-transform duration-200 group-hover:scale-[1.015]" />
                          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 squircle-xl bg-background/95 px-2.5 py-1 text-xs font-semibold text-foreground"><ExternalLink className="size-3.5" aria-hidden />เปิดแหล่งอ้างอิง</span>
                        </a>
                        <figcaption className="px-3 py-2 text-sm leading-6 text-muted-foreground">{image.caption}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
                {step.code && <pre className="overflow-x-auto squircle-xl border border-line bg-[#fbfbfd] p-4 font-mono text-sm leading-6 dark:bg-[#10131a]"><code>{step.code}</code></pre>}
                {step.tip && <p className="flex items-start gap-2 squircle-xl bg-amber-500/10 px-3 py-2 text-base leading-7"><Lightbulb className="mt-1 size-4 shrink-0 text-amber-600" aria-hidden /> <span><Inline text={step.tip} /></span></p>}
                {step.video && (
                  <section className="grid gap-2" aria-label="วิดีโอประกอบ">
                    <h2 className="text-base font-bold">ดูคลิปสาธิต</h2>
                    <div className="aspect-video overflow-hidden squircle-xl bg-black">
                      {step.video.src ? (
                        <video className="size-full" controls playsInline preload="none" poster={step.video.poster} src={step.video.src} aria-label={step.video.title} />
                      ) : (
                        <iframe className="size-full" src={`https://www.youtube-nocookie.com/embed/${step.video.id}`} title={step.video.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                      )}
                    </div>
                    {step.video.id && <a href={`https://www.youtube.com/watch?v=${step.video.id}`} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-brand-blue underline underline-offset-4">เปิดคลิปบน YouTube <ExternalLink className="size-3.5" aria-hidden /></a>}
                  </section>
                )}
                {step.sim && (
                  <section className="grid gap-3 border-t border-line pt-4" aria-label="ทดลองในสนามจำลอง">
                    <div>
                      <h2 className="font-bold">ลองดูในสนาม 3D</h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">กดเล่นแล้วสังเกตการบิน หมุนหรือซูมสนามได้บนคอมพิวเตอร์ ถ้าเครื่องไม่รองรับ 3D ระบบจะแสดงสนามแบบ 2D ให้แทน</p>
                    </div>
                    <LearnSim code={step.sim.code} scenario={step.sim.scenario} />
                  </section>
                )}
              </>
            )}
            {step.kind === 'quiz' && <Quiz key={i} step={step} {...exProps} />}
            {step.kind === 'fill' && <Fill key={i} step={step} {...exProps} />}
            {step.kind === 'arrange' && <Arrange key={i} step={step} {...exProps} />}
            {step.kind === 'write' && <Write key={i} step={step} {...exProps} />}
          </article>

          {result && !result.ok && <p role="alert" className="squircle-xl border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-brand-red">{result.error}</p>}

          <div className="flex items-center gap-3">
            <Button variant="ghost" className="h-12 px-4 text-base" disabled={i === 0 || pending} onClick={() => setI(i - 1)}><ArrowLeft className="size-4" aria-hidden /> ย้อนกลับ</Button>
            <div className="ml-auto flex items-center gap-3">
              {!canGo && <span className="hidden text-sm text-muted-foreground sm:inline">ทำแบบฝึกให้ผ่านก่อนไปต่อ</span>}
              {last
                ? <Button className="h-12 px-6 text-base" disabled={pending || !canGo} onClick={finish}>{pending ? 'กำลังบันทึก…' : alreadyDone ? 'จบหน่วย (ทบทวน)' : `จบหน่วย +${unit.xp} XP`}</Button>
                : <Button className="h-12 px-6 text-base" disabled={!canGo} onClick={() => setI(i + 1)}>ถัดไป <ArrowRight className="size-4" aria-hidden /></Button>}
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
