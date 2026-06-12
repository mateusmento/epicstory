# Current session

**Updated:** 2026-06-05

## Session question (60–90 min)

> **Can someone recognize this issue by its key and use that key on GitHub without guessing?**

## Done when

- [x] Backlog row and board card show `issue.issueKey` (not `EP-{id}` / `#id`).
- [x] Issue detail header shows the key with **copy to clipboard**.
- [x] GitHub sidebar hints reference `{issueKey}-…` (not numeric `issue.id`).
- [x] Sub-issues and filters use the key where the parent/child is labeled.
- [x] Activity feed `parent_changed` entries use issue keys (never `#id`).
- [ ] Manual check: copy key → create or push branch `KEY-slug` → linked branch appears (local stack).
- [x] Notifications show `issueKey` (with `#id` fallback for older payloads).

## Active task

→ [tasks/01-issue-key-surfacing.md](./tasks/01-issue-key-surfacing.md)

## Explicitly deferred (this session)

- Project timeline page ([tasks/02-project-timeline.md](./tasks/02-project-timeline.md))
- Notification payloads with `issueKey` ([tasks/01-issue-key-surfacing.md](./tasks/01-issue-key-surfacing.md) — follow-up)
- GitHub OAuth tests, PR lifecycle comments, chat commands ([tasks index](./tasks/README.md))
- UI redesign prep roadmap ([tasks/08-ui-redesign-foundation.md](./tasks/08-ui-redesign-foundation.md))
