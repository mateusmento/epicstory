# Design system Storybook conventions

> Can we preview tokens and primitives in Storybook—and see light/dark palettes flip without touching app wiring?

Parent task: `.product/tasks/09-design-tokens-ds-primitives.md`  
Presentational wiring (separate track): `presentationals/stories/WIRING.md`

## Conventions

| Item | Rule |
| ---- | ---- |
| Story files | `design-system/stories/**/*.stories.tsx` — **not** colocated with `.vue` |
| Sidebar — primitives | `Design System/<Component>` (e.g. `Design System/Button`) |
| Sidebar — tokens | `Design System/Tokens/<Name>` (e.g. `Colors`, `Typography`, `Spacing`) |
| Theme | Global **Theme** toolbar in Storybook; toggles `dark` class on `document.documentElement` |
| Regression | After token or primitive changes, spot-check `Product/Hero/*` slices in both themes |

## Folder layout (target)

```
design-system/
  ui/                         # Vue primitives (no *.stories.* here long-term)
  stories/
    README.md                 # this file
    tokens/                   # token reference stories (Phase 2)
    button/
      Button.stories.tsx
    input/
      Input.stories.tsx
```

Colocated stories under `ui/*/` (legacy) migrate **when touched** in Phase 3 — not in bulk.

## Theme toolbar

Configured in `app/.storybook/preview.ts`:

- Toolbar global `theme`: `light` (default) or `dark`
- Decorator applies `document.documentElement.classList.toggle("dark", …)`
- Tokens live in `design-system/styles/main.css` (`:root` + `.dark`); Tailwind uses `darkMode: ["class"]`

Stories inherit the current theme — no per-story theme prop unless documenting an exception.

## Story authoring

- Use **variants** for primitive states (default, disabled, destructive, open/closed) — not one story per sub-part file (`DialogHeader.vue`, etc.).
- Primitives consume semantic Tailwind utilities / CSS vars only; avoid ad-hoc hex in stories.
- `Tooltip` stories rely on `TooltipProvider` in preview; `Dialog` / confirm patterns rely on `ConfirmDialogProvider`.
- After changing tokens or a Tier A primitive, re-check at least two hero slices (e.g. `Product/Hero/AuthSignup`, `Product/Hero/IssueHeader`).

## References

- Tokens: `design-system/styles/main.css`, `tailwind.config.ts`, `component-colors.ts`
- Redesign reference UI: `views/demo/ConnectIntegrationDemo.vue`
- Hero regression slices: `presentationals/stories/hero/README.md`
