'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { Check, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeEditor } from '@/components/CodeEditor';
import { commandsFor } from '@/flight/commands';
import { ScenePreview } from '@/field/ScenePlan';
import type { ScenarioConfig } from '@/lib/scenarios';
import { submitDaily, type DailyResult } from '../../daily-actions';

const LearnSim = dynamic(() => import('@/learn/exercises/LearnSim'), { ssr: false, loading: () => <div className="grid h-48 place-items-center squircle-xl border border-line text-muted-foreground">กำลังโหลดสนามจำลอง…</div> });
const COMMANDS = commandsFor('full');
const sec = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)} วินาที`);

type Props = {
  tier: string;
  tierLabel: string;
  mission: { title: string; steps: string[]; config: ScenarioConfig; max: number; xp: number; starter: string; referenceMs: number };
  best: { score: number; timeMs: number | null; solved: boolean; attempts: number; code: string } | null;
};

/** หน้าทำภารกิจรายวัน: โจทย์ + ตัวแก้โค้ดชื่อเต็ม + สนามจำลอง (ดูโดรนบิน) แล้วส่งให้เซิร์ฟเวอร์ตัดสิน */
export function DailyPlayer({ tier, tierLabel, mission: m, best }: Props) {
  const [code, setCode] = useState(best?.code || m.starter);
  const [res, setRes] = useState<DailyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [sim, setSim] = useState(false);
  const bestNow = res?.ok ? res.best : best ? { score: best.score, timeMs: best.timeMs } : null;
  const solved = (res?.ok && res.passed) || best?.solved;

  async function send() {
    setBusy(true);
    const r = await submitDaily(tier, code);
    setBusy(false); setRes(r);
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 pb-32 pt-28 sm:px-6">
      <header className="grid gap-2">
        <Link href="/learn/daily" className="w-fit text-base font-semibold text-brand-blue underline underline-offset-4">← ภารกิจรายวัน</Link>
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">{m.title} <span className="ml-1 align-middle text-lg font-bold text-muted-foreground">ระดับ{tierLabel}</span></h1>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-base text-muted-foreground"><span>คะแนนเต็ม {m.max}</span><span>รางวัล +{m.xp} XP (ครั้งแรกที่ผ่าน)</span>{bestNow && <span>ดีที่สุด {bestNow.score}/{m.max} · {sec(bestNow.timeMs)}</span>}{solved && <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300"><Check className="size-4" aria-hidden /> ผ่านแล้ววันนี้</span>}</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-label="โจทย์" className="grid gap-4">
          <div className="grid gap-4 squircle-2xl border border-line bg-surface p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:p-5">
            <ScenePreview config={m.config} className="mx-auto aspect-square w-full max-w-[12rem] squircle-xl" />
            <ol className="grid list-decimal gap-2 pl-5 text-base leading-7 marker:font-bold">{m.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
          <div className="h-[26rem] overflow-hidden squircle-xl border border-line"><CodeEditor value={code} onChange={setCode} label="โค้ดภารกิจรายวัน" fill commands={COMMANDS} /></div>
          <div className="flex flex-wrap gap-2">
            <Button className="h-12 px-6 text-base" disabled={busy} onClick={send}>{busy ? 'กำลังตรวจ…' : 'ส่งคำตอบ'}</Button>
            <Button variant="outline" className="h-12 px-5 text-base" onClick={() => setSim(true)}>ดูโดรนบิน</Button>
            <Button variant="ghost" className="h-12 px-4 text-base" onClick={() => { setCode(m.starter); setRes(null); }}>เริ่มใหม่</Button>
          </div>

          {res && (res.ok ? (
            <div role="status" className={`grid gap-1.5 squircle-xl border px-4 py-3 ${res.passed ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-amber-500/50 bg-amber-500/10'}`}>
              <p className={`flex items-center gap-2 text-lg font-bold ${res.passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>{res.passed ? <Trophy className="size-5" aria-hidden /> : null}{res.passed ? `ผ่านภารกิจ! ${res.score}/${res.max} คะแนน · บินใช้เวลา ${sec(res.timeMs)}` : `ได้ ${res.score}/${res.max} คะแนน ยังไม่เต็ม`}</p>
              {res.xpGained > 0 && <p className="text-base font-semibold">ได้รับ +{res.xpGained} XP · รวม {res.xp} XP · ระดับ {res.level}</p>}
              {res.passed && res.xpGained === 0 && <p className="text-base text-muted-foreground">ผ่านไปแล้วก่อนหน้า ไม่ได้ XP เพิ่ม {res.improved ? 'แต่เวลานี้ดีกว่าเดิม บันทึกให้แล้ว' : ''}</p>}
              {res.problems.map((p, i) => <p key={i} className="text-sm text-brand-red">✕ {p}</p>)}
              {!res.passed && res.problems.length === 0 && <p className="text-base text-muted-foreground">ลองกด “ดูโดรนบิน” แล้วสังเกตว่าพลาดจุดไหน หรือยังไม่ได้ลงจอดบนฐาน</p>}
              <p className="text-sm text-muted-foreground">ส่งแล้ว {res.attempts} ครั้งวันนี้ · เวลาเฉลยอ้างอิง {sec(m.referenceMs)}</p>
            </div>
          ) : <p role="alert" className="squircle-xl border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-brand-red">{res.error}</p>)}
        </section>

        <section aria-label="สนามจำลอง" className="min-w-0">
          {sim ? <LearnSim key={code} code={code} scenario={m.config} /> : <div className="grid min-h-60 place-items-center squircle-2xl border border-dashed border-line p-6 text-center text-lg text-muted-foreground">กด “ดูโดรนบิน” เพื่อดูโค้ดของคุณบินในสนาม<br />(ยังไม่นับคะแนน ต้องกด “ส่งคำตอบ”)</div>}
        </section>
      </div>
    </main>
  );
}
