// scroll-motion template: Lenis + ScrollTrigger, a pinned master timeline, SVG drawing,
// pointer effects, and a stacked fallback. Adapt selectors (data-*) to your markup.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

const STAGE_QUERY = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';
const stageMQ = matchMedia(STAGE_QUERY);
const stageOn = stageMQ.matches;
stageMQ.addEventListener('change', () => location.reload()); // two DOM trees, so reload when the layout class flips

// Hidden start states exist only while this module runs, so a failed script never strands content.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('reveal-ready');

type Cleanup = () => void;

function initStage(lenis: Lenis, cleanups: Cleanup[]) {
  const stage = document.querySelector<HTMLElement>('[data-stage]');
  if (!stage) return;
  const $ = <T extends Element = HTMLElement>(s: string) => stage.querySelector<T>(s)!;
  const $$ = <T extends Element = HTMLElement>(s: string) => Array.from(stage.querySelectorAll<T>(s));

  const hero = $('[data-hero-object]'); // big SVG scene
  const frame = $('[data-frame]'); // product window
  const box = $('[data-box]'); // centered container
  const panels = $$('[data-panel]'); // text scenes, one per step

  // 1. Intro on load. Child elements only; the scrubbed timeline below owns the wrappers.
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from($$('.hero-line'), { yPercent: 115, duration: 1.3, stagger: 0.12 })
    .from($$('.hero-in'), { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.5)
    .from($('[data-hero-object] svg'), { scale: 0.82, opacity: 0, duration: 1.8, transformOrigin: '50% 50%' }, 0);

  // 2. Ambient loops run only while the scene is on screen.
  const ambient = [gsap.to($$('[data-orbit]'), { rotation: 360, duration: 160, ease: 'none', repeat: -1, paused: true })];
  ScrollTrigger.create({ trigger: stage, start: 'top bottom', end: 'top+=1400 top',
    onToggle: (self) => ambient.forEach((a) => (self.isActive ? a.play() : a.pause())) });

  // 3. Master timeline.
  const UNIT = 0.8; // viewport heights of scroll per timeline unit
  const SIDE_SCALE = 0.62;
  const shiftX = () => (box.clientWidth - frame.offsetWidth * SIDE_SCALE) / 2;
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: stage, start: 'top top', end: () => '+=' + Math.round(innerHeight * UNIT * tl.duration()),
      pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true },
  });

  tl.to($('[data-line-a]'), { xPercent: -28, duration: 1 }, 0)
    .to($('[data-line-b]'), { xPercent: 28, duration: 1 }, 0)
    .to($('[data-title]'), { opacity: 0, duration: 0.8 }, 0.2)
    .to(hero, { scale: 2.2, rotation: 25, duration: 1 }, 0)
    .to(hero, { scale: 4.6, opacity: 0, duration: 1.1 }, 1) // camera dive, capped to keep SVG edges crisp
    .fromTo(frame, { scale: 0.3, opacity: 0, y: 70 }, { scale: 1, opacity: 1, y: 0, duration: 1.2 }, 0.8);

  const T0 = 2.9;
  tl.addLabel('steps', T0 - 0.3).to(frame, { scale: SIDE_SCALE, x: shiftX, duration: 0.9 }, T0 - 0.8);
  panels.forEach((panel, i) => {
    const t = T0 + i;
    tl.fromTo(panel, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.35 }, t)
      .fromTo(panel.querySelectorAll('[data-draw]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, stagger: 0.08 }, t + 0.05)
      .to(panel, { opacity: 0, y: -50, duration: 0.3 }, t + 0.7);
  });
  tl.fromTo($('[data-progress]'), { scaleX: 0 }, { scaleX: 1, duration: tl.duration(), ease: 'none' }, 0);

  // 4. Nav links jump to scenes.
  const st = tl.scrollTrigger!;
  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href$="#steps"]');
    if (!a) return;
    e.preventDefault();
    lenis.scrollTo(st.start + (tl.labels.steps / tl.duration()) * (st.end - st.start), { duration: 1.6 });
  };
  document.addEventListener('click', onClick);
  cleanups.push(() => document.removeEventListener('click', onClick));

  // 5. 3D tilt on a dedicated wrapper (own transform, so scrub transforms stay untouched).
  const tilt = $('[data-tilt]');
  gsap.set(tilt, { transformPerspective: 1400 });
  const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.8, ease: 'power3.out' });
  const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.8, ease: 'power3.out' });
  const onTilt = (e: PointerEvent) => { ry((e.clientX / innerWidth - 0.5) * 7); rx(-(e.clientY / innerHeight - 0.5) * 5); };
  window.addEventListener('pointermove', onTilt, { passive: true });
  cleanups.push(() => window.removeEventListener('pointermove', onTilt));
}

function initCursor(cleanups: Cleanup[]) {
  const cursor = document.querySelector<HTMLElement>('[data-cursor]');
  if (!cursor || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const ring = cursor.querySelector<HTMLElement>('[data-cursor-ring]')!;
  const dot = cursor.querySelector<HTMLElement>('[data-cursor-dot]')!;
  cursor.classList.remove('hidden');
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3.out' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3.out' });
  let visible = false, hot = false; // tween only when these change, never per event
  const onMove = (e: PointerEvent) => {
    rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    if (!visible) { visible = true; gsap.to(cursor, { opacity: 1, duration: 0.3, overwrite: 'auto' }); }
    const nowHot = !!(e.target as Element | null)?.closest('a, button, [role="tab"], summary, input');
    if (nowHot !== hot) { hot = nowHot; gsap.to(ring, { scale: hot ? 1.7 : 1, opacity: hot ? 0.55 : 1, duration: 0.3, overwrite: 'auto' }); }
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  cleanups.push(() => { window.removeEventListener('pointermove', onMove); cursor.classList.add('hidden'); });
}

const mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference)', () => {
  const cleanups: Cleanup[] = [];
  const lenis = new Lenis({ anchors: true, lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (t: number) => lenis.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  if (stageOn) initStage(lenis, cleanups);
  initCursor(cleanups);

  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) =>
    gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));

  return () => { cleanups.forEach((fn) => fn()); gsap.ticker.remove(tick); lenis.destroy(); };
});

// Staggered groups: GSAP only flips a data attribute on a non-React wrapper; CSS animates the items.
gsap.utils.toArray<HTMLElement>('[data-reveal-group]').forEach((group) =>
  ScrollTrigger.create({ trigger: group, start: 'top 88%', once: true, onEnter: () => group.setAttribute('data-inview', '') }));
