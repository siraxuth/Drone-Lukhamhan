'use client';

import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Inline } from '../Inline';
import type { PublicStep } from '../types';
import { Feedback, type ExerciseProps } from './shared';
import type { StepResult } from '@/app/learn/actions';

type F = Extract<PublicStep, { kind: 'fill' }>;

/** โค้ดที่มีช่องว่าง ___ ให้เลือกคำตอบจากรายการในแต่ละช่อง */
export function Fill({ step, passed, submit, onResult, busy }: ExerciseProps & { step: F }) {
  const [vals, setVals] = useState<number[]>(() => step.blanks.map(() => -1));
  const [res, setRes] = useState<StepResult | null>(null);
  const locked = passed || (res?.ok === true && res.passed);
  const wrong = new Set(res?.ok ? res.wrong ?? [] : []);
  const parts = step.code.split('___');
  async function check() {
    const r = await submit(vals);
    setRes(r); onResult(r);
  }
  return (
    <div className="grid gap-4">
      <p className="text-lg leading-8"><Inline text={step.question} /></p>
      <pre className="overflow-x-auto squircle-xl border border-line bg-[#fbfbfd] p-4 font-mono text-sm leading-8 dark:bg-[#10131a]"><code>
        {parts.map((p, i) => (
          <Fragment key={i}>
            {p}
            {i < step.blanks.length && (
              <select aria-label={`ช่องที่ ${i + 1}`} disabled={locked} value={vals[i]} onChange={(e) => { const v = [...vals]; v[i] = Number(e.target.value); setVals(v); setRes(null); }}
                className={`mx-0.5 h-8 max-w-[14rem] squircle-xl border bg-surface px-2 font-mono text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand-blue ${wrong.has(i) ? 'border-brand-red text-brand-red' : 'border-brand-blue text-brand-blue'}`}>
                <option value={-1}>เลือก…</option>
                {step.blanks[i].options.map((o, k) => <option key={k} value={k}>{o}</option>)}
              </select>
            )}
          </Fragment>
        ))}
      </code></pre>
      <Feedback result={res} passed={passed} />
      {!locked && <Button className="h-12 w-fit px-6 text-base" disabled={busy || vals.some((v) => v < 0)} onClick={check}>ตรวจคำตอบ</Button>}
    </div>
  );
}
