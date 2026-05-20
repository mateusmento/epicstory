# 07 — Future: chat surfaces, command palette, status → branch (deferred)

**Prerequisites:** GitHub integration MVP (tasks **01–06**) delivers branch/PR from **issue detail** first.

**Objective:** Chat-driven and keyboard-driven entry points, plus “start work” ergonomics when an issue moves to **In progress**.

## Scope (not in MVP core GitHub tasks)

- **Channel / thread:** entry to **create branch / PR** for a linked **issue** once thread ↔ issue association is reliable (same backend as issue detail).
- **In-chat command palette:** commands such as **create PR for issue** (resolve issue from context). **Extend palette** to **create issues** from chat and other actions—product-wide.
- **Status transition UX:** when moving an issue **Todo → In progress**, if there is **no linked GitHub branch** yet, optionally **prompt** (dialog): create branch (and optionally open PR) using the same defaults as issue detail (`01` §7.1).

## Tasks (draft)

- [ ] Design thread/message ↔ issue linkage rules (when command runs from chat).
- [ ] Command palette infra in chat (register commands, arguments, permissions).
- [ ] `create PR for issue` (or equivalent) wired to existing GitHub branch/PR APIs.
- [ ] `create issue` from chat (may ship before/after GitHub chat commands; shared palette).
- [ ] Issue status workflow hook: **todo → in progress** → conditional dialog if **no branch** stored → reuse branch/PR flow or dismiss.
- [ ] Persist “issue has linked branch/PR” metadata if not already modeled (for dialog condition).

## Dependencies

- Task **06** stable APIs for branch + PR creation.
- Issue model: status transitions; optional stored branch name / PR URL.
