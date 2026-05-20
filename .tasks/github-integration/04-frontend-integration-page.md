# 04 — Frontend: GitHub integration page

**Prerequisites:** Task 03 API contract stable enough to mock; routing/workspace settings pattern known.

## Tasks

- [x] Add **Integrations → GitHub** (or workspace settings) route and empty state.
- [x] **Admin:** control to start **GitHub App installation** (redirect to GitHub install/setup).
- [x] **Member:** **Connect my GitHub** opens the GitHub App **user authorization** URL (same tab or popup—decide with UX).
- [x] **Connected** state: show GitHub username, connected date, disconnect with confirm dialog (admin vs member scopes as designed).
- [x] **OAuth callback:** read **`github_oauth_error`** / **`github_oauth_success`** from route query on **Integrations → GitHub**, show success/error banner, **`router.replace`** to strip params (**`GithubIntegration.vue`**).
- [ ] Denied consent / reconnect: distinguish **GitHub refusal** vs **expired-token** failures in copy; dedicated **“reconnect required”** banner when APIs signal invalid user token (**backend error contract + UI** — still shallow for generic 401 from branch/PR).
- [ ] Loading and accessibility (**focus management** after redirect return).

## Acceptance criteria

- E2E or critical-path manual test checklist documented in PR.
- Matches existing design system (buttons, alerts, layout).

## Dependencies

- Task 03 status/connect endpoints.
