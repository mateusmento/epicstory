# 04 — Frontend: GitHub integration page

**Prerequisites:** Task 03 API contract stable enough to mock; routing/workspace settings pattern known.

## Tasks

- [x] Add **Integrations → GitHub** (or workspace settings) route and empty state.
- [x] **Admin:** control to start **GitHub App installation** (redirect to GitHub install/setup).
- [x] **Member:** **Connect my GitHub** opens the GitHub App **user authorization** URL (same tab or popup—decide with UX).
- [x] **Connected** state: show GitHub username, connected date, disconnect with confirm dialog (admin vs member scopes as designed).
- [x] **OAuth callback:** read **`github_oauth_error`** / **`github_oauth_success`** from route query on **Integrations → GitHub**, show success/error banner, **`router.replace`** to strip params (**`GithubIntegration.vue`**).
- [x] **OAuth denied:** **`access_denied`** from GitHub → user-friendly banner text (**`GithubUserOAuthFlowService`** redirect query).
- [x] **Reconnect / staleness:** API **`githubErrorCode`** wired through axios errors (**`githubApiParseError`**); integrations page warns when **`missing_on_github`**; issue sidebar **Reconnect** banner for **`GITHUB_MEMBER_REAUTHORIZE_REQUIRED`**, **token expired**, **decrypt** failures.
- [x] **Issue sidebar deferred linking:** Branch/PR controls always visible; **Create branch / Open PR** run prerequisite flows on confirm (workspace install → member OAuth → project repo link on Integrations) then **auto-resume** the action via **`sessionStorage`** pending state.
- [x] **Layout:** status block stacked above action buttons (no side-by-side flex crush).
- [x] **Accessibility:** focus moves to page heading after OAuth return; catalogue section receives focus when load fails.

## Acceptance criteria

- [ ] E2E or critical-path manual test checklist documented in PR (see **Manual smoke** below).
- [x] Matches existing design system (buttons, alerts, layout).

### Manual smoke (critical path)

1. **Admin:** Install GitHub App → return to integrations → workspace install + account shown.
2. **Member:** Link GitHub account → success banner → status shows login.
3. **Catalogue:** Load repositories on workspace GitHub settings (read-only list).
4. **Issue:** Select repo from catalogue → create branch → open PR → PR listed in sidebar + timeline comment.
5. **Denied OAuth:** cancel GitHub consent → error banner with clear copy.
6. **Disconnect member:** Unlink account → issue sidebar prompts to link again.

## Dependencies

- Task 03 status/connect endpoints.
