'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * มือถือ: เส้นทางหน้าอยู่บรรทัดเดียว เลื่อนข้างได้ ไม่ตัดคำ ไม่ขึ้นหลายบรรทัด
 * เปิดมาเลื่อนไปท้ายสุดให้เห็น "หน้าปัจจุบัน" ก่อนเสมอ · ขอบที่ยังมีเนื้อหาซ่อนอยู่เฟดจางบอกใบ้ให้เลื่อน
 * จอ sm ขึ้นไป: ไม่เลื่อน แสดงเต็มตามเดิม
 */
export function BreadcrumbScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ l: false, r: false });

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setFade({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth; // ไปท้ายสุด = หน้าปัจจุบัน
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync]);

  const mask = `linear-gradient(to right, ${fade.l ? 'transparent' : 'black'}, black 1.5rem, black calc(100% - 1.5rem), ${fade.r ? 'transparent' : 'black'})`;
  return (
    <div
      ref={ref}
      onScroll={sync}
      className="overflow-x-auto [scrollbar-width:none] sm:overflow-visible [&::-webkit-scrollbar]:hidden"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      {children}
    </div>
  );
}
