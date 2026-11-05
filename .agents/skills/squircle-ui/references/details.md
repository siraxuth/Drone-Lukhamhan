# squircle-ui — details

Read this file only for nested radii, browser support, or future `SquircleSurface` / clip-path work. The current starter uses CSS-only `squircle-*` utilities and does not include a clip-path component.

## Nested radius rule

For a tight concentric inset (padding smaller than the outer radius), use inner radius = outer radius − padding so the curves remain parallel.

| Outer | Padding | Inner |
|---|---|---|
| `squircle-panel` (32px) | `p-2` (8px) | `squircle-3xl` (24px) |
| `squircle-3xl` (24px) | `p-4` (16px) | `squircle-sm` (8px) |

This does not apply to a card inside a generously padded band; that card keeps its own scale radius.

## CSS layers

The utilities in `src/styles/global.css` provide:

1. A `border-radius` fallback for browsers without native squircle support.
2. `corner-shape: squircle` where supported.

Do not introduce a clip-path polyfill for ordinary controls. Clip paths can cut off borders, shadows, and focus rings; if a large static surface later needs one, keep border/shadow/focus treatment on separate inner or outer elements and ensure the fallback renders correctly during SSR.

## Examples

```html
<button class="squircle-2xl bg-emphasis px-4 py-2 text-sm font-medium text-emphasis-foreground">Save</button>
<div class="squircle-3xl border border-line bg-surface p-5">Card</div>
<section class="squircle-panel bg-surface-2 p-6">Section</section>
```

Avoid gradients, raw colors, off-scale radii, competing emphasis buttons, and heavy shadows on clipped surfaces.
