# 06 — Branches & pull requests

**Prerequisites:** Task 05 (at least one linked repo).

**Aligned with:** task **01 §7.4** — **multiple PRs** per **`(Epicstory issue, GitHub repo)`**; **automatic Epicstory issue comments** when PRs are created from flow; **`pull_request`** webhooks update stored linkage (`state`, **`merged`**).

## Tasks

- [ ] **Create branch**: API accepts `repo`, `base` (default branch or explicit), `branchName`; handle conflicts (branch exists); use shared GitHub client (**429** / backoff).
- [ ] **Open PR**: API accepts `title`, `body`, `head`, `base`, **`draft`** (boolean; UI default **false** = ready for review); map GitHub validation errors to user-visible messages; **429** surfaces retry-friendly messaging via shared GitHub client/backoff layer.
- [ ] **Persistence (issue ↔ PR):** store `issue_id`, `project_id`/repo identity, **`github_pull_request_id`** (stable), **`html_url`**, **`state`**, **`merged`**, timestamps; **many rows per `(issue_id, repo)`** (no uniqueness on “only one open”).
- [ ] **Auto comment on Epicstory issue (required MVP):** after successful PR create via flow, persist a **system / integration** timeline entry on the **Epicstory issue** (copy + markdown link to GitHub PR, repo slug, branch, optional **`draft`** flag). **Idempotency:** same logical create must not spam duplicate comments (**e.g.** idempotency key = `issue_id` + **`github_pull_request_id`** + event `pr_created`).
- [ ] **Webhook sync:** handle GitHub **`pull_request`** (`opened`, `closed`, `edited`, *TBD*) → upsert linkage rows; **`merged`** transitions update **`merged`** and **`closed_at`**; no “slot freeing” invariant — concurrency is purely a UX concern (**01 §8.4**). Idempotent per **`github_pull_request_id`** + delivery id (**`X-GitHub-Delivery`**).
- [ ] Optional: **lifecycle comments** (**merged** / **closed**) on Epicstory — **defer** vs “DB + structured panel only”; if added, reuse idempotency by PR id + transition.
- [ ] Optional **reconcile job:** poll or refresh PR state when webhooks delayed or missed (**01 §5.2**); bounded frequency + workspace-scoped.
- [ ] Wire **origin** in product (**01 §8:** issue detail MVP).
- [ ] **UI:** **linked PR(s)** aggregate on issue (**group/filter by repo**, show **open** vs **merged** vs **closed**); **never** treat “already has open PR” as blocking create (**01 §8.4**).

## Acceptance criteria

- Idempotency or clear behavior when duplicate **branch name** is submitted (`409` rename/suffix UX per **§8.4**, *TBD*).
- **`pull_request`** webhooks converge stored linkage to GitHub (**open**/**closed**/**merged**) without conflicting unique constraints on `(issue, repo)`.
- Every successful **Epicstory-driven** PR create yields **exactly one** Epicstory timeline comment (**idempotent retries** exempt from double-post).

## Dependencies

- Branch protection / permissions: document behavior when GitHub blocks branch creation.
- GitHub App **`pull_request`** webhook subscription (**task 02**) and ingestion route (**task 03**).
- Epicstory **issue comments / timeline** capability for **`system`** or **`integration`** author (reuse existing primitives if present).

## Open questions (from 01)

- ~~Fork workflow vs same-repo branches only?~~ **Same-repo only for MVP** (task **01 §7.2**).
- ~~Draft PRs vs ready for review default?~~ **User chooses Draft vs Ready; default Ready** (task **01 §7.1**, §**8.3**).
