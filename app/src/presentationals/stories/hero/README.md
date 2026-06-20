# Hero slices (UI redesign)

Canonical Storybook compositions under `Product/Hero/*`. Each slice mirrors a real product surface using **presentationals + fixtures only** (no containers/domain).

| Slice | Product pillar | Story file |
|-------|----------------|------------|
| **IssueHeader** | Issues — key, status, labels, assignees | `IssueHeader.stories.tsx` |
| **PlanningCard** | Issues — board/backlog density | `PlanningCard.stories.tsx` |
| **InboxTriage** | Communication — notification list | `InboxTriage.stories.tsx` |
| **ChatColumn** | Communication — timeline + composer | `ChatColumn.stories.tsx` |
| **AppShell** | Workspace chrome — panes + drawer | `AppShell.stories.tsx` |
| **IssueGithubPanel** | Git — PRs + branch workflow | `IssueGithubPanel.stories.tsx` |
| **MeetingRoom** | Communication — live meeting | `MeetingRoom.stories.tsx` |
| **AuthSignup** | Onboarding — sign-up page | `AuthSignup.stories.tsx` |
| **AuthSignin** | Onboarding — sign-in page | `AuthSignin.stories.tsx` |
| **ConnectIntegration** | Redesign reference — wizard card + Tier 3 chrome | `ConnectIntegration.stories.tsx` |

**Note:** `Dashboard.vue` has no view-level story — use **AppShell** for workspace chrome redesign.

## Token regression checklist (task 09)

After any token or DS primitive change:

- [ ] Theme: light + dark for each slice below (ConnectIntegration: light reference + layout check in dark)
- [ ] AuthSignup / AuthSignin — primary elevated CTA (`variant="primary" elevation="elevated"`), form fields
- [ ] ConnectIntegration — Tier 3 page chrome + Tier 1/2 Cancel/Next vs `Design System/Button` DemoActionPair (`outline` + `elevated` / `primary` + `elevated`)
- [ ] IssueHeader — badges, menus, overflow title
- [ ] Remaining slices — no provider errors; contrast acceptable in dark

### Phase 4 review (2026-06-10)

Validated via `pnpm run build-storybook` after Phase 3 (Button brand/outline, Input/Label, Tier 1 tokens). Storybook theme toolbar toggles `dark` on `document.documentElement`.

| Slice | Light OK | Dark OK | Notes |
| ----- | -------- | ------- | ----- |
| AuthSignup | Yes | Yes | Brand CTA renders; marketing aside still legacy SCSS `highlight-box` — defer to task 10 |
| AuthSignin | Yes | Yes | Same as AuthSignup; auth links use `text-blue-600` not `text-link` — defer to task 10 |
| ConnectIntegration | Yes | Partial | Tier 3 chrome is light-only by design; dark toggle does not break layout |
| IssueHeader | Yes | Yes | Semantic tokens; menus/tooltips use preview providers |
| PlanningCard | Yes | Yes | Card density variants OK |
| InboxTriage | Yes | Yes | Muted foreground on notification rows OK in dark |
| ChatColumn | Yes | Yes | Composer + timeline variants build |
| AppShell | Yes | Yes | Pane chrome uses `--background` / `--card` |
| IssueGithubPanel | Yes | Yes | Secondary actions use default/outline variants |
| MeetingRoom | Yes | Yes | Live meeting controls build |

### Deferred fixes (task 10, not Phase 4)

| Issue | Fix location |
| ----- | ------------ |
| Auth marketing aside gradient not token-driven | `AuthMarketingAside.vue` + Tier 3 auth shell pattern |
| Auth form links hardcoded `text-blue-600` | `SignupForm.vue`, `SigninForm.vue` → `text-link` |
| Auth shell not yet ConnectIntegration density | `AuthPageShell.vue` presentationals redesign |
| ConnectIntegration dark palette | Re-derive Tier 3 values when auth/wizard shell ships |

### Issue triage (token vs presentationals)

| Symptom | Likely fix location |
| ------- | ------------------- |
| Blue CTA looks flat/wrong | Button cva / `tailwind.config.ts` shadow extensions |
| Text too low contrast in dark | `main.css` `.dark` semantic tokens |
| Form fields wrong height/border | Input primitive defaults |
| Layout overflow | Presentationals (task 10) unless DS size change caused it |
| Missing context error | Storybook preview providers |

**Rule:** Fix at DS/token layer when possible; presentationals changes defer to [10 — Redesign rollout](../../../.product/tasks/10-redesign-rollout.md).

## Scenario variants

Every slice includes at least:

- **Default** — happy path
- **Dense** / **Busy** / **Empty** — where applicable
- **Interactive** — local state updates on user action

Shared fixture helpers: [`hero.fixtures.ts`](./hero.fixtures.ts)

## Wiring rules

See [`../WIRING.md`](../WIRING.md). Reference containers for contracts only:

- `IssueView.vue` → IssueHeader
- `IssueCard` / board → PlanningCard
- `Chatbox.vue` (container) → ChatColumn
- `Dashboard.vue` / `AppLayout` → AppShell (no `Dashboard.stories.ts`)
- `SignupView` / `SigninView` → AuthSignup / AuthSignin
- `ConnectIntegrationDemo.vue` → ConnectIntegration
- `IssueGithubSidebarSection` → IssueGithubPanel
- `Meeting.vue` → MeetingRoom
