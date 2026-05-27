# 05 — Repository connection

**Prerequisites:** Tasks 03–04 (authenticated GitHub token available to backend).

**Model (task 01, updated):**

- **Workspace:** GitHub App **installation** + **catalogue** of repos the installation can access (live GitHub + cache).
- **No project ↔ repo links:** all installation repos are available to every project in the workspace.
- **Issue:** members **select a repository** on the issue when creating branches or PRs (`issue.github_branch` + workflow APIs).

Repos may be under **personal** or **org** `owner` (task **01 §5.1**).

## Tasks

### Workspace (catalogue)

- [x] Persist installation; list repos from GitHub installation API (pagination, caching per **01 §5.2**). *(Catalogue pages cached in **`GithubCacheService`**; invalidated on admin install/disconnect and repo webhooks — task **03**.)*
- [x] UI: workspace GitHub settings — read-only catalogue of repos available via the installation (`GithubIntegration.vue`).

### Issue repo selection (replaces project links)

- [x] Branch/PR APIs validate repo via **`GithubWorkspaceRepoAccessService`** (installation catalogue), not `project_github_repos`.
- [x] UI: issue sidebar repo picker from workspace catalogue (`IssueSelectGithubRepoDialog`, `use-issue-github-sidebar`).
- [x] Removed **`integration.project_github_repos`**, link APIs, and project-repo UI.

## Acceptance criteria

- Cannot create branch/PR for a repo that is **not** on the workspace installation catalogue.
- Disconnecting workspace installation clears installation row and cache; no project link rows remain (table dropped).
- Manual smoke test: workspace catalogue visible on integration page; issue branch/PR with repo selected from catalogue (personal and org repo when available).

## Dependencies

- GitHub REST client with token from task 03.
