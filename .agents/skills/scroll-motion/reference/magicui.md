# Magic UI in real projects

Magic UI components are **source files copied into your repo** from a shadcn-style registry. You own and edit them. They are built on the `motion` package (`motion/react`) and Tailwind.

## Install

Registry entry in `components.json`:

```json
{ "registries": { "@magicui": "https://magicui.design/r/{name}" } }
```

```bash
npx shadcn@latest add @magicui/marquee @magicui/scroll-based-velocity @magicui/text-reveal @magicui/number-ticker @magicui/border-beam
# or: bunx --bun shadcn@latest add ...
```

This also installs `motion`. If a component brings CSS keyframes (marquee, border-beam, shimmer, ripple, etc.), they are added to the global CSS `@theme inline { --animate-*; @keyframes ... }` block. Check that they landed, or the component renders static.

## Component map (what to reach for)

| Need | Component | Notes |
|---|---|---|
| Endless text or logo band that reacts to scroll speed | `scroll-based-velocity` (`ScrollVelocityContainer`, `ScrollVelocityRow`) | Large display type works well. Alternate solid and muted words. Mark `aria-hidden` if decorative. |
| Passive logo/pill strip | `marquee` | CSS-driven (cheap). `pauseOnHover`, `reverse`, `--duration`, `--gap`. |
| Paragraph that lights up word by word on scroll | `text-reveal` | Splits by spaces. Thai/CJK have few spaces: insert spaces between phrases or use a custom line split. Inner `max-w-*` is hard-coded; match your container. It uses raw black/white classes; swap to tokens. |
| Counting numbers | `number-ticker` | Fine for real figures only. Do not fabricate metrics. |
| Animated border on a framed screenshot | `border-beam` | `colorFrom/colorTo` accept CSS vars. Needs a `relative` parent with a radius (`rounded-[inherit]`). |
| Primary CTA with motion | `interactive-hover-button`, `shimmer-button`, `pulsating-button`, `ripple-button` | Check radius and colors against the design system. |
| Theme switch with view-transition reveal | `animated-theme-toggler` | Writes `localStorage.theme` and toggles `.dark`; add an early inline script to restore it before paint. |
| Reading progress | `scroll-progress` | Default uses a gradient; replace with a solid token color. |
| Reveal on mount | `blur-fade` | Fine for isolated elements; do not apply to every section. |
| Device frames | `safari`, `android`, `iphone` | Good for mockups when you have real screenshots. |
| Patterns, particles, globe, orbiting circles | various | Use only when the brand calls for them; they are the first things to look generic. |

## Adapting to your design system (do this right after adding)

1. **Radius**: replace `rounded-*` in the copied files with the project's radius utilities (for example `squircle-*`). Skip circles (`rounded-full` on dots, avatars). For components that inherit radius (`rounded-[inherit]`) or compute it (`rounded-(--var)`), add a global rule so the curve style follows: `[class*="rounded-[inherit]"], [class*="rounded-(--"] { corner-shape: squircle; }`.
2. **Colors**: replace raw `black/white/gray-*` and default gradients with semantic tokens (`foreground`, `muted-foreground`, `line`, `surface`).
3. **Dark mode**: components assume a `.dark` class; make sure your toggler sets it.
4. **`cn`**: components import `cn` from `@/lib/utils`; keep that alias working.

## Using them with Astro / SSR

- Components are React. Give them a client directive: `client:visible` for below-the-fold, `client:idle` for chrome, `client:load` only when needed immediately.
- Do not apply GSAP styles to elements inside an island before it hydrates (mismatch). Wrap the island in an Astro `div` and animate/flag the wrapper.
- `motion`'s `useScroll` reads real scroll, so it follows Lenis automatically.

## Coexisting with GSAP

- Never let GSAP and `motion` animate the same element or property.
- Use Magic UI for self-contained widgets (marquee, ticker, beam, text-reveal) and GSAP for page choreography (pins, timelines, SVG drawing).
- `ScrollVelocityRow`, `BorderBeam` and similar run their own animation loops; they pause when off-screen where implemented. Prefer `client:visible` so they mount late.

## Typical shopping list for a "premium landing page"

`scroll-based-velocity` (big marquee), `text-reveal` (manifesto), `number-ticker` (real facts), `border-beam` (hero window), `interactive-hover-button` (primary CTA), `animated-theme-toggler`. Everything else comes from GSAP and custom SVG.
