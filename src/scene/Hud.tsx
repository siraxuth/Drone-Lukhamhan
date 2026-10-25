'use client';

import { useEffect, useRef } from 'react';

/** กรอบ squircle เต็มจอ + เส้นบอกความคืบหน้าการเลื่อน (อัปเดตผ่าน ref ไม่ re-render) */
export function Hud() {
  const refs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const bar = refs.current.bar; if (bar) bar.style.transform = `scaleX(${(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)).toFixed(4)})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const r = (k: string) => (el: HTMLElement | null) => { refs.current[k] = el; };
  return (
    <div
      className="pointer-events-none fixed inset-2 z-[300] hidden squircle-panel overflow-hidden border border-line sm:block"
      style={{ boxShadow: '0 0 0 100vmax var(--canvas)' }}
      aria-hidden
    >
      <div className="absolute inset-x-8 bottom-0 h-px bg-line"><div ref={r('bar')} className="h-full origin-left scale-x-0 bg-brand-blue" /></div>
    </div>
  );
}
