# 09 — Design tokens & design system primitives

**Status:** Not started  
**Depends on:** [08 — UI redesign foundation](./08-ui-redesign-foundation.md) (Storybook infra, hero slices, presentational layer)  
**Session question:** Can we change Epicstory’s visual language by editing tokens and primitives in Storybook—and see the impact on real product surfaces before touching container wiring?

---

## Why this task (now)

Task 08 established **where** redesign work happens (presentationals + design system) and **how** to preview it (Storybook + hero slices). The next lever is **what you actually change**: colors, type, spacing, radius, and the primitive components everything composes from.

Today:

| Asset | Location | Notes |
| ----- | -------- | ----- |
| Semantic CSS variables (light + `.dark`) | `app/src/design-system/styles/main.css` | shadcn-style HSL tokens (`--background`, `--primary`, …) |
| Tailwind mapping | `app/tailwind.config.ts` | Colors → `hsl(var(--*))`; custom `spacing.*`, `fontFamily` |
| Semantic color aliases | `app/component-colors.ts` | `mention`, `button`, `dropdown`, … |
| Legacy SCSS variables | `app/design-system/styles/variables.scss` | `$blue`, `$md`, … **overlaps / conflicts** with Tailwind |
| DS Vue primitives | `app/src/design-system/ui/` | ~175 files; **6 Storybook stories** today |
| Hero regression slices | `app/src/presentationals/stories/hero/` | 9 compositions under `Product/Hero/*` |

**Goal:** one canonical token layer + storied core primitives + light/dark preview—so redesign is iterative in Storybook and validated on hero slices before app rollout.

---

## Prerequisites

### Already satisfied (from task 08)

- [x] Presentational / container / view layer split
- [x] Storybook wiring conventions (`WIRING.md`, fixtures, harnesses)
- [x] Global preview providers (`TooltipProvider`, `ConfirmDialogProvider`)
- [x] Docs scroll fix (`app/.storybook/preview.css` overrides app `overflow: hidden`)
- [x] 9 hero slice stories for visual regression (`Product/Hero/*`)

### Hard gates (complete before changing token values)

- [ ] **Storybook theme toolbar** — toggle `light` / `dark` (class on `html` or `body`) so both `:root` and `.dark` palettes are previewable
- [ ] **Token source-of-truth decision** — document and enforce: **CSS custom properties in `main.css`** (+ `component-colors.ts` for Tailwind aliases) are canonical; new redesign tokens do not go into `variables.scss`
- [ ] **Storybook “green” spot-check** — hero slices + a sample of presentational docs pages render without provider errors; docs scroll through multi-story pages (e.g. `InboxNotificationRow`)
- [ ] **DS Storybook conventions** — agree folder + sidebar naming (see below)

### Soft gates (decide during exploration; block shipping merged token changes)

- [ ] **Brand direction** — neutral dev-tool vs warmer collab; overall density (compact vs airy)
- [ ] **Semantic color model** — what `primary` means (today near-black; legacy SCSS has brand `#3b37ff`)
- [ ] **Typography** — one UI font + one mono; resolve Tailwind `lato` / `dmSans` / `inter` / `jakartaSans` vs `body` font in `main.css`
- [ ] **Spacing scale** — one scale only (Tailwind `spacing.md` = `0.375rem` vs SCSS `$md` redefined twice)
- [ ] **Domain tokens** — `--mention`, `--code-block`, chart colors: stay in DS as “product primitives” or move to presentationals / `@/lib`?
- [ ] **Accessibility** — contrast targets for light + dark before locking palettes

---

## Token architecture (target state)

```
main.css (:root / .dark)     ← canonical semantic tokens
        ↓
component-colors.ts          ← Tailwind semantic aliases (mention, button, …)
        ↓
tailwind.config.ts           ← maps to utility classes (bg-background, text-muted-foreground, …)
        ↓
design-system/ui/*           ← primitives consume utilities / CSS vars only
        ↓
presentationals/*            ← product vocabulary; may use domain display tokens
```

**Legacy:** `variables.scss` — inventory usages, migrate to CSS vars or delete; no new tokens there.

**App shell caveat:** `main.css` sets `html, body { overflow: hidden; height: 100% }` for the SPA. Storybook overrides in `preview.css`; long-term optional split of “app shell” vs “design tokens” styles.

---

## Storybook conventions (this task)

| Item | Convention |
| ---- | ---------- |
| Story files | `app/src/design-system/stories/**/*.stories.tsx` (not colocated with `.vue`) |
| Token docs | `Design System/Tokens/<Name>` (e.g. `Colors`, `Typography`, `Spacing`) |
| Primitives | `Design System/<Component>` (e.g. `Design System/Button`) |
| Dark mode | Global toolbar decorator; stories show current theme |
| Regression | After token/primitive changes, spot-check `Product/Hero/*` slices |

Migrate existing colocated DS stories (`ui/button/Button.stories.tsx`, etc.) when touching them.

---

## Primitive inventory (Tier A — story required)

Story **variants**, not every sub-part file (e.g. no separate story per `DialogHeader.vue`).

| Primitive | Path | Priority | Notes |
| --------- | ---- | -------- | ----- |
| **Tokens** | `stories/tokens/` | P0 | Color, typography, spacing, radius, shadow |
| **Button** | `ui/button/Button.vue` | P0 | Resolve vs `LegacyButton`; deprecate one |
| **Input** | `ui/input/` | P0 | No story today |
| **Label** | `ui/label/` | P0 | |
| **Badge** | `ui/badge/` | P1 | |
| **Checkbox** | `ui/checkbox/` | P1 | |
| **Switch** | `ui/switch/` | P1 | |
| **Separator** | `ui/separator/` | P2 | |
| **Tooltip** | `ui/tooltip/` | P1 | Provider in preview; story shows trigger + content |
| **Dialog** | `ui/dialog/` | P1 | Open/closed variants |
| **Menu** | `ui/menu/` | P1 | Extend existing story; dropdown + context |
| **Popover** | `ui/popover/` | P1 | |
| **Select** | `ui/select/` | P2 | |
| **Tabs** | `ui/tabs/` | P2 | |
| **Form** | `ui/form/` | P2 | Extend existing story |

**Tier B (defer):** calendar grid cells, breadcrumb ellipsis, range-calendar internals, meeting icons — cover via parent primitive or hero slices only.

---

## Task items

### Phase 0 — Storybook readiness (~1 session)

- [ ] Add **light/dark theme toggle** to `.storybook/preview.ts` (toolbar global or decorator on `document.documentElement`)
- [ ] Document token conventions in `app/src/design-system/stories/README.md` (or extend `WIRING.md` with a DS section)
- [ ] Verify docs scroll + providers on 2–3 high-variant docs pages (`InboxNotificationRow`, `IssueAttachmentsStrip`, one hero slice)
- [ ] Optional: run `app/scripts/scan-storybook-context.mjs` against local Storybook; fix remaining context errors

### Phase 1 — Token audit & canonicalization (~1–2 sessions)

- [ ] Inventory **all token sources**: `main.css`, `tailwind.config.ts`, `component-colors.ts`, `variables.scss`
- [ ] Produce **token reference table** (name → CSS var → Tailwind class → used in) as Storybook `Design System/Tokens/Colors` (and siblings)
- [ ] List **conflicts** (spacing scale, font families, `primary` vs legacy `$blue`)
- [ ] Decision log in this file (Open questions → Decision sections): canonical font, spacing scale, `primary` semantics
- [ ] Mark `variables.scss` tokens as **legacy**; grep usages and plan migration list (no mass migration in this phase unless trivial)

### Phase 2 — Token stories (~1 session)

- [ ] `Design System/Tokens/Colors` — swatches for light + dark (`:root` / `.dark`)
- [ ] `Design System/Tokens/Typography` — font families, sizes, weights used in app
- [ ] `Design System/Tokens/Spacing` — Tailwind spacing scale + any layout tokens
- [ ] `Design System/Tokens/Radius` — `--radius` + border-radius utilities
- [ ] `Design System/Tokens/Elevation` — shadows (add tokens if missing; document current ad-hoc shadows)

### Phase 3 — Core primitive stories (~2–3 sessions)

- [ ] **Button** — variants `default` (neutral), `brand` (demo blue CTA), `outline` (demo cancel); see **Button variants** section; migrate 5 legacy call sites; remove `legacy` API
- [ ] ~~**LegacyButton**~~ — **removed** after Button migration (do not extend)
- [ ] **Input** — default, disabled, invalid, with label
- [ ] **Label** — standalone + `for` association example
- [ ] **Badge** — variants
- [ ] **Dialog** — trigger, open, destructive confirm pattern (aligns with `ConfirmDialog` presentational)
- [ ] **Menu** — migrate/extend existing story to `design-system/stories/`
- [ ] **Tooltip** — hover/focus preview
- [ ] **Form** — migrate existing story; field error states

### Phase 4 — Validate on hero slices (~1 session)

- [ ] After first token or Button/Input change in Storybook, review all **`Product/Hero/*`** slices in light + dark
- [ ] Note breakpoints where tokens break (overflow, contrast, density); feed back into token decisions
- [ ] Record “hero slice checklist” in `presentationals/stories/hero/README.md`

### Phase 5 — First token experiment (optional, same or follow-up session)

- [ ] Change **one semantic token** (e.g. `--primary` or `--radius`) in `main.css` only
- [ ] Confirm primitives + hero slices update without presentationals code changes
- [ ] If successful, this validates the architecture for full redesign passes

---

## Open questions

| Question | Options | Decision |
| -------- | ------- | -------- |
| Canonical UI font? | Inter only / DM Sans for UI / dual | _TBD_ |
| `primary` color role? | **Neutral emphasis only** — keep `--primary` near-black for `default` variant; add `--brand-*` tokens for blue CTA | **Decided** (see Button section) |
| Domain tokens in DS? | Keep `--mention`, `--code-block` in DS / move to presentationals | _TBD_ |
| Deprecate `LegacyButton`? | **Remove** — merge styles into `Button` variants; delete `legacy` prop + scoped SCSS + `LegacyButton.stories.tsx` | **Decided** |
| SCSS `variables.scss`? | Delete after migration / keep for patterns only | _TBD_ |
| Button CTA variant name? | `brand` (recommended) / `accent` / `cta` | **Decided: `brand`** |

---

## Button variants — naming, visuals, migration

### Problem (today)

Two parallel button systems live in one component ([`Button.vue`](app/src/design-system/ui/button/Button.vue)):

| Mode | API | Primary action look |
| ---- | --- | ------------------- |
| **Modern (cva)** | `variant="default"` | Black / `--primary` (shadcn) |
| **Legacy (scoped SCSS)** | `legacy` + `legacy-variant` | `primary` = flat blue; `invitational` = flat blue + inset ring; `default` = white gray border |

Legacy names (`invitational`, `primary`) describe **color or marketing intent**, not **UI role**. The blue styling is also **worse** than the reference in [`ConnectIntegrationDemo.vue`](app/src/views/demo/ConnectIntegrationDemo.vue).

### Naming principle

Variant names describe **role**, not hue — so black and blue can both be “primary actions” without renaming when brand color changes.

| Variant | Role | When to use |
| ------- | ---- | ----------- |
| **`default`** | **Neutral primary** — main action in app chrome (toolbars, forms, dialogs) | Save, Submit, Create issue, Send |
| **`brand`** | **Brand primary** — forward / conversion / onboarding CTA | Sign up, Sign in, Accept invite, Next step, Connect |
| **`outline`** | **Secondary** — dismiss, cancel, low-commitment alternate | Cancel, Back, optional paths |

Existing shadcn variants (`destructive`, `secondary`, `ghost`, `link`) stay unchanged.

**Deprecate and remove:** `legacy` prop, `legacyVariant`, `legacySize`, `ButtonVariant` type (`default` \| `primary` \| `invitational`), scoped `.button--*` styles, [`LegacyButton.stories.tsx`](app/src/design-system/ui/button/LegacyButton.stories.tsx).

### Visual spec (source of truth: ConnectIntegrationDemo)

Implement in **`buttonVariants` (cva) using Tailwind utilities** — no scoped CSS in `Button.vue`. Values that Tailwind cannot express cleanly get **named utilities in `tailwind.config.ts`** (not raw CSS in components).

See **Tailwind audit (ConnectIntegrationDemo)** below.

**`outline`** ← `.connect-demo__btn--cancel`

**`brand`** ← `.connect-demo__btn--next`

**`default`** — keep current `bg-primary text-primary-foreground shadow hover:bg-primary/90` (shadcn). No demo change unless redesign updates `--primary`.

### Tailwind-first implementation (Button)

**Layer 1 — `main.css`:** semantic HSL vars only (`--brand`, `--brand-border`, gradient stop vars if needed for dark mode).

**Layer 2 — `tailwind.config.ts` `theme.extend`:**

```ts
colors: {
  brand: {
    DEFAULT: "hsl(var(--brand) / <alpha-value>)",
    border: "hsl(var(--brand-border) / <alpha-value>)",
    // optional: from, via, to for gradients
  },
},
backgroundImage: {
  "brand-gradient": "linear-gradient(180deg, hsl(var(--brand-from)) 0%, hsl(var(--brand-via)) 52%, hsl(var(--brand-to)) 100%)",
  "brand-gradient-hover": "…",
  "brand-gradient-active": "…",
},
boxShadow: {
  "btn-outline": "0 1px 2px rgb(15 23 42 / 0.05), 0 2px 6px rgb(15 23 42 / 0.06)",
  "btn-outline-hover": "0 1px 2px rgb(15 23 42 / 0.06), 0 3px 8px rgb(15 23 42 / 0.08)",
  "btn-brand": "inset 0 0 1px 1px rgb(255 255 255 / 0.5), 0 1px 0 rgb(63 62 200 / 0.22), 0 2px 4px rgb(58 57 180 / 0.4)",
  "btn-brand-hover": "…",
  "btn-brand-active": "…",
},
```

**Layer 3 — `buttonVariants` (cva):**

```ts
brand: [
  "rounded-xl border border-brand-border bg-brand-gradient text-white font-semibold tracking-[-0.01em]",
  "shadow-btn-brand hover:bg-brand-gradient-hover hover:shadow-btn-brand-hover",
  "active:bg-brand-gradient-active active:shadow-btn-brand-active",
].join(" "),
outline: [
  "border border-gray-200 bg-white text-gray-700 shadow-btn-outline",
  "hover:bg-neutral-50 hover:shadow-btn-outline-hover active:shadow-btn-outline",
].join(" "),
```

No `<style scoped>` in `Button.vue` after migration.

### Tailwind audit — ConnectIntegrationDemo

Audit of [`ConnectIntegrationDemo.vue`](app/src/views/demo/ConnectIntegrationDemo.vue) scoped SCSS vs Tailwind v3 (project config). Legend: **OK** = stock utility · **arb** = arbitrary value `[…]` · **extend** = add to `tailwind.config.ts` · **CSS** = keep in `@layer` / demo-only (not for Button primitive).

#### Buttons (in scope for `Button.vue`)

| Demo rule | Value | Tailwind approach |
| --------- | ----- | ----------------- |
| Cancel height | `2.5rem` | **OK** `h-10` |
| Cancel radius | `0.5rem` | **OK** `rounded-lg` |
| Cancel border/bg/text | `#e5e7eb`, `#fff`, `#374151` | **OK** `border-gray-200 bg-white text-gray-700` |
| Cancel shadow (default/hover/active) | 2-layer rgba stacks | **extend** `shadow-btn-outline`, `shadow-btn-outline-hover` — no single stock shadow matches |
| Next radius | `0.75rem` | **OK** `rounded-xl` |
| Next border | `#3f3ec8` | **extend** `border-brand-border` (or **arb** `border-[#3f3ec8]`) |
| Next font | `600`, `-0.01em` tracking | **OK** `font-semibold` · **arb** `tracking-[-0.01em]` |
| Next gradient | `180deg`, stops at **52%** | **extend** `bg-brand-gradient` — `from/via/to` alone awkward at 52%; named `backgroundImage` is cleaner |
| Next hover/active gradients | different stop colors | **extend** `bg-brand-gradient-hover`, `bg-brand-gradient-active` |
| Next shadow (default/hover/active) | **inset + 2 outer** layers | **extend** `shadow-btn-brand*` — Tailwind has no inset shadow utilities; must be custom boxShadow entries |
| Shared transition | `background, box-shadow` | **OK** `transition-colors` + `transition-shadow` or `transition-[background,box-shadow]` **arb** |

**Button verdict:** Everything is achievable in Tailwind via **theme extensions**; nothing requires scoped CSS in `Button.vue`. Avoid long arbitrary `shadow-[…]` / `bg-[linear-gradient(…)]` in cva — put them in config once.

#### Page chrome (demo-only — do not block Button work)

| Demo rule | Value | Tailwind approach |
| --------- | ----- | ----------------- |
| Page background | **4 stacked** `radial-gradient(ellipse … at x y, …)` | **CSS** — no Tailwind primitive for multi radial stack. Options: `@layer components { .bg-connect-demo { … } }` or one **arb** `bg-[radial-gradient(...),…]` (unmaintainable). **Defer** unless demo page is converted. |
| Grid overlay | `linear-gradient` grid + **`mask-image: radial-gradient(ellipse …)`** | **CSS** — `mask-image` with elliptical fade not in default Tailwind; plugin or component class |
| Card width | `min(100%, 32rem)` | **OK** `w-full max-w-lg` |
| Card radius | `1.35rem` | **arb** `rounded-[1.35rem]` or **extend** `borderRadius.card-lg` |
| Card shadow | 2-layer | **extend** `shadow-card` or **arb** |
| Card border | `rgba(0,0,0,0.08)` | **OK** `border-black/8` |
| Header gap | `1.35rem` | **arb** `gap-[1.35rem]` |
| Link badge margin | `-0.45rem` horizontal | **arb** `-mx-[0.45rem]` |
| Title line-height | `1.35` | **arb** `leading-[1.35]` |
| Label/input text | `0.8125rem` (13px) | **arb** `text-[0.8125rem]` — not on default type scale |
| Disclaimer text | `0.6875rem` (11px) | **arb** `text-[11px]` |
| Disclaimer line-height | `1.55`, `1.45` | **arb** `leading-[1.55]` |
| Footer frosted glass | `rgba(255,255,255,0.38)` + **`blur(14px)`** | **arb** `bg-white/40 backdrop-blur-[14px]` — between `backdrop-blur-md` (12px) and `lg` (16px) |
| Tradier tile gradient | `#5b8ba2` → `#4a768d` | **OK** `bg-gradient-to-b from-[#5b8ba2] to-[#4a768d]` or token |
| Public icon radius | `0.45rem` | **arb** `rounded-[0.45rem]` |
| Divider margins | `1.35rem`, `1.15rem` | **arb** |

**Page verdict:** Layout/typography mostly **OK + arbitrary**. **Multi-layer radial backgrounds** and **mask-image grid fade** are the two features Tailwind does not support well — keep as a small component class if the demo page is ever migrated off SCSS.

#### Values not in project theme today (add for redesign)

| Demo hex / rgba | Closest stock | Recommendation |
| --------------- | ------------- | -------------- |
| `#3f3ec8`, `#5d5cff`, `#5453f2`, `#4a49e0` | indigo-600-ish | **`brand` palette** in config (from CSS vars) |
| `#6366f1` (link) | indigo-500 | **OK** `text-indigo-500` or semantic `text-brand` |
| `#0f172a`, `#64748b`, `#94a3b8`, `#e2e8f0` | slate-* | **OK** map to `slate-900/500/400/200` |
| `#f4f4f6` page base | gray-100 | **OK** `bg-[#f4f4f6]` or token `--background` tweak |

### Semantic tokens (decided direction)

| Token / utility | Purpose |
| --------------- | ------- |
| `--primary` | Neutral primary (HSL) → `variant="default"` via `bg-primary` |
| `--brand`, `--brand-border`, `--brand-from/via/to` | HSL vars in `main.css` → Tailwind `brand`, `bg-brand-gradient`, `shadow-btn-brand*` |
| `--btn-outline-*` (optional) | Only if outline shadows need dark-mode-specific values |

Do **not** overload `--primary` to mean blue. Implement brand through **`theme.extend`**, not ad-hoc CSS in `Button.vue`.

### Migration inventory (`legacy` → modern)

| File | Current | Target |
| ---- | ------- | ------ |
| [`SignupForm.vue`](app/src/presentationals/auth/SignupForm.vue) | `legacy` + `invitational` | `variant="brand"` `size="lg"` (or `class="w-full"`) |
| [`SigninForm.vue`](app/src/presentationals/auth/SigninForm.vue) | `legacy` + `invitational` | `variant="brand"` |
| [`SelectWorkspace.vue`](app/src/views/workspace/SelectWorkspace.vue) | `legacy` + `invitational` | `variant="brand"` |
| [`MemberInvite.vue`](app/src/views/workspace/MemberInvite.vue) | `legacy` + `primary` + `lg` | `variant="brand"` `size="lg"` |
| [`MessagesTab.vue`](app/src/containers/app-pane/channels/tabs/MessagesTab.vue) | `legacy` + `primary` + `sm` | `variant="brand"` `size="sm"` |

After migration: remove legacy code path from `Button.vue`; update [`Button.stories.tsx`](app/src/design-system/ui/button/Button.stories.tsx) with `Default`, `Brand`, `Outline` (demo-aligned), `Destructive`, `Ghost`; delete `LegacyButton.stories.tsx`.

Validate on hero slices: **`AuthSignup`**, **`AuthSignin`**, and any slice using primary CTAs.

### Phase 3 addendum — Button (do before other primitives)

- [ ] Add `--brand-*` HSL vars to `main.css` (light; dark TBD)
- [ ] Extend `tailwind.config.ts`: `colors.brand`, `backgroundImage` (`brand-gradient*`), `boxShadow` (`btn-brand*`, `btn-outline*`)
- [ ] Implement `variant="brand"` and refreshed `outline` in `buttonVariants` (cva) — **Tailwind classes only**, no scoped CSS in `Button.vue`
- [ ] Storybook: `Design System/Button` — Default, Brand, Outline, sizes, disabled
- [ ] Migrate 5 call sites (table above)
- [ ] Remove `legacy` API + scoped styles from `Button.vue`
- [ ] Delete `LegacyButton.stories.tsx`
- [ ] Re-check `Product/Hero/AuthSignup` and `AuthSignin` in light + dark

---

## Explicitly defer

- Storing every DS sub-component (~175 `.vue` files) as its own story
- Full presentational story catalog (continues in parallel; not blocking token work)
- Container/view Storybook track (`Application/Containers/`, `Application/Views/`)
- Migrating all SCSS `$` usages to CSS vars (separate cleanup task after audit)
- Shipping redesigned UI to production app (follow-up: redesign presentationals against hero slices)
- Figma / external design tool sync

---

## Done when

- [ ] Light/dark theme toggle works in Storybook for all DS and hero stories
- [ ] Token source of truth documented; no new tokens added to `variables.scss`
- [ ] Token stories exist: Colors, Typography, Spacing, Radius (Elevation if applicable)
- [ ] Tier A primitives storied: Button (with `brand` + demo-aligned `outline`), Input, Label, Badge, Dialog, Menu, Tooltip, Form (minimum)
- [ ] Legacy button API removed; 5 call sites migrated to `variant="brand"`
- [ ] Hero slices (`Product/Hero/*`) reviewed in both themes after at least one token change
- [ ] Task 08 “Design system primitives storied with token-aware variants” can be checked off

---

## References

- Parent: [08 — UI redesign foundation](./08-ui-redesign-foundation.md)
- Architecture: `.cursor/rules/frontend-atomic-architecture.mdc`
- Hero slices: `app/src/presentationals/stories/hero/README.md`
- Tokens today: `app/src/design-system/styles/main.css`, `app/tailwind.config.ts`, `app/component-colors.ts`
- Legacy SCSS: `app/src/design-system/styles/variables.scss`
- Button reference UI: `app/src/views/demo/ConnectIntegrationDemo.vue` (`.connect-demo__btn--next`, `--cancel`)
- Legacy button usages: `SignupForm`, `SigninForm`, `SelectWorkspace`, `MemberInvite`, `MessagesTab`
- Storybook preview: `app/.storybook/preview.ts`, `app/.storybook/preview.css`
