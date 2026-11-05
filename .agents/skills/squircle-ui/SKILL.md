---
name: squircle-ui
description: Use when adding or changing visible UI in this Astro website. Follow semantic zinc color tokens, squircle-* radii, and avoid gradients or raw colors.
---

# squircle-ui

Use these rules for every visible UI change in this project. They adapt the LunoRX house skill to Astro 7, Tailwind CSS v4, shadcn/ui `base-nova` with Base UI, and Bun.

## Project facts

- Global tokens and utilities: `src/styles/global.css`.
- Components: `src/components/`; shadcn components go in `src/components/ui/`.
- Alias: `@/*` maps to `src/*`.
- Class helper: `cn()` from `@/lib/utils` (re-exported from the official `cn` package).
- Package manager: Bun. React components are rendered as Astro islands only when they need client-side interaction.
- shadcn uses Base UI (`base`) and zinc tokens; Magic UI components can be added through the shadcn registry.

## Color — semantic tokens only

| Role | Class |
|---|---|
| Page background | `bg-canvas` |
| Cards, bands, chips | `bg-surface`, `bg-surface-2` |
| Borders | `border-line` |
| Primary action | `bg-emphasis text-emphasis-foreground` |
| Text | `text-foreground`, `text-muted-foreground`, `text-destructive` |

Avoid raw colors (`#fff`, `bg-zinc-900`, `text-white`, `bg-black/50`) and gradients (`bg-linear-*`, `from-*`, `linear-gradient()`). Keep the palette light: white, canvas, and zinc tones; do not use pure black surfaces. Keep emphasis to one primary action per section.

## Radius — `squircle-*` instead of `rounded-*`

- Chips and badges: `squircle-xl`
- Inputs and buttons: `squircle-2xl`
- Cards: `squircle-3xl`
- Large panels: `squircle-panel` or `squircle-[32px]`–`[36px]`

The utilities in `src/styles/global.css` provide a border-radius fallback and native `corner-shape: squircle` enhancement. Use the existing scale; do not redefine Tailwind's radius tokens to implement squircles.

## Layout and accessibility

- Wide grid/flex children need `min-w-0`; use explicit `grid-cols-1` for responsive layouts.
- Keep keyboard focus visible, preserve semantic HTML and labels, and honor reduced-motion preferences.
- Prefer Astro markup and CSS for static UI. Use a React island only for client-side interaction.
- Avoid introducing new abstractions or UI packages when the existing tokens and shadcn setup cover the need.

## After editing UI

1. `bun run typecheck`
2. `bun run build`
3. Inspect changed UI at narrow and wide viewports when a dev preview is available.

Read `references/details.md` only for nested radii, browser support, or future `SquircleSurface`/clip-path work.
