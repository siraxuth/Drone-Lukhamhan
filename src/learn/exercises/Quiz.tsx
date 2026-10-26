'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Inline } from '../Inline';
import type { PublicStep } from '../types';
import { Feedback, type ExerciseProps } from './shared';
import type { StepResult } from '@/app/learn/actions';

type Q = Extract<PublicStep, { kind: 'quiz' }>;

export function Quiz({ step, passed, submit, onResult, busy }: ExerciseProps & { step: Q }) {
  const [pick, setPick] = useState<number | null>(null);
  const [res, setRes] = useState<StepResult | null>(null);
  const locked = passed || (res?.ok === true && res.passed);
  async function check() {
    if (pick === null) return;
    const r = await submit(pick);
    setRes(r); onResult(r);
  }
  return (
    <div className="grid gap-4">
      <p className="text-lg leading-8"><Inline text={step.question} /></p>
      {step.code && <pre className="overflow-x-auto squircle-xl border border-line bg-[#fbfbfd] p-4 font-mono text-sm leading-6 dark:bg-[#10131a]"><code>{step.code}</code></pre>}
      <div role="radiogroup" aria-label="ตัวเลือก" className="grid gap-2">
        {step.options.map((o, i) => (
          <button key={i} type="button" role="radio" aria-checked={pick === i} disabled={locked} onClick={() => { setPick(i); setRes(null); }}
            className={`flex min-h-12 items-center gap-3 squircle-xl border px-4 py-2.5 text-left text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-80 ${pick === i ? 'border-brand-blue bg-brand-blue/10' : 'border-line hover:bg-surface-2'}`}>
            <span aria-hidden className={`grid size-7 shrink-0 place-items-center rounded-full border text-sm font-bold ${pick === i ? 'border-brand-blue bg-brand-blue text-background' : 'border-line'}`}>{String.fromCharCode(65 + i)}</span>
            <span className="min-w-0"><Inline text={o} /></span>
          </button>
        ))}
      </div>
      <Feedback result={res} passed={passed} />
      {!locked && <Button className="h-12 w-fit px-6 text-base" disabled={pick === null || busy} onClick={check}>ตรวจคำตอบ</Button>}
    </div>
  );
}
