# 05 — Repository connection

**Prerequisites:** Tasks 03–04 (authenticated GitHub token available to backend).

**Model (task 01):**

- **Workspace:** GitHub App **installation** + **catalogue** of **orgs and repos** registered for that workspace (what GitHub allows and admins have enabled).
- **Project:** **repositories are linked to the project** (subset of the workspace catalogue). **Issues** in that project use **project-linked** repos for branch/PR.

Repos may be under **personal** or **org** `owner` (task **01 §5.1**).

## Tasks

### Workspace (catalogue)

- [ ] Persist installation + **workspace-visible** repos/orgs from GitHub (pagination, caching per **01 §5.2**).
- [ ] UI: workspace GitHub settings — **register / manage** which repos orgs appear in the workspace catalogue (exact UX TBD).

### Project ↔ repo links

- [ ] Persist **`project_id` ↔ `repo`** links (owner, name, optional `default_branch`, GitHub repo id); enforce **only repos from workspace catalogue**.
- [ ] UI: **project** settings — **add/remove** linked repos; optional **primary repo** for branch/PR default when multiple.
- [ ] API for issue flows: list **project-linked** repos for the issue’s project; validate before create branch/PR.

## Acceptance criteria

- Cannot attach a repo to a project if it is **not** in the workspace catalogue.
- Removing a repo from the **workspace** catalogue triggers **invalidation** (cache) and surfaces **broken** project links if any.
- Removing a repo from a **project** does not remove workspace installation or user tokens.
- Manual smoke test: **workspace catalogue** + **project link** for at least one **personal** and one **org** repo when available.

## Dependencies

- GitHub REST or GraphQL client with token from task 03.
