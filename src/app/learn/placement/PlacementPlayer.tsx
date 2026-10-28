'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Inline } from '@/learn/Inline';
import { SkillRadar } from '@/learn/SkillRadar';
import { BAND_LABEL, LETTERING_SKILLS, SHORT, SKILL_IDS } from '@/learn/skills';
import { placementFinish, placementNext, skipPlacement, type PlacementNext, type PlacementResult } from '../skill-actions';

type Q = Extract<PlacementNext, { done: false; ok: true }>;
type Ans = { id: string; choice: number };

/** แบบทดสอบก่อนเรียน 12 ข้อ ปรับความยากตามคำตอบ (ตอบถูกยากขึ้น ตอบผิดง่ายลง) ไม่บอกเฉลยระหว่างทำ สรุปผลตอนจบ */
export function PlacementPlayer({ already }: { already: boolean }) {
  const [answers, setAnswers] = useState<Ans[]>([]);
  const [q, setQ] = useState<Q | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Extract<PlacementResult, { ok: true }> | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (already || started.current) return; started.current = true;
    void placementNext([]).then((r) => (r.ok && !r.done ? setQ(r) : setError(r.ok ? 'โหลดข้อสอบไม่ได้' : r.error)));
  }, []);

  async function next() {
    if (!q || pick === null) return;
    setBusy(true); setError('');
    const all = [...answers, { id: q.question.id, choice: pick }];
    const r = await placementNext(all);
    if (!r.ok) { setBusy(false); return setError(r.error); }
    setAnswers(all); setPick(null);
    if (!r.done) { setQ(r); setBusy(false); return; }
    const fin = await placementFinish(all);
    setBusy(false);
    if (!fin.ok) return setError(fin.error);
    setResult(fin);
  }

  return (
    <main className="mx-auto grid max-w-2xl gap-5 px-4 pb-32 pt-28 sm:px-6">
      {!q && !result && <h1 className="sr-only">แบบทดสอบก่อนเรียน</h1>}
      <div className="flex items-center gap-3">
        <Link href="/learn" aria-label="ออกจากแบบทดสอบ" className="grid size-11 shrink-0 place-items-center squircle-xl border border-line bg-surface hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand-blue"><X className="size-5" aria-hidden /></Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">แบบทดสอบก่อนเรียน{q && !result ? ` · ข้อ ${q.number}/${q.total}` : ''}</p>
          <div role="progressbar" aria-label="ความคืบหน้าแบบทดสอบ" aria-valuenow={result ? 100 : Math.round((answers.length / 12) * 100)} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-2.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand-blue transition-[width] duration-300" style={{ width: `${result ? 100 : (answers.length / 12) * 100}%` }} /></div>
        </div>
      </div>

      {already && !result && (
        <section className="grid gap-4 squircle-2xl border border-line bg-surface p-6 text-center sm:p-8">
          <h1 className="font-display text-3xl font-extrabold">ทำแบบทดสอบก่อนเรียนไปแล้ว</h1>
          <p className="text-lg text-muted-foreground">ผลและจุดแข็ง-จุดควรเสริมอยู่ในหน้าวิเคราะห์ของฉัน ซึ่งอัปเดตทุกครั้งที่คุณทำแบบฝึก</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/learn/skills" className="inline-flex h-12 items-center gap-2 squircle-xl bg-brand-blue px-6 text-base font-bold text-background">ดูวิเคราะห์ของฉัน</Link>
            <Link href="/learn" className="inline-flex h-12 items-center gap-2 squircle-xl border border-line px-6 text-base font-semibold hover:bg-surface-2">กลับเส้นทางเรียน</Link>
          </div>
        </section>
      )}

      {error && <p role="alert" className="squircle-xl border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-brand-red">{error}</p>}

      {result ? (
        <section aria-live="polite" className="grid gap-5 squircle-2xl border border-line bg-surface p-5 sm:p-8">
          <div className="grid gap-1">
            <h1 className="font-display text-3xl font-extrabold leading-tight">ผลวัดพื้นฐานของคุณ</h1>
            <p className="text-lg text-muted-foreground">ตอบถูก {result.score}% ระบบปรับความยากตามคำตอบ จึงไม่ใช่คะแนนสอบ แต่ใช้ประเมินว่าควรเน้นตรงไหน</p>
          </div>
          <SkillRadar items={SKILL_IDS.filter((k) => !LETTERING_SKILLS.includes(k)).map((skill) => { const s = result.skills.find((x) => x.skill === skill); return { skill, value: s && s.answered >= 1 ? s.mastery : null }; })} />
          <div className="grid gap-2 sm:grid-cols-3">
            {(['code', 'basics', 'physics'] as const).map((t) => (
              <div key={t} className="squircle-xl border border-line bg-surface-2 px-3 py-2 text-center">
                <p className="text-sm text-muted-foreground">{t === 'code' ? 'เขียนโค้ด' : t === 'basics' ? 'ความรู้โดรน' : 'ฟิสิกส์'}</p>
                <p className="text-lg font-bold">{result.levels[t] ?? 'ยังไม่พอวัด'}</p>
              </div>
            ))}
          </div>
          <ul className="grid gap-1.5 text-base">
            {result.skills.map((s) => <li key={s.skill} className="flex items-center justify-between gap-3"><span>{SHORT[s.skill]}</span><span className="text-sm text-muted-foreground">ถูก {s.correct}/{s.answered} · {BAND_LABEL[s.band]}</span></li>)}
          </ul>
          {result.unlocked.length > 0 && <p className="squircle-xl bg-emerald-500/10 px-3 py-2 text-base leading-7">คุณแม่นพอที่จะข้ามหน่วยต้นๆ ได้ ระบบปลดล็อกให้ <b>{result.unlocked.length} หน่วย</b> ({result.unlocked.map((u) => u.title).join(', ')}) ไม่ได้ XP แต่กลับไปเรียนซ้ำเมื่อไรก็ได้</p>}
          <div className="flex flex-wrap gap-3">
            <Link href="/learn" className="inline-flex h-12 items-center gap-2 squircle-xl bg-brand-blue px-6 text-base font-bold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">เริ่มเรียน <ArrowRight className="size-4" aria-hidden /></Link>
            <Link href="/learn/skills" className="inline-flex h-12 items-center gap-2 squircle-xl border border-line px-6 text-base font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">ดูวิเคราะห์ละเอียด</Link>
          </div>
        </section>
      ) : q ? (
        <section aria-labelledby="pq" className="grid gap-4 squircle-2xl border border-line bg-surface p-5 sm:p-8">
          <h1 id="pq" className="text-xl font-extrabold leading-8 sm:text-2xl"><Inline text={q.question.question} /></h1>
          {q.question.code && <pre className="overflow-x-auto squircle-xl border border-line bg-[#fbfbfd] p-4 font-mono text-sm leading-6 dark:bg-[#10131a]"><code>{q.question.code}</code></pre>}
          <div role="radiogroup" aria-labelledby="pq" className="grid gap-2">
            {q.question.options.map((o, i) => (
              <button key={i} type="button" role="radio" aria-checked={pick === i} onClick={() => setPick(i)} className={`flex min-h-12 items-center gap-3 squircle-xl border px-4 py-2.5 text-left text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${pick === i ? 'border-brand-blue bg-brand-blue/10' : 'border-line hover:bg-surface-2'}`}>
                <span aria-hidden className={`grid size-7 shrink-0 place-items-center rounded-full border text-sm font-bold ${pick === i ? 'border-brand-blue bg-brand-blue text-background' : 'border-line'}`}>{String.fromCharCode(65 + i)}</span>
                <span className="min-w-0"><Inline text={o} /></span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="h-12 px-4 text-base" disabled={busy} onClick={async () => { await skipPlacement(); window.location.href = '/learn'; }}>ข้ามแบบทดสอบ</Button>
            <Button className="ml-auto h-12 px-6 text-base" disabled={pick === null || busy} onClick={next}>{busy ? 'กำลังตรวจ…' : q.number === q.total ? 'ส่งและดูผล' : 'ถัดไป'} <ArrowRight className="size-4" aria-hidden /></Button>
          </div>
        </section>
      ) : !error && !already && <p className="text-center text-muted-foreground">กำลังเตรียมข้อสอบ…</p>}
    </main>
  );
}
