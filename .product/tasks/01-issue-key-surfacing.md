# 01 — Issue key surfacing (UI)

**Status:** Nearly complete — manual GitHub smoke test remaining  
**Session question:** Can someone recognize this issue by its key and use that key on GitHub without guessing?  
**Spec alignment:** `.tasks/github-integration/08-issue-keys-and-git-branch-linking.md` phase **D**

## Problem

Backend allocates stable keys (`EPV1-93`) and webhooks link branches by key, but the UI still shows legacy `EP-{numericId}` and `#id`. Developers cannot trust what to put in branch names or commit messages.

## User stories

- As a **developer**, I see the same key on backlog, board, and issue detail.
- As a **developer**, I copy the key in one click for branch names, commits, and PR titles.
- As a **developer**, GitHub sidebar hints tell me to use `{issueKey}-slug`, not `issueId`.

## Scope (this task)

- [x] `BacklogItemRow.vue` — display `issue.issueKey`
- [x] `IssueCard.vue` — display key; parent breadcrumb uses key
- [x] `IssueView.vue` — header shows key + copy control
- [x] `SubIssueRow.vue` — display `sub.issueKey`
- [x] `FilterItem.vue` — parent filter label uses key when available
- [x] `IssueGithubSidebarSection.vue` — empty state / hints use `issue.issueKey`
- [x] `use-issue-github-sidebar.ts` — default PR title fallback uses key if helpful
- [x] Grep cleanup: `EP-` / `Issue #` patterns tied to numeric id in issue surfaces (inbox notifications deferred)
- [x] Reusable `IssueKey` presentational component (display + optional copy)

## Follow-up (separate slice)

- [x] Notifications: add `issueKey` to API payloads (`IssueAssigned`, `DueDate`, etc.) and UI
- [x] Issue picker shows key
- [x] GitHub branch name suggestion uses `issueKey` (not numeric id)
- [x] Activity feed entries reference key where relevant

## Decisions

| Decision | Rationale |
|----------|-----------|
| Keys are uppercase in DB/UI | Matches Jira/Git convention; parser is case-insensitive |
| Copy on issue detail first | Highest intent for Git workflow |

## Open questions

- Should board cards show key **before** or **after** title? → **Before** (Jira-like, scannable).
- Monospace for keys? → Yes, `font-mono tabular-nums`.

## Acceptance

- New issue shows allocated key in backlog without refresh bugs.
- Copy key → paste into branch create dialog default or external Git → push/webhook links branch.
- No user-facing `EP-{id}` except migration note in docs if any legacy data exists.

## Manual test

1. Open project backlog → keys visible.
2. Open issue → copy key → create branch from dialog with suggested name.
3. Push branch containing key → linked branches list updates.
