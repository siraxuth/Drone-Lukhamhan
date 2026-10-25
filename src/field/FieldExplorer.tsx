'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Check, Clock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlightRunner } from '@/flight/FlightRunner';
import { programsOf } from '@/flight/programs';
import type { EventId, RuleEvent, Season } from '@/rules/types';

const TOP: Record<EventId, string> = {
  mission: '/field/mission-top.webp',
  aviation: '/field/aviation-top.webp',
  innovation: '/field/innovation-top.webp',
};
const TASK: Record<EventId, string> = { mission: 'ทิ้งสัมภาระลงแท่น', aviation: 'แตะลูกโป่ง', innovation: 'ยิงเป้า' };
const mins = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} นาที`;

/**
 * หน้า "สนามและกติกา" อ่านจากบนลงล่าง: 1 เลือกประเภท → 2 ดูโดรนบินตัวอย่างในสนาม → 3 ต้องทำอะไร → 4 ได้คะแนนยังไง
 * ทุกอย่างอ่านจาก rules/season-*.ts เปลี่ยนปีไม่ต้องแก้ UI
 */
export function FieldExplorer({ season }: { season: Season }) {
  const qs = useSearchParams();
  const fromUrl = season.events.find((e) => e.id === qs.get('tab'));
  const [id, setId] = useState<EventId>((fromUrl ?? season.events[0]).id);
  // เก็บประเภทที่เลือกไว้ใน URL (?tab=) รีเฟรชหรือส่งลิงก์แล้วอยู่ประเภทเดิม ไม่ต้องรีโหลดหน้า
  const pick = (next: EventId) => {
    setId(next);
    const u = new URL(window.location.href);
    u.searchParams.set('tab', next);
    window.history.replaceState(null, '', u);
  };
  const ev = season.events.find((e) => e.id === id) as RuleEvent;
  const prog = programsOf(ev.id)[0];

  return (
    <div className="grid gap-14">
      {/* 1 เลือกประเภท */}
      <section aria-labelledby="pick" className="grid gap-4">
        <h2 id="pick" className="flex items-center gap-3 font-display text-2xl font-extrabold sm:text-3xl">
          <span className="grid size-9 place-items-center squircle-xl bg-foreground text-lg text-background">1</span> เลือกประเภทการแข่ง
        </h2>
        <div role="radiogroup" aria-labelledby="pick" className="grid gap-3 md:grid-cols-3">
          {season.events.map((e) => {
            const on = e.id === id;
            return (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pick(e.id)}
                className={`group relative grid gap-3 squircle-3xl border-2 bg-surface p-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${on ? 'border-brand-blue shadow-[0_10px_40px_-18px_var(--brand-blue)]' : 'border-line hover:border-foreground/30'}`}
              >
                <div className="relative aspect-[16/9] overflow-hidden squircle-2xl bg-surface-2">
                  <Image src={TOP[e.id]} alt="" fill sizes="(min-width: 768px) 28vw, 100vw" className="object-cover" />
                  {on && <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-brand-blue text-white"><Check className="size-5" aria-hidden /></span>}
                </div>
                <div className="px-1 pb-1">
                  <p className="font-display text-2xl font-extrabold leading-tight">{e.short}</p>
                  <p className="mt-0.5 text-base text-muted-foreground">{TASK[e.id]} · {e.nameEn}</p>
                  <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
                    <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-muted-foreground" aria-hidden /> {mins(e.durationSec)}</span>
                    <span className="inline-flex items-center gap-1.5"><Trophy className="size-4 text-muted-foreground" aria-hidden /> เต็ม {e.maxPoints} คะแนน</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2 ดูในสนามจริง */}
      <section aria-labelledby="see" className="grid gap-4">
        <div className="grid gap-2">
          <h2 id="see" className="flex items-center gap-3 font-display text-2xl font-extrabold sm:text-3xl">
            <span className="grid size-9 place-items-center squircle-xl bg-foreground text-lg text-background">2</span> ดูโดรนบินในสนามจริง
          </h2>
          <p className="max-w-3xl text-lg leading-8 text-muted-foreground">{ev.summary}</p>
        </div>
        <FlightRunner event={ev} code={prog.code} playLabel="ดูโดรนบินตัวอย่าง" />
        <div className="flex flex-wrap items-center justify-between gap-3 squircle-2xl border border-line bg-surface p-4">
          <p className="text-base"><span className="text-muted-foreground">โปรแกรมตัวอย่างที่ใช้บิน:</span> <b>{prog.title}</b></p>
          <Button variant="outline" className="h-10 px-4 text-base" render={<Link href={`/simulator?p=${prog.id}`} />} nativeButton={false}>เปิดในตัวจำลองเพื่อแก้โค้ดเอง <ArrowRight className="size-4" aria-hidden /></Button>
        </div>
      </section>

      {/* 3 + 4 ทำอะไร / ได้คะแนนยังไง */}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
        <section aria-labelledby="todo" className="grid content-start gap-5">
          <h2 id="todo" className="flex items-center gap-3 font-display text-2xl font-extrabold sm:text-3xl">
            <span className="grid size-9 place-items-center squircle-xl bg-foreground text-lg text-background">3</span> ต้องทำอะไรบ้าง
          </h2>
          <ol className="grid gap-3">
            {ev.steps.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4 squircle-2xl border border-line bg-surface p-4">
                <span className="grid size-9 place-items-center squircle-xl bg-brand-blue/10 font-mono text-lg font-bold text-brand-blue">{i + 1}</span>
                <div>
                  <h3 className="text-lg font-bold leading-snug">{s.title}</h3>
                  <ul className="mt-1.5 grid gap-1 text-base leading-7 text-muted-foreground">{s.items.map((t) => <li key={t}>• {t}</li>)}</ul>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="score" className="grid content-start gap-5">
          <h2 id="score" className="flex items-center gap-3 font-display text-2xl font-extrabold sm:text-3xl">
            <span className="grid size-9 place-items-center squircle-xl bg-foreground text-lg text-background">4</span> ได้คะแนนยังไง
          </h2>
          <div className="squircle-2xl border border-line bg-surface p-4 sm:p-5">
            <p className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
              <span className="text-base text-muted-foreground">รวมสูงสุด · เท่ากันตัดสินที่เวลา</span>
              <span className="font-display text-4xl font-extrabold text-brand-blue">{ev.maxPoints}</span>
            </p>
            <ul className="divide-y divide-line">
              {ev.scoring.map((r) => (
                <li key={r.item} className="flex items-start justify-between gap-4 py-3">
                  <span className="min-w-0 text-base leading-7">{r.item}{r.note && <span className="block text-sm text-muted-foreground">{r.note}</span>}</span>
                  <span className="shrink-0 whitespace-nowrap squircle-xl bg-surface-2 px-2.5 py-0.5 text-base font-bold text-brand-blue">{r.points}</span>
                </li>
              ))}
            </ul>
          </div>
          {ev.notes.length > 0 && (
            <div className="squircle-2xl bg-surface-2 p-4">
              <p className="text-base font-bold">เคล็ดลับ</p>
              <ul className="mt-1.5 grid gap-1.5 text-base leading-7 text-muted-foreground">{ev.notes.map((n) => <li key={n}>• {n}</li>)}</ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
