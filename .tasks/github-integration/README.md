# GitHub integration — task index

Goal: workspaces integrate GitHub via a **GitHub App only** — **no standalone OAuth App**. Admins complete **installation** (per-workspace linkage); members complete **user-to-server** authorization on that same app so branches and PRs run **as their GitHub user**. Link repositories; create branches and PRs from Epicstory.

**Start here:** **`01-discussion-and-decisions.md`** — task **01** exit criteria satisfied for §8 (issue detail MVP); optional **07** for chat/palette later.

| Order | Task | Depends on |
|-------|------|------------|
| 1 | [Discussion & decisions](./01-discussion-and-decisions.md) | — |
| 2 | [GitHub App registration & security](./02-github-app-and-security.md) | 1 |
| 3 | [Backend: installation & user tokens](./03-backend-github-auth-and-tokens.md) | 2 |
| 4 | [Frontend: GitHub integration page](./04-frontend-integration-page.md) | 3 (partial; can mock API) |
| 5 | [Repository connection](./05-repository-connection.md) | 3, 4 |
| 6 | [Branches & pull requests](./06-branches-and-pull-requests.md) | 5 |
| 7 | [Future: chat, command palette, status→branch](./07-future-chat-commands-and-status-branch.md) | 1–6 (optional follow-up) |

Cross-cutting: **GitHub rate limits** — caching, backoff, cache invalidation, token refresh (task **01 §5.2**, task **03**). Analytics / formal QA matrices / dedicated observability are **deferred** (task **01 §6**).
