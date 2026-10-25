'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { end, parseStep, start, type St } from './script';
import type { Clock } from './DemoScene';

const DemoScene = dynamic(() => import('./DemoScene'), { ssr: false });

const GAP = 0.55; // หยุดค้างท่าสุดท้ายของแต่ละคำสั่งก่อนไปคำสั่งถัดไป

type Props = {
  /** โค้ดบรรทัดเดียว เช่น "drone.fw(250)" */
  code?: string;
  /** หลายบรรทัดเรียงตามลำดับ ท้ายบรรทัดใส่ // อธิบายเองได้ */
  steps?: string[];
  /** true = เริ่มตอนโดรนลอยอยู่แล้ว (ไม่ต้องขึ้นบินก่อน) */
  air?: boolean;
  caption?: string;
};

/**
 * สาธิต 3 มิติ: "หลังสั่งคำสั่งนี้ โดรนทำอะไร"
 * แปลงโค้ดเป็นท่าด้วย parseStep (ดู script.ts) แล้วเล่นบน Canvas เดียวต่อชิ้น
 * Canvas ถูกสร้างเมื่อเลื่อนใกล้ถึง และปล่อยทิ้งเมื่อไกล เพื่อไม่เกินจำนวน WebGL context ของเบราว์เซอร์
 */
export function CmdDemo({ code, steps: stepCodes, air = false, caption }: Props) {
  const list = useMemo(() => (stepCodes ?? (code ? [code] : [])).map(parseStep), [code, stepCodes]);
  const hasBall = list.some((s) => s.kind === 'drop');
  const states = useMemo(() => {
    const out: St[] = [start(air, hasBall)];
    list.forEach((s, i) => out.push(end(out[i], s)));
    return out;
  }, [list, air, hasBall]);

  const clock = useRef<Clock>({ t: 0, playing: true, total: 0, segs: [] });
  useMemo(() => {
    let t = 0;
    clock.current.segs = list.map((s) => { const g = { t0: t, len: s.dur }; t += s.dur + GAP; return g; });
    clock.current.total = t - GAP;
  }, [list]);

  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [active, setActive] = useState(false);
  const [dark, setDark] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [cur, setCur] = useState(0);
  const multi = list.length > 1;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const a = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.15 });
    const n = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '500px 0px' });
    a.observe(el); n.observe(el);
    return () => { a.disconnect(); n.disconnect(); };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains('dark'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { clock.current.playing = false; setPlaying(false); }
    return () => mo.disconnect();
  }, []);

  const setPlay = useCallback((p: boolean) => { clock.current.playing = p; setPlaying(p); }, []);
  const go = useCallback((i: number) => {
    const k = Math.max(0, Math.min(list.length - 1, i));
    clock.current.t = clock.current.segs[k].t0;
    setCur(k);
    setPlay(true);
  }, [list.length, setPlay]);
  const replay = () => { clock.current.t = 0; setCur(0); setPlay(true); };

  if (!list.length) return null;
  const s = list[Math.min(cur, list.length - 1)];

  return (
    <figure className="not-prose my-8">
      <div ref={box} className="overflow-hidden squircle-3xl border border-line bg-surface">
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/9]">
          {near ? (
            <DemoScene steps={list} states={states} clock={clock.current} cur={cur} dark={dark} active={active} onStep={setCur} />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-base text-muted-foreground">กำลังโหลดโดรน 3 มิติ…</div>
          )}
          <code className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-6rem)] truncate squircle-xl bg-background/90 px-3 py-1.5 font-mono text-sm font-semibold shadow-sm sm:text-base">{s.code}</code>
          <div className="absolute right-3 top-3 flex gap-1.5">
            <button type="button" onClick={() => setPlay(!playing)} aria-label={playing ? 'หยุดชั่วคราว' : 'เล่น'} className="grid size-10 place-items-center squircle-xl bg-background/90 shadow-sm hover:bg-background">
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button type="button" onClick={replay} aria-label="เล่นใหม่ตั้งแต่ต้น" className="grid size-10 place-items-center squircle-xl bg-background/90 shadow-sm hover:bg-background">
              <RotateCcw className="size-4" />
            </button>
          </div>
          <p className="pointer-events-none absolute bottom-3 left-3 squircle-xl bg-background/80 px-2.5 py-1 text-sm text-muted-foreground">
            ลูกศรแดง = ทิศหัวโดรน · เส้นฟ้า = เส้นทาง · ภาพช่วยเข้าใจ ไม่ใช่สเกลจริง
          </p>
        </div>

        <div className="border-t border-line p-4 sm:p-5">
          <p className="text-lg font-semibold">{multi && <span className="mr-2 inline-grid size-7 place-items-center squircle-xl bg-foreground align-middle text-base text-background">{cur + 1}</span>}{s.title}</p>
          <p className="mt-1.5 text-base leading-7 text-muted-foreground">{s.note}</p>
          {s.real != null && s.real > 0.3 && <p className="mt-1.5 text-base text-muted-foreground">เวลาจริงบนโดรนประมาณ <b className="text-foreground">{s.real.toFixed(2)} วินาที</b> (ในภาพเร่งให้ดูง่าย)</p>}

          {multi && (
            <>
              <ol className="mt-4 grid gap-1.5">
                {list.map((p, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => go(i)} aria-current={i === cur} className={`flex w-full items-center gap-3 squircle-xl px-3 py-2 text-left transition-colors ${i === cur ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>
                      <span className={`grid size-6 shrink-0 place-items-center squircle-xl text-sm font-semibold ${i === cur ? 'bg-background text-foreground' : 'bg-muted'}`}>{i + 1}</span>
                      <code className="min-w-0 flex-1 truncate font-mono text-sm sm:text-base">{p.code}</code>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => go(cur - 1)} disabled={cur === 0} className="inline-flex min-h-10 items-center gap-1.5 squircle-xl border border-line px-3 text-base disabled:opacity-40"><SkipBack className="size-4" /> ก่อนหน้า</button>
                <button type="button" onClick={() => go(cur + 1)} disabled={cur === list.length - 1} className="inline-flex min-h-10 items-center gap-1.5 squircle-xl border border-line px-3 text-base disabled:opacity-40">ถัดไป <SkipForward className="size-4" /></button>
              </div>
            </>
          )}
        </div>
      </div>
      {caption && <figcaption className="mt-3 px-1 text-base leading-7 text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}
