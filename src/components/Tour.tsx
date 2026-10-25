'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, CircleHelp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type TourStep = {
  /** CSS selector ของจุดที่จะไฮไลต์ · ไม่ใส่หรือหาไม่เจอ = การ์ดกลางจอ */
  target?: string;
  title: string;
  text: string;
  /** ใช้แทนเมื่อ target หลักมองไม่เห็น (เช่น เมนูที่ซ่อนอยู่หลังปุ่มบนมือถือ) */
  alt?: { target: string; title?: string; text: string };
};

const KEY = (id: string) => `tour-v1:${id}`;
const PAD = 8;
const CARD_W = 360;

/** เจอได้หลายตัว (เช่น ปุ่มของจอใหญ่/จอเล็ก) → เอาตัวแรกที่มองเห็นจริง */
function findVisible(sel?: string): HTMLElement | null {
  if (!sel) return null;
  for (const el of document.querySelectorAll<HTMLElement>(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** เลือกจุดไฮไลต์ + ข้อความ: ใช้ตัวหลักถ้าเห็น ไม่งั้นใช้ตัวแทน (alt) ถ้ามี */
function resolve(step: TourStep | undefined) {
  if (!step) return { el: null as HTMLElement | null, title: '', text: '' };
  const el = findVisible(step.target);
  if (el || !step.alt) return { el, title: step.title, text: step.text };
  return { el: findVisible(step.alt.target), title: step.alt.title ?? step.title, text: step.alt.text };
}

type Box = { x: number; y: number; w: number; h: number };

/**
 * ทัวร์แนะนำการใช้งานหน้านั้น: ขึ้นเองครั้งแรกที่เข้า มีกรอบไฮไลต์ + ข้อความ + ปุ่มถัดไป
 * จำใน localStorage ว่าดูแล้ว · ปุ่ม "วิธีใช้" มุมขวาล่างเปิดดูซ้ำได้ทุกเมื่อ
 */
export function Tour({ id, steps, waitForLoader = false }: { id: string; steps: TourStep[]; waitForLoader?: boolean }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [mounted, setMounted] = useState(false);
  const [vp, setVp] = useState({ w: 1024, h: 768 });
  const [cardH, setCardH] = useState(200);
  const card = useRef<HTMLDivElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const step = steps[i];

  useEffect(() => { setMounted(true); }, []);

  const finish = useCallback(() => {
    setOpen(false);
    try { localStorage.setItem(KEY(id), '1'); } catch { /* ไม่มี storage ก็แค่ขึ้นอีกรอบ */ }
    opener.current?.focus?.();
  }, [id]);

  const start = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    setI(0);
    setOpen(true);
  }, []);

  // เปิดเองครั้งแรก (หน้าแรกรอให้หน้าโหลดโมเดลหายก่อน)
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY(id)) === '1'; } catch { /* ถือว่ายังไม่เคยดู */ }
    if (seen || new URLSearchParams(location.search).has('notour')) return;
    let cancelled = false;
    const t0 = performance.now();
    const tick = () => {
      if (cancelled) return;
      const loader = waitForLoader ? document.querySelector('.model-loader') : null;
      const loading = loader && !loader.hasAttribute('data-hide') && getComputedStyle(loader).display !== 'none' && performance.now() - t0 < 6000;
      if (loading) { timer = setTimeout(tick, 250); return; }
      timer = setTimeout(() => { if (!cancelled) start(); }, waitForLoader ? 700 : 150);
    };
    let timer = setTimeout(tick, waitForLoader ? 600 : 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [id, waitForLoader, start]);

  // วัดตำแหน่งเป้าหมาย เลื่อนให้อยู่ในจอ และตามการเลื่อน/ย่อขยายหน้าต่าง
  const measure = useCallback(() => {
    setVp((o) => (o.w === window.innerWidth && o.h === window.innerHeight ? o : { w: window.innerWidth, h: window.innerHeight }));
    const { el } = resolve(step);
    if (!el) { setBox(null); return; }
    const r = el.getBoundingClientRect();
    const nb = { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
    setBox((o) => (o && Math.abs(o.x - nb.x) < 0.5 && Math.abs(o.y - nb.y) < 0.5 && Math.abs(o.w - nb.w) < 0.5 && Math.abs(o.h - nb.h) < 0.5 ? o : nb));
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    const { el } = resolve(step);
    if (el) {
      const r = el.getBoundingClientRect();
      const sheet = window.innerWidth < 640; // มือถือ: การ์ดเป็นแผงล่าง ต้องกันที่ให้
      const ch = (card.current?.offsetHeight ?? 240) + 28;
      const room = sheet ? window.innerHeight - ch : window.innerHeight - 40;
      if (r.top < 70 || r.bottom > room) {
        const tall = r.height > room - 90;
        window.scrollTo({ top: window.scrollY + r.top - (tall ? 80 : Math.max(80, (room - r.height) / 2)), behavior: 'instant' as ScrollBehavior });
      }
    }
    measure();
    const again = setTimeout(measure, 120); // หลังเลื่อนเสร็จ/ภาพโหลดแล้ววัดซ้ำ
    return () => clearTimeout(again);
  }, [open, step, measure]);

  useEffect(() => {
    if (!open) return;
    const poll = setInterval(measure, 200); // ตามเลย์เอาต์ที่ขยับหลังโหลด (Suspense, ภาพ, ฟอนต์)
    const on = () => measure();
    window.addEventListener('resize', on);
    window.addEventListener('scroll', on, { passive: true, capture: true });
    return () => { clearInterval(poll); window.removeEventListener('resize', on); window.removeEventListener('scroll', on, { capture: true }); };
  }, [open, measure]);

  useLayoutEffect(() => { if (open && card.current) setCardH(card.current.offsetHeight); }, [open, i, vp.w]);
  useEffect(() => { if (open) nextBtn.current?.focus({ preventScroll: true }); }, [open, i]);

  const shown = resolve(step);
  const last = i === steps.length - 1;
  const next = useCallback(() => (last ? finish() : setI((n) => n + 1)), [last, finish]);
  const prev = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, prev, finish]);

  // ตำแหน่งการ์ด: มือถือเป็นแผงล่าง · จอเตี้ย (มือถือแนวนอน) อยู่คอลัมน์ขวา · จอใหญ่อยู่ใต้/เหนือ/ข้างกรอบ ไม่มีกรอบ = กลางจอ
  const cw = Math.min(CARD_W, vp.w - 24);
  const sheet = vp.w < 640;
  const short = !sheet && vp.h < 520;
  let pos: React.CSSProperties;
  if (sheet) pos = { left: 12, right: 12, bottom: 'max(12px, env(safe-area-inset-bottom))', maxWidth: 520, marginInline: 'auto' };
  else if (short) pos = { right: 'max(12px, env(safe-area-inset-right))', top: 12, width: Math.min(320, vp.w * 0.42) };
  else if (!box) pos = { left: Math.max(12, (vp.w - cw) / 2), top: Math.max(12, (vp.h - cardH) / 2), width: cw };
  else {
    const below = box.y + box.h + 14;
    const above = box.y - cardH - 14;
    const cx = Math.min(Math.max(12, box.x + box.w / 2 - cw / 2), vp.w - cw - 12);
    const midY = Math.min(Math.max(12, box.y + box.h / 2 - cardH / 2), vp.h - cardH - 12);
    if (below + cardH < vp.h - 12) pos = { left: cx, top: below, width: cw };
    else if (above >= 12) pos = { left: cx, top: above, width: cw };
    else if (box.x + box.w + 14 + cw < vp.w - 12) pos = { left: box.x + box.w + 14, top: midY, width: cw }; // เป้าสูงมาก: วางข้างขวา
    else if (box.x - 14 - cw > 12) pos = { left: box.x - 14 - cw, top: midY, width: cw };
    else pos = { left: cx, top: Math.max(12, vp.h - cardH - 12), width: cw };
  }
  pos = { ...pos, maxHeight: vp.h - 24, overflowY: 'auto' };

  return (
    <>
      {mounted && !open && (
        <button type="button" onClick={start} aria-label="ดูวิธีใช้หน้านี้"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-30 inline-flex min-h-11 items-center gap-2 squircle-2xl border border-line bg-surface/95 px-4 text-base font-medium shadow-lg backdrop-blur transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
          <CircleHelp className="size-5 text-brand-blue" aria-hidden /> วิธีใช้
        </button>
      )}
      {mounted && open && step && createPortal(
        <div className="fixed inset-0 z-[200]" role="presentation">
          {/* กันคลิกทะลุระหว่างทัวร์ */}
          <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} aria-hidden />
          {box ? (
            <div aria-hidden className="pointer-events-none absolute squircle-2xl border-2 border-brand-blue transition-all duration-300 motion-reduce:transition-none"
              style={{ left: box.x, top: box.y, width: box.w, height: box.h, boxShadow: '0 0 0 9999px rgba(8,10,16,.62), 0 0 0 4px color-mix(in oklab, var(--brand-blue) 30%, transparent)' }} />
          ) : <div aria-hidden className="pointer-events-none absolute inset-0 bg-[rgba(8,10,16,.62)]" />}
          <div ref={card} role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text"
            className="absolute grid gap-3 squircle-2xl border border-line bg-surface p-5 text-foreground shadow-2xl"
            style={pos}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-brand-blue">ขั้นที่ {i + 1} จาก {steps.length}</p>
              <button type="button" onClick={finish} aria-label="ปิดคำแนะนำ" className="-m-2 grid size-11 place-items-center squircle-xl text-muted-foreground hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand-blue">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <h2 id="tour-title" className="font-display text-xl font-bold leading-snug">{shown.title}</h2>
            <p id="tour-text" className="text-base leading-relaxed text-muted-foreground">{shown.text}</p>
            <div className="flex items-center gap-1.5" aria-hidden>
              {steps.map((_, n) => <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-brand-blue' : 'w-1.5 bg-line'}`} />)}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <button type="button" onClick={finish} className="min-h-11 px-2 text-base text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-brand-blue">ข้าม</button>
              <div className="flex gap-2">
                {i > 0 && <Button type="button" variant="outline" className="h-11 px-4 text-base" onClick={prev}><ArrowLeft className="size-4" aria-hidden /> ย้อนกลับ</Button>}
                <Button ref={nextBtn} type="button" className="h-11 px-5 text-base" onClick={next}>{last ? 'เริ่มใช้งาน' : 'ถัดไป'} {!last && <ArrowRight className="size-4" aria-hidden />}</Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
