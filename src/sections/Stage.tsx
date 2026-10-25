'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { scenes } from './content';
import { Hero } from './Hero';
import { StoryArt } from './StoryArt';

/**
 * เวทีเดียวจาก Hero ไปจนจบ "โดรนบินได้ยังไง?"
 * - section สูง N หน้าจอ ข้างในมีเวที sticky เต็มจอ 1 อัน → ผู้ใช้เลื่อนแต่หน้าจอไม่เลื่อนตาม
 * - ช่วงแรกเป็น Hero แล้วค่อยๆ เปลี่ยนเป็นเรื่องที่ 1-7: โดรน 3 มิติเลื่อนไปอยู่ซ้าย ภาพเส้น SVG วาดขึ้นทางขวา
 * - ท่าของโดรนในแต่ละช่วงมาจาก div ว่าง [data-pose] ที่วางเรียงตามช่วงเลื่อน (Drone3D อ่านตำแหน่งจากตรงนี้)
 */
const N = scenes.length + 1; // ช่วงที่ 0 = Hero

export function Stage() {
  const root = useRef<HTMLElement>(null);
  const [seg, setSeg] = useState(0);

  useEffect(() => {
    const el = root.current!;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const span = r.height - innerHeight;
      const p = span > 0 ? Math.min(0.9999, Math.max(0, -r.top / span)) : 0;
      const next = Math.floor(p * N);
      setSeg((s) => (s === next ? s : next));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const hero = seg === 0;
  const step = Math.max(0, seg - 1);
  // แต่ละช่วงสูง (N-1)/N หน้าจอ และขยับลง 0.5 จอ เพราะ Drone3D เทียบกับ "กึ่งกลางจอ"
  const slice = `calc(${(N - 1) * 100}dvh / ${N})`;

  return (
    <section ref={root} aria-label="โดรนบินได้ยังไง" className="relative" style={{ height: `${N * 100}dvh` }}>
      {['hero', ...scenes.map((s) => s.id)].map((pose, i) => (
        <div key={pose} data-pose={pose} aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: `calc(${slice} * ${i} + 50dvh)`, height: slice }} />
      ))}

      <span id="how" aria-hidden className="absolute inset-x-0" style={{ top: `calc(${slice} * 0.5)` }} />

      <div className="sticky top-0 h-dvh overflow-hidden">
        <div className="stage-layer absolute inset-0" data-on={hero} data-from="up" aria-hidden={!hero} inert={!hero}>
          <Hero />
        </div>

        <div className="stage-layer absolute inset-0" data-on={!hero} data-from="down" aria-hidden={hero} inert={hero}>
          <div className="mx-auto grid h-full max-w-[84rem] grid-rows-[minmax(0,1fr)_auto] gap-2 px-4 pb-6 pt-[8.5rem] sm:px-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:grid-rows-1 lg:gap-6 lg:pb-8 lg:pt-24 xl:px-10">
            {/* ภาพ: มือถืออยู่บน · จอใหญ่อยู่ขวา · โดรน 3 มิติ (วาดโดย SceneLayer ด้านหลัง) มาอยู่กึ่งกลางกล่องนี้ แล้ว SVG วาดรอบตัวมัน */}
            <div className="story-art pointer-events-none order-1 flex min-h-0 items-center justify-center lg:order-2" aria-hidden>
              <div data-drone-slot className="aspect-[6/5] max-h-full w-full lg:max-w-[60rem]">
                <StoryArt step={scenes[step].id} />
              </div>
            </div>

            <div className="order-2 flex min-w-0 flex-col justify-end lg:order-1 lg:justify-center">
              <h2 className="text-lg font-medium text-muted-foreground">โดรนบินได้ยังไง?</h2>
              <div className="relative mt-3 min-h-[15rem] sm:min-h-[17rem] lg:min-h-[24rem]">
                {scenes.map((s, i) => (
                  <article key={s.id} aria-hidden={i !== step} data-state={i === step ? 'on' : i < step ? 'past' : 'next'} className="story-panel absolute inset-x-0 top-0">
                    <div className="flex min-w-0 items-center gap-2.5 text-base">
                      <span className="shrink-0 font-mono font-semibold">{String(i + 1).padStart(2, '0')}<span className="text-muted-foreground"> / {String(scenes.length).padStart(2, '0')}</span></span>
                      {s.term && <span className="min-w-0 truncate squircle-xl bg-muted px-2.5 py-0.5 text-muted-foreground">{s.term}</span>}
                    </div>
                    <h3 className="mt-2 font-display text-[1.6rem] font-extrabold leading-[1.2] tracking-[-0.02em] text-balance sm:text-4xl lg:text-5xl">{s.short}</h3>
                    <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">{s.body}</p>
                    {s.formula && <p className="mt-3 border-l-2 border-brand-blue pl-4 text-base font-medium sm:mt-4 sm:text-lg">{s.formula}</p>}
                  </article>
                ))}
              </div>
              <Link href="/docs/start/how-a-drone-flies" className="mt-4 inline-flex min-h-11 w-fit items-center gap-1.5 squircle-xl text-base font-medium text-brand-blue underline-offset-4 hover:underline">อ่านอธิบายเต็มๆ <ArrowUpRight className="size-4" aria-hidden /></Link>
              <ol className="mt-3 flex gap-1.5" aria-label="ความคืบหน้า">
                {scenes.map((s, i) => (
                  <li key={s.id} className="h-0.5 flex-1 bg-line">
                    <span className="block h-full origin-left bg-foreground transition-transform duration-500" style={{ transform: `scaleX(${i <= step ? 1 : 0})` }} />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
