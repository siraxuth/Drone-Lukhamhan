'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** แถวเลื่อนแนวนอน: ลากด้วยเมาส์/นิ้วได้ มีปุ่มก่อนหน้า-ถัดไป และเลื่อนด้วยคีย์บอร์ดได้ (focus ที่การ์ด) */
export function ShowcaseRail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [bar, setBar] = useState({ left: 0, width: 1 });
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
    const w = Math.min(1, el.clientWidth / el.scrollWidth);
    setBar({ width: w, left: el.scrollWidth > el.clientWidth ? (el.scrollLeft / (el.scrollWidth - el.clientWidth)) * (1 - w) : 0 });
  }, []);

  useEffect(() => {
    sync();
    const el = ref.current;
    const ro = new ResizeObserver(sync);
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [sync]);

  const by = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: 'smooth' });

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between gap-6">
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
          <span className="absolute inset-y-0 rounded-full bg-brand-blue transition-[left] duration-150" style={{ left: `${bar.left * 100}%`, width: `${bar.width * 100}%` }} />
        </div>
        <div className="flex gap-2">
        {([['ก่อนหน้า', -1, ChevronLeft, edge.start], ['ถัดไป', 1, ChevronRight, edge.end]] as const).map(([label, dir, Icon, off]) => (
          <button key={label} type="button" aria-label={label} disabled={off} onClick={() => by(dir)}
            className="grid size-11 place-items-center squircle-xl border border-line bg-surface transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
            <Icon className="size-5" aria-hidden />
          </button>
        ))}
        </div>
      </div>
      <div
        ref={ref}
        onScroll={sync}
        onPointerDown={(e) => { if (e.pointerType === 'mouse') drag.current = { down: true, x: e.clientX, left: ref.current!.scrollLeft, moved: false }; }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d.down) return;
          const dx = e.clientX - d.x;
          if (Math.abs(dx) > 5) d.moved = true;
          ref.current!.scrollLeft = d.left - dx;
        }}
        onPointerUp={() => { drag.current.down = false; }}
        onPointerLeave={() => { drag.current.down = false; }}
        onClickCapture={(e) => { if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); drag.current.moved = false; } }}
        // ราง = กว้างเท่ากรอบ container (ชดเชย padding ของกรอบด้วย margin ลบ) การ์ดใบแรกเริ่มตรงขอบใน และเฟดซ้าย-ขวาที่ขอบกรอบให้การ์ดเลือนหาย
        style={{ maskImage: `linear-gradient(to right, ${edge.start ? 'black' : 'transparent'}, black 7%, black 93%, ${edge.end ? 'black' : 'transparent'})`, WebkitMaskImage: `linear-gradient(to right, ${edge.start ? 'black' : 'transparent'}, black 7%, black 93%, ${edge.end ? 'black' : 'transparent'})` }}
        className="-mx-5 flex cursor-grab snap-x snap-proximity items-stretch gap-5 overflow-x-auto px-5 pb-4 pt-4 scroll-px-5 [scrollbar-width:none] active:cursor-grabbing sm:-mx-10 sm:px-10 sm:scroll-px-10 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
