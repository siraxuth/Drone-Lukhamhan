'use client';

import { Check, X } from 'lucide-react';
import { Inline } from '../Inline';
import type { StepResult } from '@/app/learn/actions';

export type Submit = (answer: unknown) => Promise<StepResult>;
export type ExerciseProps = { index: number; passed: boolean; onResult: (r: StepResult) => void; submit: Submit; busy: boolean };

/** กล่องผลหลังตรวจ: ถูก (เขียว) / ผิด (แดง) พร้อมเหตุผล และคำอธิบายเมื่อผ่าน */
export function Feedback({ result, passed }: { result: StepResult | null; passed: boolean }) {
  if (!result) return passed ? <p className="flex items-center gap-2 squircle-xl bg-emerald-500/10 px-3 py-2 text-base font-semibold text-emerald-700 dark:text-emerald-300"><Check className="size-4" aria-hidden /> ผ่านข้อนี้แล้ว</p> : null;
  if (!result.ok) return <p role="alert" className="squircle-xl border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-brand-red">{result.error}</p>;
  const good = result.passed;
  return (
    <div role="status" className={`grid gap-1.5 squircle-xl border px-4 py-3 ${good ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-brand-red/40 bg-brand-red/10'}`}>
      <p className={`flex items-center gap-2 text-lg font-bold ${good ? 'text-emerald-700 dark:text-emerald-300' : 'text-brand-red'}`}>{good ? <Check className="size-5" aria-hidden /> : <X className="size-5" aria-hidden />}<span><Inline text={result.message} /></span></p>
      {result.detail?.problems.map((p, i) => <p key={i} className="text-sm text-brand-red">✕ {p}</p>)}
      {result.detail && result.detail.missing.length > 0 && <p className="text-sm text-muted-foreground">ต้องมีคำสั่ง (เรียงตามลำดับ): {result.detail.missing.join(', ')}</p>}
      {good && result.explain && <p className="text-base leading-7"><Inline text={result.explain} /></p>}
    </div>
  );
}
