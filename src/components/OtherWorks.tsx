'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Item = { id: string; title: string; summary: string; image: string | null; year: number | null };

/**
 * ผลงานอื่นในกล่องเดียว: หัวข้อ + ปุ่ม "ดูผลงานทั้งหมด" + ปุ่มเลื่อน
 * แถบการ์ดเลื่อนซ้าย-ขวาได้จริง (นิ้วปัด แทร็กแพด ล้อเมาส์ + Shift หรือปุ่มลูกศร) หยุดตรงขอบการ์ด
 * แสดง 4 ใบต่อแถวบนจอใหญ่ (2 ใบบนแท็บเล็ต 1 ใบกว่าบนมือถือ) ภาพทุกใบสัดส่วน 16:9
 */
export function OtherWorks({ items }: { items: Item[] }) {
  const scroller = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = scroller.current;
    if (el) setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = scroller.current;
    const card = el?.querySelector('li');
    if (el && card) el.scrollBy({ left: dir * (card.getBoundingClientRect().width + 16), behavior: 'smooth' });
  };
  const nav = 'size-11 rounded-full';

  return (
    <section className="mt-20 squircle-3xl border border-line bg-surface p-5 sm:p-8" aria-labelledby="more">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="more" className="font-display text-3xl font-extrabold">ผลงานอื่น</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-11 px-4 text-base" render={<Link href="/works" />} nativeButton={false}>ดูผลงานทั้งหมด <ArrowRight className="size-4" aria-hidden /></Button>
          <Button variant="outline" size="icon" className={nav} onClick={() => go(-1)} disabled={edge.start} aria-label="เลื่อนไปผลงานก่อนหน้า"><ChevronLeft aria-hidden /></Button>
          <Button variant="outline" size="icon" className={nav} onClick={() => go(1)} disabled={edge.end} aria-label="เลื่อนไปผลงานถัดไป"><ChevronRight aria-hidden /></Button>
        </div>
      </div>
      <ul ref={scroller} onScroll={update} tabIndex={0} aria-label="ผลงานอื่น เลื่อนซ้ายขวาได้" className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue">
        {items.map((o) => (
          <li key={o.id} className="w-[85%] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]">
            <Link href={`/works/${o.id}`} className="group flex h-full flex-col squircle-3xl border border-line bg-surface-2/40 p-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
              <span className="relative block aspect-video overflow-hidden squircle-2xl bg-surface-2">
                {o.image ? <Image src={o.image} alt="" fill sizes="(min-width: 1024px) 20vw, (min-width: 640px) 45vw, 85vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : <span className="grid size-full place-items-center text-muted-foreground"><Plane className="size-12" strokeWidth={1.25} aria-hidden /></span>}
                {o.year && <span className="absolute left-3 top-3 squircle-xl bg-background/90 px-2.5 py-0.5 text-sm font-semibold">ปี {o.year}</span>}
              </span>
              <span className="mt-3 block px-1.5 pb-1.5">
                <span className="line-clamp-2 block text-lg font-bold leading-snug group-hover:text-brand-blue">{o.title}</span>
                <span className="mt-1 line-clamp-2 block text-base text-muted-foreground">{o.summary}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
