---
name: scroll-motion
description: Use when a page should feel crafted and cinematic instead of "AI-made": scroll-driven storytelling, pinned scenes, SVG line-drawing and illustrations, GSAP + ScrollTrigger + Lenis, Magic UI components (marquee, scroll velocity, text reveal, border beam, number ticker), cursor and pointer effects, hero choreography. Covers how to keep it smooth (no jank), accessible (reduced motion), and compatible with React islands (Astro, Next, Vite). Triggers: "scroll animation", "GSAP", "ScrollTrigger", "pinned section", "SVG animation", "landing page that feels premium", "not AI slop", "magicui".
---

# scroll-motion

Build scroll-driven pages that feel authored by a person: one idea per viewport, motion that explains something, SVG art drawn for the product, and a frame budget that never drops. This skill is stack-agnostic (Astro, Next, Vite, plain HTML). Examples use GSAP, Lenis and Magic UI because they compose well.

Read the reference files only when you reach that step:

| Step | File |
|---|---|
| Choose the scroll model, wire Lenis + ScrollTrigger, build a pinned scene | [reference/scroll-architecture.md](reference/scroll-architecture.md) |
| Draw, mask, animate and perform with SVG | [reference/svg-craft.md](reference/svg-craft.md) |
| Add and adapt Magic UI components | [reference/magicui.md](reference/magicui.md) |
| Keep it smooth, accessible, and testable | [reference/performance-and-qa.md](reference/performance-and-qa.md) |
| Copy-ready starting code | [templates/stage-motion.ts](templates/stage-motion.ts), [templates/motion.css](templates/motion.css) |

## The workflow

1. **Name the scene list before writing code.** One sentence per act: what the visitor sees, what changed since the last act, what the scroll does. If two acts have the same verb ("fades in"), merge or redesign one.
2. **Pick one hero idea and commit.** A drawn object that belongs to the brand (a crescent for "Luno", a waveform for audio, a route line for travel) carries more than ten generic effects. Build it as inline SVG so every part can be animated.
3. **Choose the scroll model** (see scroll-architecture):
   - *Pinned stage*: one fixed viewport, one scrubbed timeline, scenes swap in place. Use for hero → product → features → screenshots. Desktop only; give phones and reduced-motion users a stacked layout.
   - *Stacked sections*: normal flow with per-section reveals. Use for everything after the stage.
4. **Build the static page first.** Content, copy, layout and SEO must be complete and readable with no JavaScript. Motion is added on top and removable.
5. **Add motion in layers**, in this order: scroll smoothing (Lenis) → hero intro → scrubbed scenes → SVG drawing → pointer effects (cursor, magnetic, tilt) → ambient loops. Stop adding when each act has exactly one memorable move.
6. **Verify with the QA list** in performance-and-qa (force frames, light and dark, mobile fallback, reduced motion, console clean).

## Rules that prevent "AI slop"

- **No uniform entrance.** Do not apply the same fade-up to every section. Each reveal should fit what it reveals: a mask rise for headlines, a stroke draw for line art, a count for numbers, a crossfade for screenshots.
- **No decorative gradients, glass blur, or glow as the visual idea.** Use scale, mask, clip-path, stroke, and typographic scale. Blur and backdrop-filter over animating content is also a performance bug.
- **Show the real product.** Use real screenshots in a frame, not mock cards. If you must invent copy or numbers, label them as placeholders in your report; never invent metrics, testimonials, or ratings.
- **Copy is part of the design.** Plain words, specific nouns, no em dashes, no buzzwords, no rhythm of "statement, then punchy negation". Headlines state what the product does.
- **One accent move per fold.** Pick the single thing the eye should follow in each act.
- **Honest motion.** Do not animate things to imply a state that is not true (for example, an idle waveform that suggests audio is playing). Drive such elements from the pointer or scroll velocity instead.
- **Typography carries scale.** Display text up to about 6rem, tight but not touching (letter-spacing ≥ -0.04em), balanced wrapping. Thai and other complex scripts: never split by character; reveal by line (mask) or word.
- **No tiny uppercase kicker above every section, no numbered section scaffolding.** Use numbers only for a real sequence.

## Non-negotiables for smoothness

- Animate only `transform` and `opacity` (plus `clip-path`, `filter` on small layers when worth it). Never animate layout properties.
- One scrubbed master timeline per pinned scene; `scrub: true` when Lenis already smooths.
- Pause ambient loops off-screen; skip per-frame work when nothing changed; use `gsap.quickTo` for pointer followers; never create a tween per pointer event.
- `will-change: transform` only on the few big layers that move, never on everything.
- Reduced motion is a different layout, not a slower animation.

## Hydration safety (React islands)

Never let GSAP write styles onto DOM that React will hydrate later; it causes hydration mismatches. Animate Astro/HTML wrappers, or flip an attribute on a non-React wrapper and let CSS do the work (pattern in scroll-architecture). Inside islands, only animate after hydration or use CSS.

## When using Magic UI

Magic UI components are shadcn-registry source files you own. Add them with the registry, then adapt them to the project's tokens (radius, colors) before use. They run on the `motion` package, so they coexist with GSAP as long as the two libraries never animate the same element. Details and a component map are in [reference/magicui.md](reference/magicui.md).

## Report back

When you finish, state: the scene list, which parts are real vs placeholder copy, what you could and could not verify (for example, frame rate cannot be measured in a hidden browser pane), and any new dependencies.
