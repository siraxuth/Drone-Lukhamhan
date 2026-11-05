# Scroll architecture

## Packages

```bash
bun add gsap lenis        # GSAP 3.13+ is free incl. ScrollTrigger, DrawSVGPlugin, SplitText, MotionPathPlugin
```

Register only what you use: `gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin)`.

## Lenis + ScrollTrigger (the only correct wiring)

```ts
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const lenis = new Lenis({ anchors: true, lerp: 0.1 });
lenis.on('scroll', ScrollTrigger.update);
const tick = (t: number) => lenis.raf(t * 1000);
gsap.ticker.add(tick);
gsap.ticker.lagSmoothing(0);
```

- Lenis is the smoother. Use `scrub: true` on ScrollTriggers. Adding `scrub: 0.7` on top double-smooths and feels laggy.
- `lenis.velocity` is available for velocity-reactive effects.
- Programmatic jump: `lenis.scrollTo(y, { duration: 1.6 })`.
- Clean up in `gsap.matchMedia()` return functions: remove ticker, `lenis.destroy()`.
- Disable Lenis for reduced motion.

## Two layouts, one document

A pinned stage and a stacked layout are different DOM trees. Render both and show one.

1. Early inline script in `<head>` (before paint):
   ```js
   if (matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)').matches)
     document.documentElement.classList.add('stage-on');
   ```
2. CSS:
   ```css
   [data-stage] { display: none; }
   .stage-on [data-stage] { display: block; }
   .stage-on [data-classic] { display: none; }
   ```
3. In JS: `const stageOn = matchMedia(QUERY).matches; matchMedia(QUERY).addEventListener('change', () => location.reload());`
4. SVG `id`s inside both copies must be unique (`mask id="moon-cut-s"` vs `-h`); a mask defined inside a `display:none` SVG does not work in Chrome.
5. Without JS or when the stage is off, users get the readable stacked page. That page is also what crawlers index; keep real content in it.

## Pinned stage = one master timeline

```ts
const UNIT = 0.8; // viewport heights of scroll per timeline unit
const tl = gsap.timeline({
  defaults: { ease: 'none' },
  scrollTrigger: {
    trigger: stage, start: 'top top',
    end: () => '+=' + Math.round(innerHeight * UNIT * tl.duration()),
    pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
  },
});
```

- Plan time in units. Example: hero out 0–1, window in 0.8–2, feature i at `F0 + i`, screenshot j at `S0 + j`. Total scroll length = units × UNIT × viewport height. Tune `UNIT` last.
- Give every scene an enter (0.35), hold, exit (0.3) so panels never overlap.
- Use `fromTo` with explicit start values for anything that must be hidden at progress 0 (immediateRender is on by default inside a timeline).
- Add labels (`tl.addLabel('features', t)`) and jump from nav links:
  ```ts
  const st = tl.scrollTrigger!;
  const go = (label: string) =>
    lenis.scrollTo(st.start + (tl.labels[label] / tl.duration()) * (st.end - st.start));
  ```
- Progress bar: `tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: tl.duration(), ease: 'none' }, 0)` added last.
- Use function-based values with `invalidateOnRefresh: true` for responsive positions: `x: () => (box.clientWidth - frame.offsetWidth * s) / 2`.
- **Do not tween the same property on the same element from two places** (an intro tween and a scrub tween both on `opacity`). Put the intro on the child and the scrub on the wrapper.

## Hero choreography that feels authored

- Headline lines rise out of a mask: wrapper `overflow:hidden` with `padding-block: .1em; margin-block: -.1em` (room for tall glyphs), inner `.hero-line` animated `yPercent: 115 → 0` with `expo.out`, stagger 0.12.
- Scroll-out: lines drift apart (`xPercent: ∓28`) while the object behind scales up. The camera "dives" through the hero object into the next scene (scale 1 → ~2.2, then → ~4.6 while opacity → 0). Capping scale around 5 keeps SVG edges crisp.
- Product window grows from `scale .3, y 70` to full, then docks to one side (`scale .62, x: shift`) while text scenes take the other side.

## Reveal pattern that is safe with islands and with JS failing

```css
.reveal-ready [data-reveal-group] [data-reveal-item] { opacity: 0; }
.reveal-ready [data-reveal-group][data-inview] [data-reveal-item] {
  animation: reveal-up .8s cubic-bezier(.22,1,.36,1) both;
  animation-delay: calc(var(--i, 0) * 80ms);
}
@keyframes reveal-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: none; } }
```

- `reveal-ready` is added **by the motion module itself** (and not when reduced motion is on). If the script never loads, nothing is hidden.
- The `data-reveal-group` wrapper must be a non-React element. GSAP only sets `data-inview` on it (`ScrollTrigger.create({ trigger, start: 'top 88%', once: true, onEnter })`).
- Each item has a static `style="--i: N"` for stagger.

## Scroll-linked pieces worth having

- Parallax: `gsap.to(el, { y: () => factor * 300, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })`.
- Footer wordmark that rises: trigger the **wrapper** (not the translated element) with `start: 'top 100%', end: 'bottom bottom'`.
- Header that tucks away on scroll down and returns on scroll up: a paused tween (`yPercent: -140`) played/reversed from `ScrollTrigger.create({ start: 0, end: 'max', onUpdate })` using `self.direction`.
- Velocity-reactive marquee: Magic UI `ScrollVelocityContainer/Row`.
- Screenshot crossfade in a sticky frame: `ScrollTrigger.create({ trigger: step, start: 'top 55%', end: 'bottom 55%', onToggle })`.

## Pointer effects (fine pointers only)

Guard with `matchMedia('(hover: hover) and (pointer: fine)')`.

- **Cursor follower**: ring with `quickTo(duration .45)` and dot with `quickTo(duration .1)`; tween scale/opacity only when `hot`/`visible` booleans change, never per event.
- **Magnetic buttons**: `quickTo(el, 'x'|'y')` toward `(pointer - center) * 0.25`, reset on `pointerleave`. Apply to a wrapper `span`, not the React button.
- **3D tilt**: wrapper with `transformPerspective: 1400`, `quickTo(rotationX/rotationY)` from normalized pointer (±7°, ±5°). Keep it on its own wrapper so scrub transforms are untouched.
- **Sound ring / reactive field**: values derived from pointer angle plus scroll velocity, smoothed by lerp, updated only while not settled.
