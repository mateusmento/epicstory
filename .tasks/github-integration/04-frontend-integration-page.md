# 04 — Frontend: GitHub integration page

**Prerequisites:** Task 03 API contract stable enough to mock; routing/workspace settings pattern known.

## Tasks

- [x] Add **Integrations → GitHub** (or workspace settings) route and empty state.
- [x] **Admin:** control to start **GitHub App installation** (redirect to GitHub install/setup).
- [x] **Member:** **Connect my GitHub** opens the GitHub App **user authorization** URL (same tab or popup—decide with UX).
- [x] **Connected** state: show GitHub username, connected date, disconnect with confirm dialog (admin vs member scopes as designed).
- [x] **OAuth callback:** read **`github_oauth_error`** / **`github_oauth_success`** from route query on **Integrations → GitHub**, show **error** inline alert / **success** toast, **`router.replace`** to strip params (**`GithubIntegration.vue`**).
- [x] **OAuth denied:** **`access_denied`** from GitHub → user-friendly banner text (**`GithubUserOAuthFlowService`** redirect query).
- [x] **Reconnect / staleness:** API **`githubErrorCode`** wired through axios errors (**`githubApiParseError`**); integrations page warns when **`missing_on_github`**; issue sidebar **Reconnect** banner for **`GITHUB_MEMBER_REAUTHORIZE_REQUIRED`**, **token expired**, **decrypt** failures.
- [x] **Issue sidebar deferred linking:** Branch/PR controls always visible; **Create branch / Open PR** run prerequisite flows on confirm (workspace install → member OAuth → project repo link on Integrations) then **auto-resume** the action via **`sessionStorage`** pending state.
- [x] **Layout:** three cards — **Workspace installation**, **Your GitHub account**, **Repositories** — with state badges and one primary CTA by next step; Refresh as ghost icon in install header.
- [x] **Operator docs:** Setup URL / user callback / env vars behind **Setup for operators** collapsible (open by default when app not configured; admins only when configured).
- [x] **Destructive actions:** Remove installation / Unlink use **`useConfirmDialog`** (not `window.confirm`).
- [x] **Repositories:** private/public badges, count (`N of total`), empty/loading states, load-more with spinner.
- [x] **Accessibility:** focus moves to page heading after OAuth return; catalogue section receives focus when load fails.

## Acceptance criteria

- [ ] E2E or critical-path manual test checklist documented in PR (see **Manual smoke** below).
- [x] Matches existing design system and Linear settings visual language (cards, badges, shadows, action hierarchy).

### Visual / UX criteria

- Member can answer in &lt;5s: workspace installed? account linked? repos available?
- Primary CTA by state: Install (admin, no install) → Link account (installed, not linked) → none when both ready (success microcopy + repos).
- Durable inline alerts only for OAuth errors and install health (`missing_on_github`, suspended, verify error); OAuth success is a toast.
- Callback / Setup URL copy does not lead the page.

### Manual smoke (critical path)

1. **Admin:** Install GitHub App → return to integrations → install card shows account + **Installed**; toast on success.
2. **Member:** Link GitHub account → success toast → account card shows login + **Linked**.
3. **Catalogue:** Repositories card lists repos with private/public badges; load more when paginated.
4. **Issue:** Select repo from catalogue → create branch → open PR → PR listed in sidebar + timeline comment.
5. **Denied OAuth:** cancel GitHub consent → error alert with clear copy (not a toast).
6. **Disconnect member:** Unlink → confirm dialog → issue sidebar prompts to link again.
7. **Operators:** With app configured, **Setup for operators** is collapsed; with app not configured, it opens by default.

## Dependencies

- Task 03 status/connect endpoints.
