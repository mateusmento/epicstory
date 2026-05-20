# 01 — Discussion & decisions

**Status:** core integration decisions **signed**; analytics / formal QA matrices / observability **deferred** (see §6).

**Locked:** **GitHub App only** — Epicstory does **not** register or maintain a legacy **OAuth App**; member identity uses **user-to-server** tokens for **the same GitHub App**.

**Objective:** capture conversations and **data** so integration model, permissions, and UX are deliberate—not guessed.

---

## Outcomes (checklist)

- [x] Written **problem statement** — RBAC and linkage decided (§1).
- [x] **User journeys** sketched with edge cases (§2).
- [x] **Integration model** — **GitHub App only** + user-to-server (§3).
- [x] **Token storage model** — secret hosting + encryption for persisted tokens agreed (§4).
- [x] **Minimum GitHub permissions** for MVP (§5) + **user attribution** model (§3–5).
- [x] **Repo scope** — personal + org repos (§5.1).
- [x] **Rate limits & resilience** — caching, backoff, invalidation, refresh (§5.2).

---

## 1. Problem statement

Epicstory workspaces need a **trusted link to GitHub** so members can work against **repositories**: **create branches** and **open pull requests** **as themselves on GitHub** (not only as a bot), subject to each user’s GitHub permissions on that repo. **Repos are linked to a project** for day-to-day work; the **workspace** holds the GitHub installation and the pool of **registered** orgs/repos.

### Signed product decisions

| Topic | Decision |
|-------|-----------|
| **Who may connect / install** | **Workspace admins only** complete the **GitHub App installation** and maintain which **orgs/repos are registered** for the workspace (available pool). |
| **Workspace vs project (repos)** | **Workspace:** registers the GitHub installation and **orgs/repos** available to that workspace (catalogue). **Project:** **repositories are linked to the project**; an issue’s branch/PR targets **project-linked** repo(s) (subset of the workspace pool). |
| **Branch / PR actor** | Actions run **on behalf of the Epicstory user** who triggers them: that user must have authorized Epicstory (GitHub App **user-to-server** flow or equivalent) and must have **GitHub-side permission** to push/create branches and open PRs on the connected repo. |
| **Secrets & tokens** | **Secret hosting** for app credentials; **encryption at rest** for any **persisted** user tokens (and follow task 02/03 for KMS/envelope details). |
| **GitHub integration type** | **GitHub App only** — no separate **OAuth App** registration; user authorization is part of the GitHub App configuration. |
| **Repository scope** | Support **both** **personal** (user-owned) and **organization** repositories that the installation and member token can access. |
| **GitHub API resilience** | Design for **rate limits**: **caching** for safe reads, exponential **backoff** (+ jitter) on **429** / `Retry-After`, explicit **cache invalidation** when installs/repos/permissions change, and correct **token refresh** (installation token re-mint; user token refresh or re-auth per GitHub). |

**Implication:** The **installation** and **workspace catalogue** define *which repos exist in scope*; **project ↔ repo links** define *which repo(s)* apply to issues in that project; **per-user** authorization defines *who* on GitHub performs branch/PR operations.

---

## 2. User journeys (MVP)

### Happy path

1. **Admin** opens **Integrations → GitHub**, installs/configures the **GitHub App** and **registers orgs/repos** available to the **workspace** (catalogue).
2. **Admin** (or role TBD) **links repos to the Epicstory project** (subset of the workspace catalogue) that will be used for branch/PR work for issues in that project.
3. **Member** who will create branches/PRs completes **“Connect my GitHub”** / user authorization once (user-to-server), if not already done.
4. From **issue detail** (see §8), member **creates a branch** → **opens a PR** with defaults per §7.1 (chat/thread and command palette → task **07**).

### Edge cases (must design for)

| Scenario | Expected behavior (*draft*) |
|----------|----------------------------|
| Project has **no repos linked** | Cannot create branch/PR from issues in that project; surface **link a repo in project settings** (or equivalent). |
| Member has not completed user GitHub auth | Branch/PR actions disabled or prompt **Connect GitHub** (user flow). |
| User denies GitHub consent | Clear error; no partial token stored. |
| Org enforces **SSO** on GitHub | Follow GitHub SSO; surface “complete SSO on GitHub”. |
| Installation removed on GitHub | **Reconnect required** (admin); members see degraded state. |
| User-to-server token revoked / expired | User reconnect flow; distinguish **401** vs **403**. |
| User lacks **write** on repo (GitHub ACL) | Operation fails with GitHub error; explain “no permission on this repo”. |
| Branch already exists | Idempotency or explicit error + suggested suffix (*TBD*). |
| Protected branch / rulesets block branch or PR | Surface GitHub message; no silent failure. |
| **Several open PRs** for same **Epicstory issue + GitHub repo** (§7.4) | **Allowed** — no duplicate-create block; UX still lists PRs cleanly; **`pull_request`** webhooks refresh stored state (**open**/ **closed**/ **merged**). |
| GitHub **rate limit** (**429** / abuse) | Respect **`Retry-After`** when present; backoff and retry; surface friendly “try again” copy if user-visible. |

---

## 3. Integration model (locked): GitHub App only

Epicstory registers **one GitHub App** on GitHub. There is **no** separate legacy **OAuth App**.

**How auth works**

| Mechanism | Who | Purpose |
|-----------|-----|---------|
| **Installation** | Workspace admin | Grants the app access to selected repos/orgs for this workspace. |
| **User-to-server** (“OAuth-style” redirect on the **same** GitHub App) | Member | Lets Epicstory call GitHub **as that user** for branch/PR (subject to their repo ACL). |

**Facts**

- Branch/PR **as the user** uses **user tokens** issued via the GitHub App’s **user authorization** flow — still **GitHub App only**, not a second product registration.

✅ **Product:** **GitHub App only** + **per-user authorization** so branches/PRs are **on behalf of connected users** with normal GitHub permissions.

---

## 4. Token storage model

| Asset | Handling |
|-------|-----------|
| GitHub App **private key** (or client secret per GitHub’s model) | **Secret hosting** (env/secrets manager); rotation runbook in task 02. |
| **Installation access token** | Short-lived; cache only; refresh via JWT — **not** long-lived DB storage. |
| **User-to-server** access (and refresh if issued) | **Encrypted at rest** in DB; revoke on user disconnect; audit connect/disconnect. |

**Resolved:** secret hosting + encryption for persisted user tokens — **security sign-off** still needed on concrete KMS/envelope choice in implementation tasks.

---

## 5. Minimum GitHub permissions for MVP

### GitHub App — **installation** (repository permissions)

Needed so the app can operate against linked repos (exact GitHub checkbox names may vary):

| Permission | Why |
|------------|-----|
| **Contents** | Read/write for refs/branches as appropriate to your API usage. |
| **Pull requests** | Read/write to open/update PRs. |
| **Metadata** | Read — repo discovery. |

### GitHub App — **user** (user-to-server scopes)

Must allow the **authorized user** to perform branch + PR creation **as themselves**. Align **user-to-server** scopes/permissions with GitHub’s docs for your chosen endpoints (narrow where GitHub allows).

**Rule:** If Epicstory shows “Create branch” for a user, that user’s GitHub identity must authorize scopes sufficient for **their** actions on **that** repo.

**Out of MVP unless needed:** Actions, workflow dispatch, admin hooks.

---

## 5.1 Repository scope: personal and organizations (signed)

MVP **must support** linking and using repositories that are:

- **Personal** — owned by a GitHub user (`owner` is a user login), and  
- **Organization** — owned by an org (`owner` is an org login).

Installation and discovery flows may differ (org policies, **SSO**, fewer seats); UX should remain clear for **both** repo owner types. APIs already expose owner/name; persist owner type if useful for diagnostics.

---

## 5.2 GitHub API: rate limits, caching, and token refresh (engineering — signed)

Epicstory **must** assume GitHub **primary** and **secondary** rate limits and design accordingly.

| Concern | Requirement |
|---------|-------------|
| **Backoff** | On **429** (and transient **5xx** where safe), retry with exponential backoff + jitter; honor **`Retry-After`** header when GitHub sends it. |
| **Caching** | Cache **read-heavy**, safe responses (e.g. repo metadata, default branch, paginated repo lists) behind explicit **TTL**s; prefer installation-token reads where they reduce duplicate calls. |
| **Invalidation** | Invalidate or shorten TTL when: installation changes, repo linked/unlinked, admin reconnects, rename/transfer detected, or responses indicate **permission/context** may have changed (e.g. persistent **404**/permission mismatch). |
| **Refresh** | See **§5.2.1** — combined **expiry check + cache drop + re-mint**, **single 401 retry** for installation tokens; **user-to-server refresh tokens** required where GitHub provides them, plus controlled fallback to re-authorization. |

### 5.2.1 Token refresh strategy (combined — signed)

**Installation access token**

- Treat cached tokens as **invalid** when missing or when `now >= expires_at − skew` (`GITHUB_INSTALLATION_TOKEN_REFRESH_SKEW_SEC`): **drop from cache**, **re-mint** via JWT → installation access token endpoint, then proceed with the API call.
- **401 fault tolerance:** if GitHub still returns **401** on an installation-scoped request, **invalidate** the cached token, **re-mint once**, and **retry that same HTTP request exactly once** when `GITHUB_INSTALLATION_TOKEN_RETRY_REQUEST_ON_401` is enabled — **no further retries** on that chain (prevents loops); then surface install revoked / permission errors.

**User-to-server token**

- Configure the GitHub App / OAuth settings so the authorization flow yields **refresh tokens** where GitHub supports it; **persist refresh token encrypted** alongside access token metadata.
- **Before expiry:** within `GITHUB_USER_TOKEN_REFRESH_SKEW_SEC`, use the **refresh_token grant** to rotate access tokens (`GITHUB_USER_SERVER_REFRESH_TOKEN_ENABLED`).
- **401 path:** attempt **one** refresh-token rotation (if enabled and refresh token present), **retry the request once**; if still unauthorized, route the member through **re-authorization**.

Implementation defaults for TTLs, backoff, Redis namespace, invalidation switches, and these refresh flags: **`api/src/core/app.config.ts`** (`GITHUB_*` env vars).

---

## 6. Deferred scope — analytics, formal QA, observability

**Not required for the initial GitHub integration delivery** (revisit when needed):

- **Product analytics / KPI funnels** (dashboards, funnel drop-off, time-to-first-PR reporting).
- **Formal QA matrices** (curated SSO-org lists, written capacity baselines)—developers **manually exercise** personal + org flows while building.
- **Dedicated observability** (structured ops logs per GitHub step, Prometheus-style counters, throttle dashboards). Normal Nest/logger usage is enough unless you decide otherwise later.

---

## 7. Branch / PR defaults, fork scope, compliance

### 7.1 Branch name & PR title/body (signed)

| Topic | Decision |
|-------|-----------|
| **Branch name** | **Auto-generate** from **issue id** + **issue title** (e.g. slugified title); field stays **editable** before submit. |
| **PR title / body** | Sensible **defaults** from the issue (title + link/body template); fields **editable**. |
| **PR draft vs ready** | User is **prompted** to choose **Draft** or **Ready for review** when opening the PR; **default — Ready for review**. |
| **Conventional commits** | **Not required** for this MVP: Epicstory creates a **branch ref** and **pull request**, not **commits** authored through the product—there is no Epicstory-generated commit message to constrain. Revisit only if you later add in-app commits or squash-merge messaging. |

Validate branch names against GitHub ref rules (length, characters).

### 7.2 Fork workflow — what it means

On GitHub there are two common ways to open a PR:

| Workflow | What happens |
|----------|----------------|
| **Same-repository** | New branch lives **in the linked repo** (e.g. `acme/app` → branch `123-fix-login` from `main`). PR is **within that repo**. Requires **write** access to the repo. |
| **Fork workflow** | Contributor has **no push access** to `acme/app`, so they use a **fork** (`their-user/app` or org fork), push the branch **there**, then open a PR **from fork → upstream**. |

**MVP decision:** **same-repo branches only**—no first-class “pick fork / push to fork” flow. Users who only have fork access must work from GitHub directly until you add fork support.

### 7.3 Legal / audit / retention (concerns checklist — not legal advice)

Epicstory will store **GitHub identifiers** (user id, login), **encrypted tokens**, and **timestamps** (connect/disconnect). Typical concerns to resolve with **privacy policy**, **internal policy**, and **counsel** where needed:

| Area | Why it matters |
|------|----------------|
| **Transparency** | Users should know **what** is stored (identifiers, tokens), **why** (integrate with GitHub **as them**), and **who** processors are (GitHub + your infra). |
| **Retention & deletion** | How long after **disconnect** or **account deletion** you keep GitHub-related rows/logs; whether refresh tokens are wiped immediately on revoke. |
| **Lawful basis / consent** | Align OAuth/GitHub authorization UX with your jurisdiction’s rules (e.g. GDPR lawful basis if EU users). |
| **Security & breach** | Encrypted tokens reduce risk; still need **incident** thinking if DB encryption keys or logs leaked. |
| **Audit trail** | Product/security may want **immutable-ish** records: *who* initiated install, *who* linked a repo, token revocation events—not full analytics, but enough for abuse investigations. |
| **Enterprise customers** | DPAs, subprocessors list, data residency—often stricter than default SaaS terms. |

Record concrete retention periods and log policies when you implement persistence—**§6 deferred** does not remove compliance work for **stored credentials**.

---

### 7.4 Issue ↔ pull requests — many PRs per repo; Epicstory auto-comments

| Rule | Meaning |
|------|---------|
| **Cardinality** | A single Epicstory **issue** may have **many GitHub PRs** over time for the **same** project-linked **repo**, and likewise **distinct PRs across multiple** repos when the project links more than one repository. Multiple **simultaneously open** PRs for **`(Epicstory issue, GitHub repo)`** are allowed (e.g. stacked work, reopened attempts, parallel experiments). |
| **Traceability — auto comments (MVP)** | **On PR create from Epicstory:** required **system comment** on the **Epicstory issue timeline** (**URL**, **repo**, **title**, **draft**/open snapshot). Persist **issue ↔ PR** rows and show an **aggregate linked-PR panel** on the issue (task **06**). Echoing **merge**/**close** into the timeline is **optional** — may be **silent DB + UI** only (*TBD* in **task 06**); avoid orphaned PRs that never appear anywhere. Optionally support **manual link** / backfill for PRs opened outside Epicstory (*TBD*). |
| **No duplicate-create block** | Do **not** reject “Create branch / PR” merely because another **open** PR already exists for the same issue and repo (**§8.4**). Still handle **branch name clashes** separately (rename / suffix (*TBD*)). |
| **Webhook sync** | **`pull_request`** webhooks (**`opened`**, **`closed`**, **`edited`**, *TBD*) update stored linkage rows (`state`, **`merged`**, timestamps) so the issue view and timeline stay accurate. Not used to enforce **“only one open PR”**.

**Detection:** Prefer **GitHub App webhooks** on `pull_request`, plus optional reconcile job. Matches **invalidate cache** stance in **§5.2**.

---

## 8. Branch / PR entry point — MVP scope (in depth)

Use this as the concrete scope stub for the exit criterion (“document branch/PR entry point”).

### 8.1 Surfaces (signed for MVP + deferred roadmap)

| Surface | MVP | Notes |
|---------|-----|--------|
| **Issue detail** (toolbar or overflow) | **Yes — primary** | Branch defaults from issue id + title (§7.1); issue inherits **project** repo context. |
| Backlog / issue row quick action | Optional | Same backend as issue detail; thinner UI. |
| **Channel / thread** | **Deferred** (task **07**) | Chat-driven; needs thread ↔ issue + in-chat command palette. |
| **Command palette** (chat) | **Deferred** (task **07**) | e.g. “create PR for issue”; palette also grows **create issue** and other commands. |

### 8.1.1 Deferred (task 07 — summary)

- **Chat** entry points; **in-chat command palette**; **Todo → In progress** branch dialog when **no branch** — see **`07-future-chat-commands-and-status-branch.md`**.

### 8.2 Preconditions (enforcement)

- **Workspace:** **GitHub App install** complete + orgs/repos **registered** to the workspace (catalogue).
- **Project:** **≥1 repo linked to the project** that contains the issue (subset of workspace catalogue).
- **Repo selection for this issue:** choose among **project-linked** repos—**default** to project **primary** repo if configured, else picker (*TBD*).
- **Cardinality (§7.4):** **multiple PRs per issue × repo are allowed**; **auto comments** tie each PR back to the Epicstory issue (**§8.3**).
- Acting user has completed **user-to-server** authorization.
- Backend **preflight** optional: permission check on selected repo.

### 8.3 User flow (happy path)

1. User opens entry surface → **Create branch & PR** (or two-step wizard).
2. Fields: **base branch** (default `default_branch`), **new branch name** (**default:** issue id + slugified issue title; **editable**), **PR title** / **PR body** (**defaults** from issue; **editable**).
3. **PR readiness:** explicit choice **Draft** vs **Ready for review** (**default Ready for review**), per §7.1.
4. **Validate** naming (length, refs); show GitHub-style errors inline.
5. Submit → create ref (branch) → create PR (with chosen draft state) → show **links** to branch + PR → **automatic Epicstory issue comment** (system) linking the PR (**§7.4** — required for MVP traceability).

### 8.4 Failure & edge UX

- Map common GitHub errors to copy (403 no access, 422 validation, rate limit).
- **409** branch exists → offer suffix or open existing PR if detectable (*TBD*).
- **Concurrent PRs:** not an error — show **linked PR list** grouped by repo; optional **heads-up** if branch name duplicates an existing Epicstory-created branch on that repo (*TBD*).

### 8.5 MVP behavior summary (issue detail)

> For MVP, members create branches and open PRs **from issue detail**, with **auto-generated branch name and PR defaults** (editable per §7.1), a **Draft / Ready for review** choice (**default Ready**), **many PRs allowed per issue—including multiple for the same linked repo**. Each creation posts an **automatic system comment on the Epicstory issue** with the PR link (§7.4). PR lifecycle stays in sync via **`pull_request`** webhooks. Scoped to **project-linked repos** and **GitHub permissions of the acting user**. **Chat, command palette, and status-driven branch prompts** are **deferred** to task **`07-future-chat-commands-and-status-branch.md`**.

### 8.6 Decision guide — elaborate the problems (so you can choose)

Use this when filling **§8.1**, **§8.2**, **§8.4**, task **06**, and the **§8.5** summary.

#### A. Where should “Create branch & PR” live? (§8.1)

**Decided:** **Issue detail** is the **MVP primary** surface. **Channel/thread** and **in-chat command palette** (e.g. create PR for issue) are **deferred**—see **§8.1.1** and **`07-future-chat-commands-and-status-branch.md`**. The palette will later **also create issues** and other actions beyond GitHub.

**Historical options (for backlog / later surfaces):**

| Option | What you’re optimizing for | Tradeoffs |
|--------|------------------------------|-----------|
| **Issue detail** (recommended) | **Context**: issue id/title maps directly to branch defaults; user is already “in” the work item. | Extra click if someone lives in backlog-only; you must design toolbar/overflow density. |
| **Backlog / issue row** | **Speed** for triagers who don’t open the full issue. | Less space for preview; often becomes a **modal** that duplicates issue detail fields; still need issue id for defaults. |
| **Channel / thread** | **Chat-driven** teams linking discussion to code. | Only makes sense if there’s a **reliable** thread ↔ issue (or issue created from thread). Otherwise ambiguous “which issue/repo?” |
| **Command palette / global** | **Power users**, keyboard-first. | **Discoverability** is poor for first-time users; still need to resolve **which issue** and **which repo**. |

**Questions to answer:** ~~Where do users **already** spend time~~ — **Issue detail first**; chat/palette later per **07**.

---

#### B. Which GitHub repo applies to this issue? (§8.2)

**Decided shape:** **Repos are registered at the workspace**; **repos are linked to the project**. An issue’s branch/PR uses **project-linked** repo(s).

**The problem (within that shape):** A **project** may link **one or many** repos. The issue might need an explicit **default** when multiples exist.

| Option | When it fits |
|--------|----------------|
| **Exactly one repo linked to the project** | **Always default**; no picker on the issue. |
| **Multiple repos on the project** | **Picker** on create branch/PR, and/or set a **primary** project repo; optionally **remember last** choice per user for that project. |
| **Issue-level override** (later) | Rare; custom field “target repo”—defer if not needed for MVP. |

**Questions to answer:** Will MVP projects usually have **one** repo link? If many, do you define a **primary repo** on the project settings screen?

---

#### C. Branch name already exists on GitHub (§8.4 / edge cases)

**The problem:** The same generated name might already exist (re-opened issue, retry, parallel teammates). GitHub will reject or behave unexpectedly if you blindly create `refs/heads/x` again.

| Option | Behavior | Tradeoffs |
|--------|----------|-----------|
| **Hard error** | Show message: “Branch exists—rename”; user edits field. | Simplest implementation; slightly annoying on retries. |
| **Auto suffix** | Append `-2`, `-3`, or short hash until unique. | Smooth retries; risk of **orphan** branch names if user doesn’t notice. |
| **Idempotent “use existing”** | If ref exists and points to expected base → continue to PR step only if no PR yet; else link existing PR. | **Hardest** to implement correctly; fewer duplicate branches. |

**Questions to answer:** Is **duplicate name** rare (then **error** is fine) or common (then **suffix** or smarter behavior)?

---

#### D. After the PR exists — echo back to Epicstory? (§8.3)

**The problem:** Without a visible link on the Epicstory issue, people **lose** the trail between planning and GitHub.

**Decided (§7.4 / MVP):** **Automatic system comments** on the **Epicstory issue** when a PR is created from the flow (**URL**, repo, title, snapshot state); **combined with** persisted **issue ↔ PR** rows and an **aggregate issue UI** listing linked PRs (task **06**). Creating **many PRs** increases timeline volume — acceptable for MVP; optional later: **suppress duplicate boilerplate**, a **rollup** panel, or **fewer lifecycle comments**.

**Historical options:**

| Option | Behavior |
|--------|----------|
| **Links only in success toast / screen** | Minimal work; weak traceability. |
| **Auto comment** on Epicstory **issue** | **Chosen** for MVP. |
| **Store relation in DB only** (no comment) | Not sufficient alone — thread loses discoverability. |

**Remainder (*TBD* in task 06):** whether **merged** / **closed** events also post **additional** comments vs **only** update stored state + structured UI.

---

#### E. Draft PR vs “ready for review” — **decided** (§7.1)

When opening the PR, the user **chooses** **Draft** or **Ready for review**. **Default: Ready for review.** API maps to GitHub’s draft flag on PR create.

---

#### F. Legal / retention / audit — what you still decide in practice (§7.3)

**The problem:** Engineering choices (§7.3 checklist) need **numbers and owners**, not just awareness.

| Decision | Example options |
|----------|-----------------|
| **How long** after **user disconnect** do you keep GitHub `login`/ids in DB? | Immediate anonymize vs **30/90 days** vs until account deletion. |
| **Tokens** | **Delete** refresh/access token material on disconnect (expected); clarify **logs** must not store tokens. |
| **Audit events** | Minimum: `connected_at`, `disconnected_at`, `installation_id` changes—**who** admin-wise if multi-admin later. |

**Questions to answer:** Do you have **EU** users (affects GDPR articulation)? Any **enterprise** pilot with a **DPA**?

---

## Decision log

| Date | Decision | Rationale | Owner |
|------|-----------|-----------|-------|
| 2026-05-16 | Prefer **GitHub App** (installation) as primary integration model | Fine-grained installs; workspace-wide repo linkage | Engineering |
| 2026-05-16 | Branch/PR **as the user** via **user-to-server** (same GitHub App), not bot-only | Product wants GitHub attribution and user ACL | Product + Engineering |
| 2026-05-16 | **Admin-only** GitHub **installation** + **workspace repo/org catalogue**; **project** links repos for branch/PR | Governance: pool at workspace, usage per project | Product |
| 2026-05-16 | **Secret hosting** + **encryption at rest** for persisted user tokens | Security baseline | Product / Security |
| 2026-05-19 | **GitHub App only** — no standalone OAuth App | Single registration model; user auth remains user-to-server on that app | Product + Engineering |
| 2026-05-19 | **Personal + org repos** supported in MVP | Broad applicability | Product + Engineering |
| 2026-05-19 | **Rate limits:** caching, backoff, invalidation, installation/user token **refresh** | Reliable integration under GitHub limits | Engineering |
| 2026-05-19 | **Token refresh:** installation = expiry check + cache drop + re-mint + **single 401 retry**; user = **refresh_token** + skew refresh + one retry then re-auth | Fault tolerance without retry storms | Engineering |
| 2026-05-19 | **Defer** product analytics, formal QA matrices, dedicated observability for GitHub MVP | Ship integration first; add instrumentation later | Product + Engineering |
| 2026-05-19 | Branch name **auto:** issue id + title slug, **editable**; PR defaults **editable**; **no** conventional-commit requirement; fork workflow **out** of MVP | Clear defaults (§7.1) | Product + Engineering |
| 2026-05-19 | **Workspace** holds GitHub installation + **registered orgs/repos**; **project** **links repos** used for branch/PR (subset of workspace catalogue) | Matches product model; issues inherit project repo context | Product + Engineering |
| 2026-05-19 | **PR create:** ask **Draft** vs **Ready for review**; **default Ready** | User control; GitHub draft API | Product + Engineering |
| 2026-05-19 | **Issue ↔ PR:** **multiple PRs allowed** per **`(Epicstory issue, GitHub repo)`** and across repos; **no** duplicate-open block; **`pull_request`** webhooks keep linkage fresh | Stacked workflows, retries, parallel workstreams | Product + Engineering |
| 2026-05-19 | **PR traceability:** **auto system comments** on Epicstory issues when PRs are created from flow + persisted rows + linked-PR UI (§7.4, §8.6 D) | Auditable timeline without relying on toast-only links | Product + Engineering |

---

## Exit criteria (sign-off)

Before starting **task 02** in earnest:

- [x] Product agrees: **GitHub App only** + **user-to-server** for user-attributed branch/PR (no legacy OAuth App).
- [x] Product agrees: **admin-only** install + **workspace catalogue**; **project** **repo links** for branch/PR.
- [x] Security agrees in principle: **secret hosting** + **encrypted** persisted user tokens (detail in tasks 02–03).
- [x] **§8** — primary **surface** (issue detail) + **§8.5** summary filled; deferrals captured in **07**.

When all boxes are checked, mark task **01 complete** in the README table and proceed to **02**.
