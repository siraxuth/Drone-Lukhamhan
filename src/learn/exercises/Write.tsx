'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CodeEditor } from '@/components/CodeEditor';
import { commandsFor } from '@/flight/commands';
import { Inline } from '../Inline';
import type { PublicStep } from '../types';
import { Feedback, type ExerciseProps } from './shared';
import type { StepResult } from '@/app/learn/actions';

const LearnSim = dynamic(() => import('./LearnSim'), { ssr: false, loading: () => <div className="grid h-48 place-items-center squircle-xl border border-line text-muted-foreground">กำลังโหลดสนามจำลอง…</div> });
type W = Extract<PublicStep, { kind: 'write' }>;
const COMMANDS = commandsFor('full');

/** เขียนโค้ดเองในตัวแก้โค้ด (ชื่อเต็ม) ดูโดรนบินในสนามจำลองได้ แล้วส่งให้เซิร์ฟเวอร์ตัดสิน */
export function Write({ step, passed, submit, onResult, busy }: ExerciseProps & { step: W }) {
  const [code, setCode] = useState(step.starter);
  const [res, setRes] = useState<StepResult | null>(null);
  const [showSim, setShowSim] = useState(false);
  const [hint, setHint] = useState(false);
  const locked = passed || (res?.ok === true && res.passed);
  async function check() {
    const r = await submit(code);
    setRes(r); onResult(r);
  }
  return (
    <div className="grid gap-4">
      <p className="text-lg leading-8"><Inline text={step.question} /></p>
      <div className="h-80 overflow-hidden squircle-xl border border-line"><CodeEditor value={code} onChange={(v) => { setCode(v); setRes(null); }} label="โค้ดของฉัน" fill commands={COMMANDS} /></div>
      <Feedback result={res} passed={passed} />
      {hint && step.hint && <p className="squircle-xl bg-amber-500/10 px-3 py-2 text-base leading-7">ใบ้: <Inline text={step.hint} /></p>}
      <div className="flex flex-wrap gap-2">
        {!locked && <Button className="h-12 px-6 text-base" disabled={busy} onClick={check}>ตรวจคำตอบ</Button>}
        <Button variant="outline" className="h-12 px-5 text-base" onClick={() => setShowSim(true)}>ดูโดรนบิน</Button>
        {step.hint && !hint && <Button variant="ghost" className="h-12 px-4 text-base" onClick={() => setHint(true)}>ขอใบ้</Button>}
      </div>
      {showSim && <LearnSim key={code} code={code} scenario={step.scenario} />}
    </div>
  );
}
