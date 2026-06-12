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

**Note:** `Dashboard.vue` has no view-level story — use **AppShell** for workspace chrome redesign.

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
- `IssueGithubSidebarSection` → IssueGithubPanel
- `Meeting.vue` → MeetingRoom
