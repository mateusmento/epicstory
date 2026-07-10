# Current session

**Updated:** 2026-07-10

## Session question (60–90 min)

> **Can someone open a project search dialog and find an issue by key, title, or description text without leaving the project shell?**

## Done when

- [x] Project header search opens an issue search dialog (⌘J).
- [x] Debounced fulltext search hits title, issue key, and description.
- [x] Selecting a result navigates to the issue detail route.
- [x] Backend `FindIssues` search is no longer title-only (and no artificial delay).
- [x] Postgres `search_vector` + GIN index with `ts_rank` ordering.
- [x] Infinite scroll / load-more in the search dialog.
- [x] Cross-project / workspace-wide issue search (All + multi-project toggles).

## Active task

Ad-hoc: project issue search dialog (from Project.vue placeholder Command).

## Explicitly deferred (this session)

- (none)
