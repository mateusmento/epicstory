# 09 — Design tokens & design system primitives

**Status:** In progress (Phase 0–2 complete)  
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
| Legacy SCSS variables | `app/src/design-system/styles/variables.scss` | `$blue`, `$md`, … **overlaps / conflicts** with Tailwind |
| DS Vue primitives | `app/src/design-system/ui/` | ~175 files; **6 Storybook stories** today |
| Hero regression slices | `app/src/presentationals/stories/hero/` | 9 compositions under `Product/Hero/*` |
| **Redesign reference UI** | `app/src/views/demo/ConnectIntegrationDemo.vue` | Visual north star — tokens object + DS primitives + Tailwind layout |

**Goal:** one canonical token layer + storied core primitives + light/dark preview—so redesign is iterative in Storybook and validated on hero slices before app rollout.

**Visual north star:** [`ConnectIntegrationDemo.vue`](app/src/views/demo/ConnectIntegrationDemo.vue) is the redesign reference spec (same role Figma frames would play, but wired to real DS components). Extract tokens from it into `main.css` / `tailwind.config.ts`; do not copy the page wholesale into the app shell.

---

## Prerequisites

### Already satisfied (from task 08)

- [x] Presentational / container / view layer split
- [x] Storybook wiring conventions (`WIRING.md`, fixtures, harnesses)
- [x] Global preview providers (`TooltipProvider`, `ConfirmDialogProvider`)
- [x] Docs scroll fix (`app/.storybook/preview.css` overrides app `overflow: hidden`)
- [x] 9 hero slice stories for visual regression (`Product/Hero/*`)

### Hard gates (complete before changing token values)

- [x] **Storybook theme toolbar** — toggle `light` / `dark` (class on `document.documentElement`) so both `:root` and `.dark` palettes are previewable
- [x] **Token source-of-truth decision** — **CSS custom properties in `main.css`** (+ `component-colors.ts` for Tailwind aliases) are canonical; demo drives brand tokens; new redesign tokens do not go into `variables.scss` (see **Visual reference spec** and **Legacy SCSS audit**)
- [x] **Storybook “green” spot-check** — completed in [08](./08-ui-redesign-foundation.md); hero slices + presentational docs render without provider errors; docs scroll normally
- [x] **DS Storybook conventions** — documented in [`design-system/stories/README.md`](../../app/src/design-system/stories/README.md)

### Soft gates (decide during exploration; block shipping merged token changes)

- [x] **Brand direction** — **decided via demo:** warmer collab, slate text hierarchy, airy-but-compact form density (`h-10` controls, 13px labels). Page chrome (radial gradients, grid mask) is marketing/wizard — defer globally.
- [x] **Semantic color model** — **decided:** `--primary` stays neutral (black CTA); brand blue from demo (`#5d5cff` → `#4a49e0`) via `--brand-*` tokens. Demo wins over legacy SCSS `$blue` (`#3b37ff`).
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

## Visual reference spec — ConnectIntegrationDemo

**File:** [`app/src/views/demo/ConnectIntegrationDemo.vue`](app/src/views/demo/ConnectIntegrationDemo.vue)

The demo encodes the intended redesign. Structure to follow elsewhere:

| Layer | Demo pattern | Canonical home |
| ----- | ------------ | -------------- |
| Gradients / multi-layer shadows | `tokens` const + `v-bind` in scoped `.fx-*` classes | `main.css` HSL vars → `tailwind.config.ts` `backgroundImage` / `boxShadow` |
| Layout / typography / colors | `styles` object via `cn()` + Tailwind utilities | Primitives + presentationals use semantic utilities |
| Composition | DS `Input`, `Label`, `DotPattern` | `design-system/ui/*` + presentationals |

### Redesign principles (extract from demo)

1. **Density** — `h-10` controls, `text-[0.8125rem]` labels, tight field gaps (`gap-[0.4rem]`). Airy but not sparse.
2. **Hierarchy** — slate scale for text (`900` → `500` → `400`), not flat gray.
3. **Buttons** — brand = gradient + inset highlight + colored shadow; secondary = white + subtle elevation (not flat gray).
4. **Surfaces** — soft border (`rgba(0,0,0,0.08)` / `border-black/8`), large radius (`1.35rem`), layered shadow.
5. **Composition** — header illustration (DotPattern + brand tiles) is product vocabulary → presentationals, not global tokens.

### Token extraction tiers

#### Tier 1 — Promote to `main.css` + Tailwind (global semantic tokens)

| Demo value | Role | Token proposal |
| ---------- | ---- | -------------- |
| `#0f172a` | Headings | `--foreground` (light) |
| `#64748b` | Secondary text | `--muted-foreground` |
| `#334155` | Labels | `--accent-foreground` or new `--label` |
| `#94a3b8` | Placeholders | extend `--muted-foreground` or `--placeholder` |
| `#e2e8f0` | Borders | `--border`, `--input` |
| `#f8fafc` | Input prefix bg | `--muted` |
| `#f4f4f6` | Page base | `--background` |
| `#5d5cff` → `#4a49e0` | Brand CTA | `--brand`, `--brand-from/via/to` (HSL) |
| `#3f3ec8` | Brand border | `--brand-border` |
| `#6366f1` | Links | `--link` |
| `1.35rem` | Card radius | `--radius-card` or `borderRadius.card-lg` |
| `0.8125rem` (13px) | Form copy | typography token / `text-sm` extension |
| Card shadow | Elevated surfaces | `shadow-card` in Tailwind |

Convert recurring hex → **HSL in `main.css`** (keeps shadcn pattern). Demo `tokens` object stays as reference until globals exist, then slim to `v-bind` only where Tailwind cannot express the effect.

#### Tier 2 — Tailwind extensions only (fed by CSS vars where useful)

Named utilities in `tailwind.config.ts` — no component scoped CSS:

- `backgroundImage`: `brand-gradient`, `brand-gradient-hover`, `brand-gradient-active` (52% mid-stop)
- `boxShadow`: `btn-brand`, `btn-brand-hover`, `btn-brand-active`, `btn-outline`, `btn-outline-hover`, `btn-outline-active`, `card-elevated`
- `colors.brand`: `DEFAULT`, `border`

Used by Button `brand` / `outline` and eventually Card / Dialog.

#### Tier 3 — Surface-specific (not global `:root` yet)

Defer to layout patterns (`layout-shell`, wizard/auth shell):

- 4-layer radial page background (peach, blue, violet, orange)
- Grid overlay + elliptical `mask-image` fade
- Frosted footer (`backdrop-blur-[14px]`, `rgba(255,255,255,0.38)`)
- Tradier integration tile gradient — third-party brand, not Epicstory

### Rollout order (demo → product)

| Step | Demo source | Ship as |
| ---- | ----------- | ------- |
| 1 | `tokens.shadows.btnNext` / `btnCancel` + `styles.btnNext` / `btnCancel` | Button `brand` + `outline` via cva + Tailwind |
| 2 | `styles.input`, `styles.label`, `styles.urlGroup` | Input + Label primitive defaults |
| 3 | `tokens.shadows.card` + `styles.card` radius | Card / DialogContent defaults |
| 4 | Slate semantic colors (Tier 1 table) | Update `main.css` `:root` |
| 5 | Page chrome (Tier 3) | Auth shell / wizard layout pattern |
| 6 | Light-only demo values | Re-derive slate + brand for `.dark` |

### Regression targets

- [ ] `Design System/Button` — Cancel + Next pair side-by-side matching demo
- [ ] Optional hero slice: `Product/Hero/ConnectIntegration` (full demo composition)
- [ ] After token pass: `Product/Hero/AuthSignup`, `AuthSignin`

**Caveat:** Demo is **light-mode only** today. Dark palette must be derived before locking merged token changes.

---

## Legacy SCSS audit — `variables.scss` vs Tailwind

**File:** [`app/src/design-system/styles/variables.scss`](app/src/design-system/styles/variables.scss)

Both SCSS and Tailwind load (`main.scss` + `main.css` via `main.ts` / Storybook). Same names, different APIs — SCSS dominates usage today.

### Spacing scale (values align; APIs differ)

Active SCSS block (lines 10–20; **lines 1–8 are dead code** — delete) matches `tailwind.config.ts` `extend.spacing`:

| Token | SCSS | Tailwind | px @ 16px |
| ----- | ---- | -------- | --------- |
| `th` | `1px` | `0.0625rem` | 1 |
| `sm` | `2px` | `0.125rem` | 2 |
| `md` | `6px` | `0.375rem` | 6 |
| `lg` | `8px` | `0.5rem` | 8 |
| `xl` | `12px` | `0.75rem` | 12 |
| `2xl`–`7xl` | 16–80px | 1–5rem | 16–80 |
| `8xl` | — | `6rem` | 96 (Tailwind only) |

**Consumption:**

- SCSS generates `flex:row-md`, `flex:col-2xl`, `g-lg` (~80+ Vue files) via `flex.scss`, `grid.scss`, `sizing.scss`
- Tailwind `p-xl`, `gap-md`, etc. barely used (~4 files)

**Footguns:**

- Same px, different names: custom `p-2xl` (16px) vs Tailwind numeric `p-4`
- `.w-md` / `.w-xl` in `sizing.scss` are **layout widths** (460px / 1080px), not spacing tokens — clash with `max-w-md` mental model
- `borderRadius.sm` (4px) ≠ `spacing.sm` (2px)

### Colors (conflict area — demo supersedes legacy hex)

| Concept | SCSS / `:root` | Tailwind / `main.css` |
| ------- | -------------- | --------------------- |
| Body text | `$black` / `--black` `#2a2a2a` | `text-foreground` ~ `#27272a` |
| Brand blue | `$blue` `#3b37ff` | Not in theme; Button legacy uses `var(--blue)` |
| Muted border | `$grey-blue` `#dbd6e4` | `border-border` HSL |

**Bugs / cleanup:**

- `---dark-grey-blue` (triple dash) in `:root` — `var(--dark-grey-blue)` never resolves
- `base/` (reset using `$black`, `$blue`) commented out in `main.scss`; patterns still use `$blue` directly

**Decision:** Treat Tailwind `extend.spacing` + `main.css` HSL as canonical for new work. Migrate `flex:*` → `flex gap-*` over time. Brand colors from **demo**, not `$blue`.

---

## Storybook conventions (this task)

| Item | Convention |
| ---- | ---------- |
| Story files | `app/src/design-system/stories/**/*.stories.tsx` (not colocated with `.vue`) |
| Token docs | `Design System/Tokens/<Name>` (e.g. `Colors`, `Typography`, `Spacing`) |
| Primitives | `Design System/<Component>` (e.g. `Design System/Button`) |
| Dark mode | Global toolbar decorator in `.storybook/preview.ts`; stories inherit current theme |
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

- [x] Add **light/dark theme toggle** to `.storybook/preview.ts` (toolbar global + decorator on `document.documentElement`)
- [x] Document token conventions in [`design-system/stories/README.md`](../../app/src/design-system/stories/README.md)
- [x] Verify docs scroll + providers on high-variant docs pages — completed in [08](./08-ui-redesign-foundation.md)
- [x] Smoke-check hero + DS stories in both themes (`Product/Hero/AuthSignup`, `Product/Hero/IssueHeader`, `Design System/Button`)

### Phase 1 — Token audit & canonicalization (~1–2 sessions)

- [x] Inventory **all token sources**: `main.css`, `tailwind.config.ts`, `component-colors.ts`, `variables.scss` (see **Legacy SCSS audit** and **Token extraction tiers** above)
- [x] Produce **token reference table** (name → CSS var → Tailwind class → used in) as Storybook `Design System/Tokens/Colors` (and siblings); include demo → token mapping from Tier 1 table
- [x] List **conflicts** (spacing dual API, font families, `primary` vs legacy `$blue` vs demo brand) — documented above
- [ ] Decision log: canonical font, spacing migration plan (`flex:*` → Tailwind), dark-mode brand palette
- [ ] Mark `variables.scss` tokens as **legacy**; grep usages and plan migration list. Quick wins: delete dead lines 1–8; fix `---dark-grey-blue` → `--dark-grey-blue`

### Phase 2 — Token stories (~1 session)

- [x] `Design System/Tokens/Colors` — swatches for light + dark (`:root` / `.dark`)
- [x] `Design System/Tokens/Typography` — font families, sizes, weights used in app
- [x] `Design System/Tokens/Spacing` — Tailwind spacing scale + any layout tokens
- [x] `Design System/Tokens/Radius` — `--radius` + border-radius utilities
- [x] `Design System/Tokens/Elevation` — shadows (add tokens if missing; document current ad-hoc shadows)
- [x] `Design System/Tokens/DeferredPatterns` — Tier 3 surface patterns from demo inventory

### Phase 3 — Core primitive stories (~2–3 sessions)

- [ ] **Button** — variants `default` (neutral), `brand` (demo blue CTA), `outline` (demo cancel); see **Button variants** section; migrate 5 legacy call sites; remove `legacy` API
- [ ] ~~**LegacyButton**~~ — **removed** after Button migration (do not extend)
- [ ] **Input** — default, disabled, invalid, with label; align to demo (`h-10`, `rounded-lg`, slate borders/placeholders)
- [ ] **Label** — standalone + `for` association; align to demo (`text-[0.8125rem] font-semibold`)
- [ ] **Badge** — variants
- [ ] **Dialog** — trigger, open, destructive confirm pattern (aligns with `ConfirmDialog` presentational)
- [ ] **Menu** — migrate/extend existing story to `design-system/stories/`
- [ ] **Tooltip** — hover/focus preview
- [ ] **Form** — migrate existing story; field error states

### Phase 4 — Validate on hero slices (~1 session)

- [ ] After first token or Button/Input change in Storybook, review all **`Product/Hero/*`** slices in light + dark
- [ ] Optional: add **`Product/Hero/ConnectIntegration`** hero slice from demo for full-form regression
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
| Redesign visual reference? | Figma / ad-hoc / demo page | **Decided: `ConnectIntegrationDemo.vue`** — extract tokens; demo guides rollout order |
| Canonical UI font? | Inter only / DM Sans for UI / dual | _TBD_ |
| `primary` color role? | **Neutral emphasis only** — keep `--primary` near-black for `default` variant; add `--brand-*` tokens for blue CTA | **Decided** (see Button section) |
| Brand blue source? | Legacy `$blue` `#3b37ff` / demo `#5d5cff` | **Decided: demo palette** |
| Domain tokens in DS? | Keep `--mention`, `--code-block` in DS / move to presentationals | _TBD_ |
| Deprecate `LegacyButton`? | **Remove** — merge styles into `Button` variants; delete `legacy` prop + scoped SCSS + `LegacyButton.stories.tsx` | **Decided** |
| SCSS `variables.scss`? | Delete after migration / keep for patterns only | **Decided: legacy only** — no new tokens; migrate `flex:*` over time |
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

Demo maps to variants via `styles.btnCancel` + `tokens.shadows.btnCancel*` → **`outline`**; `styles.btnNext` + `tokens.gradients.btnNext*` + `tokens.shadows.btnNext*` → **`brand`**.

See **Tailwind audit (ConnectIntegrationDemo)** below.

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

**`default`** — keep current `bg-primary text-primary-foreground shadow hover:bg-primary/90` (shadcn). No demo change unless redesign updates `--primary`.

### Tailwind audit — ConnectIntegrationDemo

Audit of [`ConnectIntegrationDemo.vue`](app/src/views/demo/ConnectIntegrationDemo.vue): layout via `styles` + `cn()`; gradients/shadows via `tokens` const + scoped `.fx-*` classes with `v-bind`. Legend: **OK** = stock utility · **arb** = arbitrary value `[…]` · **extend** = add to `tailwind.config.ts` · **CSS** = keep in demo / layout pattern (not for Button primitive).

#### Demo `tokens` object (promote to config)

| Key | Purpose | Target |
| --- | ------- | ------ |
| `gradients.btnNext` / `btnNextHover` / `btnNextActive` | Brand CTA backgrounds | `backgroundImage.brand-gradient*` |
| `shadows.btnNext` / `btnNextHover` / `btnNextActive` | Brand CTA elevation | `boxShadow.btn-brand*` |
| `shadows.btnCancel` / `btnCancelHover` / `btnCancelActive` | Outline secondary | `boxShadow.btn-outline*` |
| `shadows.card` | Elevated card | `boxShadow.card-elevated` |
| `gradients.pageBackground` | Page chrome | **Tier 3** — defer |
| `gradients.gridImage` / `gridMask` | Grid overlay | **Tier 3** — defer |
| `gradients.brandTradier` | Third-party tile | **Tier 3** — defer |

#### Buttons (in scope for `Button.vue`)

| Demo rule | Value | Tailwind approach |
| --------- | ----- | ----------------- |
| Cancel (`styles.btnCancel`) | `border-[#e5e7eb] bg-white text-[#374151]` | **OK** `border-gray-200 bg-white text-gray-700` |
| Cancel height / radius (`styles.btn`) | `h-10`, `rounded-lg` | **OK** |
| Cancel shadow | `tokens.shadows.btnCancel*` | **extend** `shadow-btn-outline*` |
| Next (`styles.btnNext`) | `rounded-xl border-[#3f3ec8] font-semibold tracking-[-0.01em] text-white` | **OK** + **extend** `border-brand-border` |
| Next gradient | `tokens.gradients.btnNext*` (52% stop) | **extend** `bg-brand-gradient*` |
| Next shadow | `tokens.shadows.btnNext*` (inset + outer) | **extend** `shadow-btn-brand*` |
| Shared transition (`styles.btn`) | `transition-[background,box-shadow] duration-150` | **OK** / **arb** |

**Button verdict:** Everything is achievable in Tailwind via **theme extensions**; nothing requires scoped CSS in `Button.vue`. Avoid long arbitrary `shadow-[…]` / `bg-[linear-gradient(…)]` in cva — put them in config once.

#### Page chrome (Tier 3 — defer; see **Token extraction tiers**)

| Demo rule | Value | Tailwind approach |
| --------- | ----- | ----------------- |
| Page background | `tokens.gradients.pageBackground` (4 radial layers) | **CSS** / layout pattern — defer |
| Grid overlay | `tokens.gradients.gridImage` + `gridMask` | **CSS** — `mask-image` not in default Tailwind |
| Card (`styles.card` + `.fx-card`) | `max-w-[32rem]`, `rounded-[1.35rem]`, `tokens.shadows.card` | **extend** `shadow-card-elevated`, `borderRadius.card-lg` |
| Footer frosted glass | `bg-[rgba(255,255,255,0.38)] backdrop-blur-[14px]` | **arb** — between `backdrop-blur-md` and `lg` |
| Form fields (`styles.input`, `styles.label`) | `h-10`, `text-[0.8125rem]`, slate borders | Promote to Input/Label primitives (Phase 3) |
| Tradier tile | `tokens.gradients.brandTradier` | Third-party — not Epicstory brand |

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

- [ ] Extract demo brand values into `--brand-*` HSL vars in `main.css` (light; dark TBD) — see **Tier 1** table
- [ ] Extend `tailwind.config.ts`: `colors.brand`, `backgroundImage` (`brand-gradient*`), `boxShadow` (`btn-brand*`, `btn-outline*`, `card-elevated`)
- [ ] Implement `variant="brand"` and refreshed `outline` in `buttonVariants` (cva) — **Tailwind classes only**, no scoped CSS in `Button.vue`
- [ ] Storybook: `Design System/Button` — Default, Brand, Outline (Cancel + Next pair matching demo), sizes, disabled
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
- Redesigning presentationals and dogfooding in app → [10 — Redesign rollout](./10-redesign-rollout.md)
- Figma / external design tool sync

---

## Done when

- [x] Light/dark theme toggle works in Storybook for all DS and hero stories
- [ ] Token source of truth documented; no new tokens added to `variables.scss`
- [ ] Demo Tier 1 semantic colors promoted to `main.css`; Tier 2 shadows/gradients in `tailwind.config.ts`
- [x] Token stories exist: Colors, Typography, Spacing, Radius, Elevation, DeferredPatterns
- [ ] Tier A primitives storied: Button (with `brand` + demo-aligned `outline`), Input, Label, Badge, Dialog, Menu, Tooltip, Form (minimum)
- [ ] Legacy button API removed; 5 call sites migrated to `variant="brand"`
- [ ] `Design System/Button` Cancel + Next pair matches `ConnectIntegrationDemo`
- [ ] Hero slices (`Product/Hero/*`) reviewed in both themes after at least one token change
- [ ] Task 08 “Design system primitives storied with token-aware variants” can be checked off

**Follow-up:** [10 — Redesign rollout](./10-redesign-rollout.md)

---

## References

- Parent: [08 — UI redesign foundation](./08-ui-redesign-foundation.md)
- Next: [10 — Redesign rollout](./10-redesign-rollout.md)
- Architecture: `.cursor/rules/frontend-atomic-architecture.mdc`
- Hero slices: `app/src/presentationals/stories/hero/README.md`
- Tokens today: `app/src/design-system/styles/main.css`, `app/tailwind.config.ts`, `app/component-colors.ts`
- Legacy SCSS: `app/src/design-system/styles/variables.scss` (audit in this file — **Legacy SCSS audit** section)
- **Redesign reference UI:** `app/src/views/demo/ConnectIntegrationDemo.vue` — `tokens` object (gradients/shadows), `styles` + `cn()` (layout), `.fx-*` scoped classes
- Legacy button usages: `SignupForm`, `SigninForm`, `SelectWorkspace`, `MemberInvite`, `MessagesTab`
- Storybook preview: `app/.storybook/preview.ts`, `app/.storybook/preview.css`


