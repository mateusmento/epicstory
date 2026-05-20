# 03 — Backend: GitHub App installation & user tokens

**Prerequisites:** Task **02** (GitHub App registered, secrets documented).

**Locked:** **GitHub App only** (no standalone OAuth App).

**Scope:** Two token paths on that app—**(A)** **installation** access tokens after admin install; **(B)** **user-to-server** authorization (GitHub’s OAuth-style redirect → callback → access token) for branch/PR **as the member**.

## Tasks

- [x] **Admin install flow:** resolve installation id after GitHub redirect; persist workspace ↔ installation ↔ linked repos (per product model).
- [ ] Mint **installation access tokens** (JWT app auth → GitHub API); cache short-lived tokens only (prefer **Redis** when `GITHUB_CACHE_USE_REDIS` / `REDIS_URL`) with TTL aligned to GitHub expiry. **Before each use:** if expired/missing (see `GITHUB_INSTALLATION_TOKEN_REFRESH_SKEW_SEC`), invalidate cache + **re-mint**. **401:** at most **one** re-mint + retry per logical request when `GITHUB_INSTALLATION_TOKEN_RETRY_REQUEST_ON_401`. *(JWT → installation token mint is implemented; **Redis-backed installation token cache + skew discipline as specified** is not wired yet.)*
- [x] **User flow:** build GitHub App **user authorization URL** using settings that allow **refresh tokens** where GitHub supports them (`GITHUB_USER_SERVER_REFRESH_TOKEN_ENABLED`); **callback** exchanges code for **user-to-server** access + **refresh** tokens; store both encrypted when GitHub returns them. *(Proactive refresh using `GITHUB_USER_TOKEN_REFRESH_SKEW_SEC` and **401 → refresh-once → retry-once** before forcing re-authorization may still be incomplete vs this bullet.)*
- [x] Persist per Epicstory user: GitHub user id, login, **encrypted** tokens, scopes granted, timestamps.
- [x] **Disconnect:** revoke/delete tokens per user and/or remove installation linkage per workspace rules; **purge related caches** (installation + repo lists). *(Disconnect endpoints implemented; **Redis cache purge hooks** may still be partial—see Redis bullet.)*
- [ ] **Validation:** detect revoked installs/tokens; surface “reconnect” to admin vs member appropriately.
- [ ] **GitHub HTTP client:** use `GITHUB_HTTP_*` from `AppConfig` — timeouts, **429** + **`Retry-After`**, exponential backoff + jitter, max concurrency per workspace; structured errors for 401/403/429. *(Member **user-token** branch/PR REST helpers use **429 / Retry-After** retries and typed HTTP errors; **full AppConfig-driven matrix + installation-token paths** are not unified yet.)*
- [ ] **Read caching (Redis):** cache safe GET-derived data under `GITHUB_CACHE_KEY_PREFIX` + TTLs (`GITHUB_CACHE_*_TTL_SEC`). **Invalidate** matching keys when:
  - **Synchronous:** admin changes installation / linked repos in Epicstory (gate with `GITHUB_CACHE_INVALIDATE_ON_ADMIN_ACTIONS`), and
  - **Webhooks:** handle `installation_repositories` and `repository` events (gate with `GITHUB_CACHE_INVALIDATE_ON_REPO_WEBHOOKS`).
  Task **01 §5.2** remains the behavioral source of truth.
- [x] **`pull_request` webhook:** verify signature/installation; normalize payload → upsert linkage / refresh PR state (`state`, **`merged`**, timestamps) per **task 06** and **01 §7.4** (many PRs per issue×repo — **no** “single open PR” invariant). Handler **thin**; idempotent deliveries via **`github_pull_request_id`** + **`X-GitHub-Delivery`** (or equivalent).

## Configuration (`AppConfig`)

Defaults and env var names live in **`api/src/core/app.config.ts`** (`GITHUB_*`). Tune TTLs, backoff, concurrency, token refresh skew, and invalidation gates without code changes.

### Environment variables (reference)

| Variable | Role |
|----------|------|
| `GITHUB_CACHE_USE_REDIS` | Use Redis for GitHub read caches |
| `GITHUB_CACHE_INVALIDATE_ON_ADMIN_ACTIONS` | Invalidate on admin mutations in Epicstory |
| `GITHUB_CACHE_INVALIDATE_ON_REPO_WEBHOOKS` | Invalidate on `installation_repositories` + `repository` webhooks |
| `GITHUB_CACHE_KEY_PREFIX` | Redis key namespace prefix |
| `GITHUB_CACHE_REPO_METADATA_TTL_SEC` | Repo metadata TTL |
| `GITHUB_CACHE_REPO_LIST_TTL_SEC` | Installation repo list TTL |
| `GITHUB_CACHE_DEFAULT_BRANCH_TTL_SEC` | Default branch TTL |
| `GITHUB_HTTP_TIMEOUT_MS` | Outbound request timeout |
| `GITHUB_HTTP_RETRY_MAX_ATTEMPTS` | Max attempts (incl. first) for retryable responses |
| `GITHUB_HTTP_RETRY_INITIAL_DELAY_MS` | Backoff base delay |
| `GITHUB_HTTP_RETRY_MAX_DELAY_MS` | Backoff cap |
| `GITHUB_HTTP_RETRY_BACKOFF_MULTIPLIER` | Exponential multiplier |
| `GITHUB_HTTP_RETRY_JITTER` | Jitter fraction [0–1] |
| `GITHUB_INSTALLATION_TOKEN_REFRESH_SKEW_SEC` | Re-mint installation token before expiry |
| `GITHUB_INSTALLATION_TOKEN_RETRY_REQUEST_ON_401` | Single re-mint + retry chain on 401 |
| `GITHUB_USER_TOKEN_REFRESH_SKEW_SEC` | Proactive user access token refresh window |
| `GITHUB_USER_SERVER_REFRESH_TOKEN_ENABLED` | Require/use user-to-server refresh_token flow when GitHub provides it |
| `GITHUB_HTTP_MAX_CONCURRENT_REQUESTS_PER_WORKSPACE` | Per-workspace concurrency (0 = unlimited) |

## API sketch (adjust to your conventions)

- `GET /integrations/github/install/start` — admin begins install (redirect to GitHub).
- `GET /integrations/github/install/callback` — persist installation + linked repos.
- `GET /integrations/github/user/start` — member begins user authorization.
- `GET /integrations/github/user/callback` — exchange code; store encrypted user token.
- `DELETE /integrations/github/installation` — admin disconnect workspace integration.
- `DELETE /integrations/github/user` — member disconnects their GitHub user link.
- `GET /integrations/github/status` — workspace install OK? user linked? missing scopes?

## Acceptance criteria

- Tests for `state` validation and duplicate-callback edge cases.
- No plaintext tokens in logs or DB.
- Documented cache TTLs + invalidation triggers; backoff behavior covered in tests or integration harness where feasible.

## Dependencies

- Encryption / KMS from task **02**.
