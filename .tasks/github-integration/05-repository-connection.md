# 05 — Repository connection

**Prerequisites:** Tasks 03–04 (authenticated GitHub token available to backend).

**Model (task 01):**

- **Workspace:** GitHub App **installation** + **catalogue** of **orgs and repos** registered for that workspace (what GitHub allows and admins have enabled).
- **Project:** **repositories are linked to the project** (subset of the workspace catalogue). **Issues** in that project use **project-linked** repos for branch/PR.

Repos may be under **personal** or **org** `owner` (task **01 §5.1**).

## Tasks

### Workspace (catalogue)

- [x] Persist installation + **workspace-visible** repos/orgs from GitHub (pagination, caching per **01 §5.2**). *(Catalogue pages cached in **`GithubCacheService`**; invalidated on admin install/disconnect and repo webhooks — task **03**.)*
- [x] UI: workspace GitHub settings — **register / manage** which repos orgs appear in the workspace catalogue (exact UX TBD). *(GitHub integration page loads catalogue + links repos to projects.)*

### Project ↔ repo links

- [x] Persist **`project_id` ↔ `repo`** links (owner, name, optional `default_branch`, GitHub repo id); enforce **only repos from workspace catalogue** (`integration.project_github_repos`, validated via installation repo fetch on link).
- [x] Optional **primary / default repo** per project for issue branch/PR default (`is_primary` + **`POST …/repos/:linkId/primary`**); first linked repo becomes primary automatically; removing the primary promotes the next link by id.
- [x] UI: **workspace GitHub** integration page — **add/remove** linked repos; **default** badge + **Set as default** when multiple links (dedicated per-project settings tab not required for MVP).
- [x] API for issue flows: list **project-linked** repos; create branch/PR validates the repo is linked to the issue’s project (`GithubIssueGitWorkflowService`).

## Acceptance criteria

- Cannot attach a repo to a project if it is **not** in the workspace catalogue.
- Removing a repo from the **workspace** catalogue triggers **invalidation** (cache) and surfaces **broken** project links if any.
- Removing a repo from a **project** does not remove workspace installation or user tokens.
- Manual smoke test: **workspace catalogue** + **project link** for at least one **personal** and one **org** repo when available.

## Dependencies

- GitHub REST or GraphQL client with token from task 03.
