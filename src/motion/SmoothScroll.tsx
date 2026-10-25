'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sceneState } from '@/scene/store';

gsap.registerPlugin(ScrollTrigger);

/** Lenis + ScrollTrigger + reveal กลุ่ม — mount ครั้งเดียวที่ landing */
export function SmoothScroll() {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    let lenis: Lenis | undefined;
    let tick: ((t: number) => void) | undefined;

    if (!reduce) {
      root.classList.add('reveal-ready');
      lenis = new Lenis({ anchors: true, lerp: 0.1 });
      if (process.env.NODE_ENV !== 'production') (window as unknown as { __lenis?: Lenis }).__lenis = lenis; // ไว้ทดสอบเลื่อนหน้าตอน dev
      lenis.on('scroll', ScrollTrigger.update);
      lenis.on('scroll', (l: Lenis) => { sceneState.velocity = l.velocity * 60; });
      tick = (t) => { lenis!.raf(t * 1000); sceneState.velocity *= 0.9; };
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal-group]'));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.setAttribute('data-inview', ''), io.unobserve(e.target))),
      { rootMargin: '0px 0px -12% 0px' },
    );
    groups.forEach((g) => {
      g.querySelectorAll<HTMLElement>('[data-reveal-item]').forEach((el, i) => el.style.setProperty('--i', String(i)));
      io.observe(g);
    });

    return () => {
      io.disconnect();
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      root.classList.remove('reveal-ready');
    };
  }, []);

  return null;
}
