'use client';

import { useRef, useState, type ReactNode, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoaderCircle, CheckCircle2, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveChallenge } from '../actions';
import { ChallengeDraftContext, type ChallengeDraft } from './ChallengeDraftContext';
import { useEffect } from 'react';

export function ChallengeForm({ id, children, saved, slug }: { id: string; children: ReactNode; saved?: string; slug?: string | null }) {
  const router = useRouter();
  const saving = useRef(false);
  const savedId = useRef(id);
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = useRef(false);
  const [pending, setPending] = useState(false);
  const storageKey = `challenge-unsaved:${id}`;
  const [recovery, setRecovery] = useState<Record<string, string> | null>(null);
  const [draftContext, setDraftContext] = useState<ChallengeDraft>({ fields: {}, restoreNonce: 0 });
  useEffect(() => { try { const raw = localStorage.getItem(storageKey); if (raw) setRecovery(JSON.parse(raw)); } catch { localStorage.removeItem(storageKey); } }, [storageKey]);
  useEffect(() => { const timer = window.setInterval(() => { if (dirty.current && formRef.current) stash(formRef.current); }, 1000); const saveOnLeave = () => { if (dirty.current && formRef.current) stash(formRef.current); }; window.addEventListener('pagehide', saveOnLeave); return () => { window.clearInterval(timer); window.removeEventListener('pagehide', saveOnLeave); }; }, [storageKey]);
  const [feedback, setFeedback] = useState<{ error?: string; message?: string; slug?: string; field?: string }>(saved === 'draft' || saved === 'published' ? { message: saved === 'published' ? 'บันทึกและเผยแพร่แล้ว' : 'บันทึกฉบับร่างแล้ว ยังไม่เผยแพร่', slug: slug ?? undefined } : {});
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving.current) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    saving.current = true; setPending(true); setFeedback({});
    try {
      const result = await saveChallenge(savedId.current, data);
      if (!result.ok) {
        setFeedback({ error: result.error, field: result.field });
        requestAnimationFrame(() => {
          const target = result.field === 'config' ? form.querySelector<HTMLElement>('[data-challenge-scenario]') : form.elements.namedItem(result.field ?? '') as HTMLElement | null;
          target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target?.focus({ preventScroll: true });
        });
      }
      else {
        dirty.current = false;
        try { localStorage.removeItem(storageKey); } catch { /* storage may be unavailable */ }
        setRecovery(null);
        savedId.current = result.id;
        setFeedback({ message: result.published ? 'บันทึกและเผยแพร่แล้ว' : 'บันทึกฉบับร่างแล้ว ยังไม่เผยแพร่', slug: result.slug });
        if (id === 'new') router.replace(`/admin/challenges/${result.id}?saved=${result.published ? 'published' : 'draft'}`, { scroll: false });
        else router.refresh();
      }
    } catch {
      setFeedback({ error: 'เชื่อมต่อไม่สำเร็จ ข้อมูลยังอยู่ในฟอร์ม ลองกดบันทึกอีกครั้ง' });
    } finally { saving.current = false; setPending(false); }
  }
  function stash(form: HTMLFormElement) {
    try { const fields: Record<string, string> = {}; new FormData(form).forEach((value, key) => { if (typeof value === 'string') fields[key] = value; }); localStorage.setItem(storageKey, JSON.stringify(fields)); } catch { /* storage may be full or unavailable */ }
  }
  function restore() {
    if (!recovery) return;
    const form = document.querySelector<HTMLFormElement>('[data-challenge-form]'); if (!form) return;
    for (const [name, value] of Object.entries(recovery)) {
      if (['config', 'starter', 'brief', 'published'].includes(name)) continue;
      const control = form.elements.namedItem(name);
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
        if (control.type === 'checkbox') (control as HTMLInputElement).checked = value === 'on'; else control.value = value;
        control.dispatchEvent(new Event('input', { bubbles: true })); control.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    dirty.current = true;
    setDraftContext({ fields: recovery, restoreNonce: draftContext.restoreNonce + 1 });
    setRecovery(null);
  }
  return <ChallengeDraftContext.Provider value={draftContext}><form ref={formRef} data-challenge-form onChange={(event) => { dirty.current = true; const form = event.currentTarget; setTimeout(() => stash(form), 0); }} onInput={(event) => { dirty.current = true; const form = event.currentTarget; setTimeout(() => stash(form), 0); }} onPointerUp={(event) => { dirty.current = true; const form = event.currentTarget; setTimeout(() => stash(form), 0); }} onKeyUp={(event) => { dirty.current = true; const form = event.currentTarget; setTimeout(() => stash(form), 0); }} onSubmit={submit} onInvalidCapture={(event) => {
    const field = event.target as HTMLInputElement | HTMLSelectElement;
    const labels: Record<string, string> = { title: 'ชื่อโจทย์', level: 'ระดับความยาก', order: 'ลำดับในรายการ' };
    const label = labels[field.name] ?? 'ช่องข้อมูลนี้';
    const min = field instanceof HTMLInputElement ? field.min : '';
    const max = field instanceof HTMLInputElement ? field.max : '';
    const why = field.validity.valueMissing ? 'ยังไม่ได้กรอกข้อมูลที่จำเป็น' : field.validity.rangeUnderflow || field.validity.rangeOverflow ? `ค่าอยู่นอกช่วง ${min || 'ไม่จำกัด'} ถึง ${max || 'ไม่จำกัด'}` : field.validationMessage;
    setFeedback({ error: `${label}: ${why}`, field: field.name });
    field.focus();
  }} aria-busy={pending}>
    {recovery && <div className="mb-4 flex flex-wrap items-center gap-3 squircle-2xl border border-line bg-surface-2 p-4" role="dialog" aria-label="กู้คืนข้อมูลที่ยังไม่บันทึก"><p className="min-w-0 flex-1"><strong className="block">พบข้อมูลภารกิจที่ยังไม่ได้บันทึก</strong><span className="text-sm text-muted-foreground">ต้องการกู้คืนชื่อ รายละเอียด โค้ด และของในสนามที่กรอกค้างไว้ไหม?</span></p><Button type="button" onClick={restore}>กู้คืนข้อมูล</Button><Button type="button" variant="outline" onClick={() => { try { localStorage.removeItem(storageKey); } catch {} setRecovery(null); }}>เริ่มใหม่</Button></div>}
    <fieldset disabled={pending} className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] disabled:opacity-70">{children}</fieldset>
    <div className="sticky bottom-3 z-30 mt-6 flex flex-wrap items-center gap-3 squircle-2xl border border-line bg-surface p-4 shadow-lg">
      <div className="min-w-0 flex-1" role={feedback.error ? 'alert' : 'status'} aria-live="polite">
        {pending ? <p className="flex items-center gap-2"><LoaderCircle className="size-5 animate-spin" /> กำลังบันทึก…</p>
          : feedback.error ? <p className="flex items-center gap-2 text-destructive"><CircleAlert className="size-5 shrink-0" />{feedback.error}</p>
          : feedback.message ? <p className="flex items-center gap-2"><CheckCircle2 className="size-5 shrink-0" />{feedback.message}</p>
          : <p className="text-sm text-muted-foreground">บันทึกสนาม รายละเอียด และโค้ดเริ่มต้นพร้อมกัน</p>}
        {feedback.slug && <Link href={`/simulator?tab=${feedback.slug}`} className="text-sm underline">เปิดภารกิจในตัวจำลอง</Link>}
      </div>
      <Button type="submit" disabled={pending} className="h-12 min-w-36 text-base">{pending ? 'กำลังบันทึก…' : 'บันทึกภารกิจ'}</Button>
      <Button type="button" disabled={pending} variant="outline" onClick={() => router.push('/admin/challenges')}>กลับรายการ</Button>
    </div>
  </form></ChallengeDraftContext.Provider>;
}
