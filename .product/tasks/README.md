# Product task backlog

Ordered by **impact on developer workflow** and **readiness** (backend vs greenfield). Status reflects repo snapshot as of 2026-05-28.

| ID | Task | Status | Notes |
|----|------|--------|--------|
| [01](./01-issue-key-surfacing.md) | Issue key surfacing (UI) | **In progress** | Session focus; completes GitHub integration task 08 phase D |
| [02](./02-project-timeline.md) | Project timeline view | Not started | Placeholder UI today |
| [03](./03-github-oauth-tests.md) | GitHub OAuth `state` tests | Not started | Task `.tasks/github-integration/03` |
| [04](./04-github-pr-lifecycle-comments.md) | PR merged/closed timeline comments | Deferred | Optional MVP; DB sync exists |
| [05](./05-github-chat-commands.md) | Chat / command palette + GitHub | Deferred | See `.tasks/github-integration/07` |
| [06](./06-github-manual-smoke.md) | GitHub integration manual smoke | Ongoing | Document checklist per env |
| [07](./07-user-avatar-stack-adoption.md) | `UserAvatarStack` adoption (stacked avatars) | Not started | EPV1-98; 6 locations still hand-rolled |
| [08](./08-ui-redesign-foundation.md) | UI redesign foundation (Storybook + presentational layer) | **Complete** | Hero slices + green Storybook catalog shipped |
| [09](./09-design-tokens-ds-primitives.md) | Design tokens & DS primitives | **In progress** | Phase 0 done; token audit + primitive stories next |
| [10](./10-redesign-rollout.md) | Redesign rollout (presentationals + app dogfood) | Not started | Surface-by-surface redesign; depends on 09 |

**GitHub integration spec:** [`.tasks/github-integration/`](../.tasks/github-integration/README.md)
