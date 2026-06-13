# 10 — Redesign rollout (presentationals + app dogfood)

**Status:** Not started  
**Depends on:** [09 — Design tokens & DS primitives](./09-design-tokens-ds-primitives.md) (canonical tokens, storied primitives, hero-slice regression in both themes)  
**Session question:** Can we ship the new visual language on a real product surface by updating presentationals only—containers keep the same props/events contracts?

---

## Why this task (now)

Tasks 08 and 09 answer **where** and **what** to change:

| Task | Delivers |
| ---- | -------- |
| [08](./08-ui-redesign-foundation.md) | Presentational layer, Storybook catalog, 9 hero slices, green docs |
| [09](./09-design-tokens-ds-primitives.md) | Token canonicalization, DS primitive stories, `brand`/`outline` Button, light/dark preview |

This task is **when redesign leaves the sandbox**: update product vocabulary (`presentationals/`) against hero slices, then wire through unchanged container contracts into the running app.

Redesign should **not** require rewiring business logic on every visual tweak—that boundary was the point of the 08 refactor.

---

## Prerequisites (complete in task 09 first)

- [ ] Token source of truth locked (`main.css` + `tailwind.config.ts`; no new tokens in `variables.scss`)
- [ ] Tier A DS primitives storied with token-aware variants (Button, Input, Label minimum)
- [ ] Light/dark theme toggle works in Storybook for DS + hero stories
- [ ] Hero slices (`Product/Hero/*`) reviewed in both themes after at least one token/primitive change
- [ ] Legacy button API removed; call sites use `variant="brand"` / `outline`

---

## Rollout strategy

Work **surface-by-surface**, not file-by-file:

1. Pick one **hero slice** as the regression target for that surface (e.g. `AuthSignup` for auth forms).
2. Redesign the **presentationals** that compose the slice—consume DS primitives and semantic tokens only.
3. Validate in Storybook (hero slice + leaf presentational stories).
4. **Dogfood in app** via existing containers/views (no prop/API churn unless unavoidable).
5. Repeat for the next surface; hero slices stay the visual contract.

**Suggested first surfaces** (low container coupling, high visibility):

| Surface | Hero slice | Presentationals (starting points) |
| ------- | ---------- | --------------------------------- |
| Auth (signup/signin) | `Product/Hero/AuthSignup`, `AuthSignin` | `presentationals/auth/*` |
| Issue header | `Product/Hero/IssueHeader` | `presentationals/issue/*` |
| Inbox triage | `Product/Hero/InboxTriage` | `presentationals/inbox/*` |

Order is a product call; auth is a natural first dogfood target after Button/Input/Label land in 09.

---

## Fixtures → design scenarios

Evolve fixtures beyond happy-path mocks as each surface is redesigned. Name scenarios for stress tests:

- empty, loading, error
- dense (many labels, long titles)
- long text / overflow
- many participants / avatars

Extend `hero.fixtures.ts` and per-domain fixtures when a slice gains new variants—not as a one-time audit.

---

## Task items

### Phase 0 — Rollout plan (~1 session)

- [ ] Confirm **first surface** and its hero slice regression target
- [ ] List presentationals in scope for that surface (grep imports from container/view)
- [ ] Note container contracts that must stay stable (props, events, slot names)
- [ ] Optional: add `Product/Hero/ConnectIntegration` if auth/wizard is first (full demo composition from [`ConnectIntegrationDemo.vue`](app/src/views/demo/ConnectIntegrationDemo.vue))

### Phase 1 — Redesign presentationals against hero slice (~2–3 sessions per surface)

- [ ] Update presentationals to use DS primitives + semantic Tailwind utilities (no ad-hoc hex/scoped CSS where tokens exist)
- [ ] Refresh hero slice variants if layout/density changed (Default, Dense, Empty, Overflow as applicable)
- [ ] Add or extend fixture scenarios for the surface (empty / dense / overflow)
- [ ] Spot-check related **leaf** presentational stories under `Presentational/<Domain>/*`

### Phase 2 — App dogfood (~1 session per surface)

- [ ] Run app locally; exercise the surface through real routes (not Storybook-only)
- [ ] Confirm containers/views need **no** prop/event changes (or document minimal exceptions)
- [ ] Light + dark check if app theme toggle exists for that surface; otherwise light-only until dark ships globally
- [ ] Capture before/after or note in this file’s Decision log

### Phase 3 — Expand to next surfaces (~ongoing)

- [ ] Repeat Phases 1–2 for additional hero slices (planning card, chat column, app shell, …)
- [ ] Track progress in hero slice table (link from [08](./08-ui-redesign-foundation.md))
- [ ] Feed token/primitive gaps back to [09](./09-design-tokens-ds-primitives.md) if redesign exposes missing DS coverage

### Phase 4 — Container/view pass (minimal churn)

- [ ] Roll through containers/views only where presentationals cannot absorb the change (layout shell, provider wiring)
- [ ] Avoid container/view Storybook catalog (`Application/Containers/`, `Application/Views/`) unless a specific wiring bug blocks dogfood—that track stays deferred

---

## Tier 3 layout patterns (from task 09)

Demo page chrome that is **not** global `:root` tokens—promote when a surface needs it:

- Auth / wizard shell: soft radial background, grid overlay, frosted footer (see 09 **Token extraction tiers — Tier 3**)
- Tradier / third-party brand tiles — integration-specific, not Epicstory global

Implement as **layout presentationals** or route-level shells, not new global tokens, unless repeated across 3+ surfaces.

---

## Open questions

| Question | Options | Decision |
| -------- | ------- | -------- |
| First dogfood surface? | Auth / Issue header / Inbox | _TBD_ |
| Dark mode in app for first surface? | Ship light first / both | _TBD_ |
| SCSS `flex:*` migration during redesign? | Migrate touched files only / separate cleanup | _TBD_ — prefer migrate-on-touch in presentationals only |

---

## Explicitly defer

- Full container/view Storybook catalog — separate track
- Redesigning every presentational in one pass
- Migrating all SCSS `$` usages repo-wide (cleanup on touch or separate task)
- Figma / external design tool sync
- Global marketing page chrome on app shell (until auth/wizard pattern is proven)

---

## Done when

- [ ] **First redesigned surface** dogfooded in app via unchanged container contracts
- [ ] That surface’s hero slice matches app and passes light + dark regression in Storybook
- [ ] Fixture scenarios cover empty / dense / overflow for the first surface
- [ ] Rollout plan documented for at least one follow-up surface
- [ ] Task 08 “redesign ready to ship” verdict can move from “Not yet” toward “Yes” for the shipped surface(s)

---

## References

- Foundation: [08 — UI redesign foundation](./08-ui-redesign-foundation.md)
- Tokens + primitives: [09 — Design tokens & DS primitives](./09-design-tokens-ds-primitives.md)
- Hero slices: `app/src/presentationals/stories/hero/README.md`
- Wiring: `app/src/presentationals/stories/WIRING.md`
- Redesign reference UI: `app/src/views/demo/ConnectIntegrationDemo.vue`
- Architecture: `.cursor/rules/frontend-atomic-architecture.mdc`
