# 08 — UI redesign foundation (Storybook + presentational layer)

**Status:** In progress (foundation laid; prerequisites remain)
**Session question:** Can we explore and ship a new Epicstory visual language in Storybook first—without breaking production wiring?

## Verdict (2026-06)

The presentational/container refactor + Storybook rollout was **the right foundation for redesign**, but it gets us to **“safe to redesign in the open”**, not **“redesign is ready to ship.”**

| Question                                                 | Answer                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| Was the refactor worth it for redesign?                  | **Yes**                                                          |
| Can we start exploring new UI in Storybook now?          | **Yes** — especially storied presentational domains              |
| Can we run a full product redesign from Storybook alone? | **Not yet** — strengthen design system + hero compositions first |

---

## What’s in place (good for redesign)

### 1. Work happens at the right layer

- **Design system** — domain-agnostic atoms/molecules
- **Presentationals** — props + events + slots; visual vocabulary (`UserAvatar`, `IssueKey`, `Chatbox` shell)
- **Containers** — wire domain/API to presentationals
- **Views** — route glue

Redesign should mostly touch `presentationals/` + `design-system/` without rewiring business logic on every visual tweak.

### 2. Storybook is a real catalog

Stories should mirror **how containers/views wire** components (props, events, slots)—not bare `args` with empty slots.

**Precedents in repo:**

- `presentationals/app-pane/channel/stories/ChannelMembers.stories.tsx` — nested `#add-member` slot
- `presentationals/channel/stories/Chatbox.stories.tsx` — `#timeline` / `#composer`, local state for quote/edit/send
- `presentationals/app-pane/channel/stories/ChannelDetailsPane.stories.tsx` — shell with filled `#members`

### 3. Shared story infra

| Piece                                   | Location                                      | Role                                              |
| --------------------------------------- | --------------------------------------------- | ------------------------------------------------- |
| Fixtures                                | `presentationals/stories/fixtures/`           | Mock data in view-model shape                     |
| `StoryContainer` / `withStoryContainer` | `presentationals/stories/story-container.tsx` | Canvas grid frame; compact frame on Docs          |
| `DropdownMenuPanel`                     | `presentationals/stories/harness/`            | Menu panel fragments (`MenuInput`, `MenuItem`, …) |
| Global providers                        | `.storybook/preview.ts`                       | `TooltipProvider`, `ConfirmDialogProvider`        |
| Docs scroll fix                         | `.storybook/preview.css`                      | Overrides app `html, body { overflow: hidden }`   |

**Sidebar convention:** `Presentational/<Domain>/<Component>`

**Story folder convention:** `presentationals/<domain>/stories/*.stories.tsx` (not colocated with `.vue`)

### 4. Tiered coverage (intentional)

- **Tier A:** exported presentational components → dedicated story
- **Tier B:** internal children (e.g. `Signal1Bar`, rich-text segments) → variants on parent story only
- Menu **panel fragments** need `Menu` + `MenuContent` wrapper (`DropdownMenuPanel` or parent shell)

---

## Gaps before a confident redesign

### 1. Design system is the real lever — still thin

~6 DS stories vs ~175 DS `.vue` files. Redesign usually starts: **tokens → primitives → presentational organisms**.

**Next:** Storybook coverage for `Button`, `Input`, spacing, typography, `Menu`, `Dialog`, etc.

### 2. Storybook must be “green”

Before a big visual pass:

- [ ] Every Tier A presentational story renders without context/provider errors
- [ ] Docs pages scroll through all story variants (fixed `preview.css`; verify per component with many stories)
- [ ] Optional: run `app/scripts/scan-storybook-context.mjs` against a running Storybook

### 3. Composition stories matter as much as leaf stories

Redesign is about **shells**, not only atoms. **7 hero slices** live under `app/src/presentationals/stories/hero/` with title `Product/Hero/<SliceName>`.

| Hero slice           | Story                          | Variants                                            | Status |
| -------------------- | ------------------------------ | --------------------------------------------------- | ------ |
| **IssueHeader**      | `IssueHeader.stories.tsx`      | Default, Dense, Empty, Overflow, Interactive        | [x]    |
| **PlanningCard**     | `PlanningCard.stories.tsx`     | Default, Dense, Overdue, Done                       | [x]    |
| **InboxTriage**      | `InboxTriage.stories.tsx`      | Default, Dense, Interactive                         | [x]    |
| **ChatColumn**       | `ChatColumn.stories.tsx`       | Default, Empty, Busy, QuoteEdit, Interactive        | [x]    |
| **AppShell**         | `AppShell.stories.tsx`         | Default, AppPaneOnly, DetailsDrawerOpen, BothClosed | [x]    |
| **IssueGithubPanel** | `IssueGithubPanel.stories.tsx` | Default, Empty, Loading, Interactive                | [x]    |
| **MeetingRoom**      | `MeetingRoom.stories.tsx`      | Default, Dense, SpeakerMode, Interactive            | [x]    |

Fixtures: `hero.fixtures.ts` + slice README at `presentationals/stories/hero/README.md`.

**Deferred:** ComposerDock (optional 8th slice); full `IssueView` / activity feed; schedule views; DS primitives track.

### 4. Fixtures → design scenarios

Evolve fixtures beyond happy-path mocks. Name scenarios for redesign stress tests:

- empty, loading, error
- dense (many labels, long titles)
- long text / overflow
- many participants / avatars

---

## Recommended order for redesign

1. **Design tokens + DS primitives** in Storybook (spacing, type, color, core components).
2. **Hero slices** — 5–8 stories mirroring real product surfaces (table above).
3. **Redesign presentationals** against hero slices (not only isolated leaves).
4. **Roll through containers/views** with minimal prop/API churn.

---

## Explicitly defer (redesign prep)

- Full container/view Storybook catalog (`Application/Containers/`, `Application/Views/`) — separate track
- Storying every internal leaf (Tier B) as its own file
- Redesign driven only from leaf stories without composition checks

---

## Done when (this task)

- [ ] Design system primitives storied with token-aware variants
- [x] 7 hero slice stories documented and rendering (`Product/Hero/*`)
- [ ] Presentational story catalog renders without provider/context errors
- [x] Fixture scenarios cover empty / dense / overflow (`hero.fixtures.ts` + per-slice variants)
- [ ] First redesigned surface dogfooded in app via unchanged container contracts

## References

- Plan: presentational Storybook audit (tiered rollout, wiring fidelity)
- Architecture: `.cursor/rules/frontend-atomic-architecture.mdc`
- Wiring notes: `app/src/presentationals/stories/WIRING.md`
