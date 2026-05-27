# 08 — Issue keys & GitHub branch linking (Jira-style)

**Prerequisites:** Tasks 03–06 (installation, catalogue, branch/PR APIs).

**Goal:** Correlate GitHub work to Epicstory issues via **issue keys** in **branch names** and **commit messages**, not only Epicstory-created branches. One issue may link to **many branches** across **many repos**.

---

## Product model

| Concept | Rule |
|---------|------|
| **Issue key** | `{PROJECT_PREFIX}-{NUMBER}` e.g. `EPIC-42`. Prefix unique per **workspace**; number monotonic per **project**. |
| **Prefix** | Jira-like **acronym** from project name (first letter of each word); optional **custom key** on create; auto-disambiguate (`EPIC` → `EPIC2`) when not custom. |
| **Detection** | Case-insensitive token match in **branch ref** and each **commit message** on `push` webhooks. |
| **Branch links** | Rows in `integration.issue_github_branches` — unique `(issue_id, owner, repo_name, branch_name)`. |
| **PR links** | Existing `issue_github_pull_requests`; correlate `head_ref` / messages via **issue key** (fallback: legacy `{issueId}-` prefix during transition). |
| **`issue.github_branch` jsonb** | **UI preference** (“active” repo/branch for create-PR wizard), not the source of truth for all linked branches. |

## GitHub App

- Subscribe to **`push`** (in addition to existing events).
- Handler: resolve installation → workspace → parse keys → upsert branch links → optional activity (*TBD*).

## Branch / PR creation (Epicstory)

- Default new branch name: **`{issueKey}-{slug}`** (not numeric `issueId`).
- Suggested commit message copy in UI/docs: include `EPIC-42` in commits so pushes link even if branch name does not.

## API / UI (follow-ups)

- [ ] Expose `issueKey` on `IIssue` everywhere issues are listed.
- [ ] Issue sidebar: **linked branches** list (from `issue_github_branches`) + PR list.
- [ ] Copy issue key control.
- [ ] Remove reliance on single `githubBranch` for “all branches” display.

## Implementation phases

- [x] **A** — Schema + allocation: `issue_key_prefix`, `next_issue_number`, `issue.issue_number`, `issue.issue_key`, backfill.
- [x] **B** — `issue_github_branches` + `push` webhook ingest + key parser lib.
- [x] **C** — Branch create default + PR webhook correlation use issue keys.
- [ ] **D** — Frontend sidebar + backlog key column.
- [ ] **E** — Development panel activity on link (*TBD*).
- [ ] **F** — Manual “unlink branch” (*TBD*).

## Acceptance

- Creating issues yields stable keys; two projects in one workspace never share a prefix.
- Push to `feature/EPIC-42-login` links branch to issue `EPIC-42` without using Epicstory “create branch”.
- Push with message `EPIC-42 fix` links branch even if branch name has no key.
- Same issue can have links in `org/a` and `org/b` with different branch names.
- Epicstory “create branch” still works; default name uses issue key.
