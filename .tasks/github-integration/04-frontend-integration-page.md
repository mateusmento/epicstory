# 04 — Frontend: GitHub integration page

**Prerequisites:** Task 03 API contract stable enough to mock; routing/workspace settings pattern known.

## Tasks

- [ ] Add **Integrations → GitHub** (or workspace settings) route and empty state.
- [ ] **Admin:** control to start **GitHub App installation** (redirect to GitHub install/setup).
- [ ] **Member:** **Connect my GitHub** opens the GitHub App **user authorization** URL (same tab or popup—decide with UX).
- [ ] **Connected** state: show GitHub username, connected date, disconnect with confirm dialog (admin vs member scopes as designed).
- [ ] Error handling: denied consent, callback error query params, “reconnect required” banner when token invalid.
- [ ] Loading and accessibility (focus management after redirect return).

## Acceptance criteria

- E2E or critical-path manual test checklist documented in PR.
- Matches existing design system (buttons, alerts, layout).

## Dependencies

- Task 03 status/connect endpoints.
