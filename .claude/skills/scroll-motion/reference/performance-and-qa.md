# Performance and QA

## Budget

Target 60 fps (16.7 ms/frame), keep long tasks under 50 ms, no layout thrash during scroll.

## Do

- Animate `transform`, `opacity`. Allow `clip-path` and small `filter` only on small, isolated layers.
- Promote only the few large moving layers (`will-change: transform`), and only while needed.
- Use one ticker (`gsap.ticker`) for everything frame-driven; remove per-component rAF loops.
- `gsap.quickTo` for followers (cursor, tilt, magnetic). One `pointermove` listener per feature, passive.
- Early-return in per-frame code when nothing changed (settled flags, epsilon checks).
- Pause ambient tweens when the stage is off-screen (`ScrollTrigger.create({ onToggle })`) and rely on the browser pausing rAF in background tabs.
- Remove `backdrop-filter` from fixed headers that sit over moving content. Use a solid translucent token color.
- Self-host fonts (variable, subset by script with `unicode-range`), preload only the one or two files used above the fold, and confirm the preload URL equals the `@font-face` URL.
- Images: explicit `width`/`height`, `decoding="async"`, `fetchpriority="high"` only for the LCP image. Prefer WebP/AVIF.
- Hydrate islands late: `client:visible`/`client:idle`.

## Don't

- Don't animate `top/left/width/height/margin`.
- Don't use `scrub` smoothing on top of Lenis.
- Don't stack many `mix-blend-mode`, `backdrop-filter` or big shadows on moving elements. (Also: `mix-blend-mode` only blends inside its stacking context; a parent with `z-index`, `isolation`, or `overflow` + positioned context may isolate it and the effect silently fails, especially in light mode.)
- Don't create tweens inside pointer handlers every event.
- Don't ship scroll-jacking that fights native scroll (no `preventDefault` on wheel). Lenis smooths; it does not hijack.

## Accessibility

- `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)` for all motion; the `reduce` branch gets the static page.
- Pinned scenes are desktop-only; phones get a stacked layout. Never trap keyboard focus in a pinned scene; panels hold content that also exists in the stacked layout.
- Keep text contrast at least 4.5:1 in both themes; muted text on light backgrounds is the common failure (use L ≈ 0.44 for muted on near-white).
- Decorative motion and SVG are `aria-hidden`. Links keep visible focus. Don't hide meaningful text inside animation-only elements.

## Testing checklist

1. **Force frames in headless panes.** A hidden or unfocused browser pane pauses `requestAnimationFrame`, so scrubbed timelines and GSAP intros look stuck or half-faded. Take a screenshot, wait 2 s, take another; then read state with JS. Do not conclude a bug from the first frame.
2. **Fake scroll positions**: `window.scrollTo({ top, behavior: 'instant' })` then wait. Sample every scene: start, mid-transition, hold, exit, and the section after the pin.
3. **Both themes** (`localStorage.theme`), **1440×900**, a narrow desktop (~1100), **375×812**, and **reduced motion** emulation. Check no horizontal overflow (`scrollWidth === clientWidth`).
4. **Console**: reload and read only fresh errors. Some tools accumulate messages across loads; confirm by reloading and comparing counts. Hydration warnings mean something animated a React-owned node too early.
5. **No-JS / script failure**: content must remain visible (reveal gating happens in JS).
6. **Frame rate**: measure in a real, visible window (Chrome DevTools Performance panel, Lighthouse, or a rAF delta sampler while scrolling). If you cannot (hidden pane), say so; do not claim it is smooth.
7. **Build**: typecheck, production build, inspect output HTML for SEO tags and that key content (FAQ answers, headings) exists without JS.

## SEO companions for animated landing pages

- Real content lives in the static HTML, once per language; hidden duplicate layouts should not carry unique content.
- One visible `h1` per layout; descriptive `alt`; real headings.
- `canonical`, `hreflang` (with `x-default`), OG/Twitter images, JSON-LD (`SoftwareApplication` / `WebSite` / `FAQPage` only when the FAQ is visible), sitemap, `robots.txt`. Configure the production origin via env (`SITE_URL`); when unset, skip canonical/sitemap rather than guessing a domain.
- Core Web Vitals: reserve space for images (CLS), preload the display font, keep the LCP element simple (often the `h1`), defer non-critical islands (INP/LCP).
