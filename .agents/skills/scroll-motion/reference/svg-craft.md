# SVG craft

SVG is the best material for scroll art: resolution-independent, themeable, and every part is addressable. Use inline SVG (not `<img>`) when parts must animate or follow theme colors.

## Authoring rules

- Pick one `viewBox` per illustration (`0 0 96 96` for icons, `0 0 800 800` for a hero scene) and design on that grid. Size with CSS (`size-24`, `w-[min(100vw,80svh,820px)] aspect-square`).
- Theme with tokens, not hex: `class="stroke-line fill-foreground"` (Tailwind) or `stroke="currentColor"`. Dark mode then comes free. Hard-coded greys are only for assets that must be self-contained (OG images, SVGs loaded with `<img>`).
- Line art recipe: `fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`. Use two tones: foreground for the key stroke, `text-muted-foreground` for supporting strokes. Keep 2–4 paths per illustration; fewer paths read as drawn, more read as clip-art.
- Mark decorative SVG `aria-hidden="true"`. If it carries meaning, `role="img"` plus `aria-label` (translate it).
- Ship them from components, not copy-paste: a `Part[]` table (`{ d, soft?, w? }`) per illustration keeps art reusable between the stacked layout and the pinned stage.

## Masks, clip paths, ids

- A crescent is a filled circle with a smaller circle cut out by a mask:
  ```svg
  <mask id="cut" maskUnits="userSpaceOnUse" x="200" y="200" width="400" height="400">
    <rect x="200" y="200" width="400" height="400" fill="#fff"/>
    <circle cx="452" cy="372" r="104" fill="#000"/>
  </mask>
  <circle cx="400" cy="400" r="128" class="fill-foreground" mask="url(#cut)"/>
  ```
- **`id`s are global to the document.** If the same component renders twice, suffix ids (`moon-cut-${uid}`).
- A `mask`/`clipPath`/gradient defined inside a `display:none` SVG does not resolve in Chrome. Never rely on a hidden copy for definitions another SVG uses.

## Transform origins in SVG

- For a group rotating about the viewBox center: `style="transform-origin: 400px 400px"` (px are viewBox units inside SVG), or GSAP `svgOrigin: '400 400'`.
- Scaling an element about its own center: `transformOrigin: '50% 50%'` with `transform-box: fill-box` in CSS, or set `transformOrigin` in GSAP (it handles SVG).
- Prefer transforming a wrapping `<g>` or the outer element rather than many children.

## Line drawing

With GSAP's `DrawSVGPlugin` (free since 3.13):

```ts
gsap.from(paths, { drawSVG: '0%', duration: 1.3, stagger: 0.12, ease: 'power2.inOut',
  scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
row.addEventListener('pointerenter', () =>
  gsap.fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: .9, stagger: .08, overwrite: 'auto' }));
```

Inside a scrubbed timeline: `tl.fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: .5, stagger: .08 }, t)`.

No plugin: give each path `pathLength="1"`, `stroke-dasharray="1"`, and animate `stroke-dashoffset` from 1 to 0.

Notes: `drawSVG` works on `path`, `line`, `circle`, `rect`, `polyline`. Stroke caps `round` hide the seam at the start. Closed shapes draw from the path's first point; choose the `d` start point on purpose.

## Concentric scenes (orbits, rings, bars)

- Rings: plain `<circle>` strokes (`stroke-dasharray="2 11"` + `stroke-linecap="round"` makes a dotted orbit). Rotate groups slowly (`rotation: 360, duration: 160–220, ease:'none', repeat:-1`) and **pause them when off-screen**.
- Radial bars: generate lines in the component (Astro/React) with `transform="rotate(angle cx cy)"` and a base length from a smooth function (`8 + 14*|sin(i*.7)*sin(i*.23+1)|`). Drive them with `setAttribute('y2', ...)` from pointer angle and scroll velocity only, and skip frames when settled.
- Orbiting satellites: put dots on the rotating group at the ring's radius, so they ride the orbit with no extra tween.

## SVG performance

- Complex SVG re-rasterizes when its ancestor scales. For big scale changes (camera dive) keep the shape simple (one path, one mask), cap scale at ~5, and fade out as it grows. Put `will-change: transform` on the wrapper.
- Fewer than ~150 nodes in anything animated per frame. 96 radial bars is fine when updated only on change; 1000 is not.
- Avoid SVG `filter` (blur, drop-shadow) on animated elements.
- Animate `transform`/`opacity` of SVG elements (GPU-friendly). Changing geometry attributes (`y2`, `d`) forces paint; do it sparingly and only for tiny regions.

## Illustrations for features (pattern)

One 96×96 line illustration per feature, drawn on arrival and redrawn on hover. Keep the metaphor literal: play button in a progress arc, stacked queue bars, text lines with one thick active line, laptop with a check, keycap with a letter, padlock. Never use stock icon fonts for hero-level art.

## Making OG images and icons from the same mark

Draw the mark once (a mask-based crescent), then render PNGs with Pillow or Sharp for `og-*.png` (1200×630), `apple-touch-icon.png` (180), `icon-192/512.png`, and a multi-size `favicon.ico`. Use `currentColor` plus a `prefers-color-scheme` style in `favicon.svg` so it adapts.
